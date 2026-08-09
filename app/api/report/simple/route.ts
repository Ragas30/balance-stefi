import { NextResponse } from "next/server";
import { firestore, toDate, toNumber } from "@/lib/firebase-admin";
import { fetchJournalDetails } from "@/lib/report";
import { getErrorMessage } from "@/lib/utils";
import type { Query, DocumentData } from "firebase-admin/firestore";

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

    let start: Date | undefined;
    let end: Date | undefined;
    if (startDate) start = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    // --- 1. Query from CashTransaction (simple mode) ---
    let cashIncome = 0;
    let cashExpense = 0;
    const cashLines: LineItem[] = [];
    const cashBreakdownMap = new Map<string, BreakdownItem>();

    let query: Query<DocumentData, DocumentData> = firestore.collection("cashTransactions");
    if (start) query = query.where("date", ">=", start);
    if (end) query = query.where("date", "<=", end);

    const cashSnap = await query.get();
    for (const doc of cashSnap.docs) {
      const tx = doc.data();
      const amount = toNumber(tx.amount);
      const type = tx.type as "INCOME" | "EXPENSE";
      if (type === "INCOME") cashIncome += amount;
      if (type === "EXPENSE") cashExpense += amount;

      const key = `${type}::${tx.category}`;
      const current = cashBreakdownMap.get(key);
      if (!current) {
        cashBreakdownMap.set(key, {
          category: tx.category,
          type,
          total: amount,
        });
      } else {
        current.total += amount;
      }

      cashLines.push({
        id: doc.id,
        date: toDate(tx.date).toISOString(),
        description: tx.description,
        category: tx.category,
        type,
        amount,
        source: tx.source ?? "MANUAL",
        kasbonType: tx.kasbonType ?? null,
        kasbonRef: tx.kasbonRef ?? null,
      });
    }

    // --- 2. Query from Transaction/TransactionDetail (double-entry) ---
    let journalIncome = 0;
    let journalExpense = 0;
    const journalLines: LineItem[] = [];

    const details = await fetchJournalDetails({ start, end });

    for (const d of details) {
      const accType = d.account.type as string;
      const flowType = ACCOUNT_TYPE_MAP[accType];
      if (!flowType) continue;

      const amount = flowType === "INCOME" ? d.credit - d.debit : d.debit - d.credit;

      if (flowType === "INCOME") journalIncome += amount;
      else journalExpense += amount;

      journalLines.push({
        id: d.id,
        date: d.date.toISOString(),
        description: d.description,
        category: `${d.account.code} - ${d.account.name}`,
        type: flowType,
        amount,
        source: "JURNAL",
        kasbonType: null,
        kasbonRef: null,
      });
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
    return NextResponse.json({ error: getErrorMessage(error, "Gagal menghitung laporan simple.") }, { status: 500 });
  }
}
