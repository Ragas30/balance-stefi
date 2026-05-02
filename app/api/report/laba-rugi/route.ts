import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateLabaRugi } from "@/lib/report";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let transactionFilter: any = undefined;

    if (startDate || endDate) {
        transactionFilter = {};
        if (startDate) transactionFilter.gte = new Date(startDate);
        // Set to end of day if endDate is provided
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            transactionFilter.lte = end;
        }
    }

    const details = await prisma.transactionDetail.findMany({
      where: {
        transaction: transactionFilter ? { date: transactionFilter } : undefined,
        account: {
          type: { in: ["REVENUE", "EXPENSE"] }
        }
      },
      include: {
        account: true
      }
    });

    const summary = calculateLabaRugi(details);

    // Hitung breakdown per akun
    const breakdown = details.reduce((acc: any, curr) => {
        const accId = curr.account.id;
        if (!acc[accId]) {
            acc[accId] = {
                id: accId,
                name: curr.account.name,
                code: curr.account.code,
                type: curr.account.type,
                total: 0
            };
        }
        
        const debit = Number(curr.debit);
        const credit = Number(curr.credit);

        if (curr.account.type === "REVENUE") {
            acc[accId].total += (credit - debit);
        } else {
            acc[accId].total += (debit - credit);
        }

        return acc;
    }, {});

    return NextResponse.json({
        summary,
        breakdown: Object.values(breakdown)
    });

  } catch (error: any) {
    console.error("API Error [Laba Rugi GET]:", error);
    let message = error.message || "Gagal menghitung Laba Rugi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
