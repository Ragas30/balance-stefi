import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

const transactionSchema = z.object({
  date: z.string().or(z.date()),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1, "Kategori wajib diisi"),
  amount: z.number().positive("Nominal harus lebih dari 0"),
  description: z.string().min(1, "Keterangan wajib diisi"),
  source: z.enum(["MANUAL", "IMPORT", "KASBON"]).optional(),
  kasbonType: z.enum(["RECEIVABLE", "PAYABLE"]).optional(),
  kasbonRef: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const transactions = await prisma.cashTransaction.findMany({
      where: Object.keys(dateFilter).length ? { date: dateFilter } : undefined,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(transactions);
  } catch (error: unknown) {
    console.error("API Error [Transactions GET]:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Gagal memuat transaksi.") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = transactionSchema.parse(body);

    if (data.source === "KASBON" && !data.kasbonRef) {
      return NextResponse.json({ error: "kasbonRef wajib diisi untuk transaksi kasbon." }, { status: 400 });
    }

    const created = await prisma.cashTransaction.create({
      data: {
        date: new Date(data.date),
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        source: data.source ?? "MANUAL",
        kasbonType: data.kasbonType,
        kasbonRef: data.kasbonRef,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error("API Error [Transactions POST]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
    }
    return NextResponse.json({ error: getErrorMessage(error, "Gagal membuat transaksi.") }, { status: 500 });
  }
}
