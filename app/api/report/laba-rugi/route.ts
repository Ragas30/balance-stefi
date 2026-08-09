import { NextResponse } from "next/server";
import { calculateLabaRugi, fetchJournalDetails, type LabaRugiLine, type LabaRugiMode } from "@/lib/report";
import { getErrorMessage } from "@/lib/utils";

type BreakdownItem = {
  id: string;
  name: string;
  code: string;
  type: "REVENUE" | "EXPENSE";
  total: number;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mode = (searchParams.get("mode") ?? "summary") as LabaRugiMode;

    let start: Date | undefined;
    let end: Date | undefined;
    if (startDate) start = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    const details = await fetchJournalDetails({ start, end });
    const filtered = details.filter(
      (d) => d.account.type === "REVENUE" || d.account.type === "EXPENSE"
    );

    const summary = calculateLabaRugi(filtered);

    // Hitung breakdown per akun
    const breakdown = filtered.reduce<Record<string, BreakdownItem>>((acc, curr) => {
        const accId = curr.account.id;
        if (!acc[accId]) {
            acc[accId] = {
                id: accId,
                name: curr.account.name,
                code: curr.account.code,
                type: curr.account.type as "REVENUE" | "EXPENSE",
                total: 0
            };
        }

        if (curr.account.type === "REVENUE") {
            acc[accId].total += (curr.credit - curr.debit);
        } else {
            acc[accId].total += (curr.debit - curr.credit);
        }

        return acc;
    }, {});

    const lines: LabaRugiLine[] = mode === "detailed"
      ? filtered
          .slice()
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .map((d) => {
            const amount = d.account.type === "REVENUE" ? (d.credit - d.debit) : (d.debit - d.credit);
            return {
              date: d.date.toISOString(),
              description: d.description,
              accountCode: d.account.code,
              accountName: d.account.name,
              type: d.account.type as "REVENUE" | "EXPENSE",
              debit: d.debit,
              credit: d.credit,
              amount
            };
          })
      : [];

    return NextResponse.json({
        summary,
        breakdown: Object.values(breakdown),
        mode,
        lines
    });

  } catch (error: unknown) {
    console.error("API Error [Laba Rugi GET]:", error);
    const message = getErrorMessage(error, "Gagal menghitung Laba Rugi.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
