import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/utils";

type ReportMode = "summary" | "detailed";

type BreakdownItem = {
  category: string;
  type: "INCOME" | "EXPENSE";
  total: number;
};

type LineItem = {
  id: string;
  date: string;
  description: string;
  category: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  source: string;
  kasbonType: string | null;
  kasbonRef: string | null;
};

const ACCOUNT_TYPE_MAP: Record<string, "INCOME" | "EXPENSE"> = {
  REVENUE: "INCOME",
  EXPENSE: "EXPENSE",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mode = (searchParams.get("mode") ?? "summary") as ReportMode;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // --- 1. Query from CashTransaction (simple mode) ---
    let cashIncome = 0;
    let cashExpense = 0;
    const cashLines: LineItem[] = [];
    const cashBreakdownMap = new Map<string, BreakdownItem>();

    try {
      const cashTx = await prisma.cashTransaction.findMany({
        where: hasDateFilter ? { date: dateFilter } : undefined,
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      });

      for (const tx of cashTx) {
        const amount = Number(tx.amount);
        if (tx.type === "INCOME") cashIncome += amount;
        if (tx.type === "EXPENSE") cashExpense += amount;

        const key = `${tx.type}::${tx.category}`;
        const current = cashBreakdownMap.get(key);
        if (!current) {
          cashBreakdownMap.set(key, {
            category: tx.category,
            type: tx.type,
            total: amount,
          });
        } else {
          current.total += amount;
        }

        cashLines.push({
          id: tx.id,
          date: tx.date.toISOString(),
          description: tx.description,
          category: tx.category,
          type: tx.type,
          amount,
          source: tx.source,
          kasbonType: tx.kasbonType,
          kasbonRef: tx.kasbonRef,
        });
      }
    } catch {
      // Table may not exist yet — skip
    }

    // --- 2. Query from Transaction/TransactionDetail (double-entry) ---
    let journalIncome = 0;
    let journalExpense = 0;
    const journalLines: LineItem[] = [];

    try {
      const details = await prisma.transactionDetail.findMany({
        where: {
          transaction: hasDateFilter ? { date: dateFilter } : undefined,
          account: {
            type: { in: ["REVENUE", "EXPENSE"] },
          },
        },
        include: {
          account: true,
          transaction: true,
        },
      });

      for (const d of details) {
        const debit = Number(d.debit);
        const credit = Number(d.credit);
        const accType = d.account.type as string;
        const flowType = ACCOUNT_TYPE_MAP[accType];
        if (!flowType) continue;

        const amount = flowType === "INCOME" ? credit - debit : debit - credit;

        if (flowType === "INCOME") journalIncome += amount;
        else journalExpense += amount;

        journalLines.push({
          id: d.id,
          date: d.transaction.date.toISOString(),
          description: d.transaction.description,
          category: `${d.account.code} - ${d.account.name}`,
          type: flowType,
          amount,
          source: "JURNAL",
          kasbonType: null,
          kasbonRef: null,
        });
      }
    } catch {
      // Table may not exist yet
    }

    // --- 3. Merge results ---
    const totalIncome = cashIncome + journalIncome;
    const totalExpense = cashExpense + journalExpense;

    // Merge breakdowns
    const mergedBreakdown = new Map(cashBreakdownMap);
    for (const d of journalLines) {
      const key = `${d.type}::${d.category}`;
      const current = mergedBreakdown.get(key);
      if (!current) {
        mergedBreakdown.set(key, {
          category: d.category,
          type: d.type,
          total: d.amount,
        });
      } else {
        current.total += d.amount;
      }
    }

    // Merge and sort lines
    const allLines = [...cashLines, ...journalLines].sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
    );

    return NextResponse.json({
      summary: {
        income: totalIncome,
        expense: totalExpense,
        laba: totalIncome - totalExpense,
      },
      breakdown: Array.from(mergedBreakdown.values()).sort((a, b) => b.total - a.total),
      mode,
      lines: mode === "detailed" ? allLines : [],
    });
  } catch (error: unknown) {
    console.error("API Error [Simple Report GET]:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2021"
    ) {
      return NextResponse.json({
        summary: { income: 0, expense: 0, laba: 0 },
        breakdown: [],
        mode: "summary",
        lines: [],
        warning: "Tabel belum tersedia. Jalankan migrasi Prisma.",
      });
    }
    return NextResponse.json({ error: getErrorMessage(error, "Gagal menghitung laporan simple.") }, { status: 500 });
  }
}
