import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isJournalBalanced, buildJournalPayload } from "@/lib/accounting";
import { z } from "zod";

const journalDetailSchema = z.object({
  accountId: z.string().uuid("Invalid Account ID"),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

const journalSchema = z.object({
  date: z.string().or(z.date()),
  description: z.string().min(1, "Deskripsi diperlukan"),
  details: z.array(journalDetailSchema).min(2, "Minimal 2 baris jurnal diperlukan"),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const transactions = await prisma.transaction.findMany({
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined,
      include: {
        details: {
          include: { account: true }
        }
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("API Error [Journal GET]:", error);
    let message = error.message || "Gagal mengambil data jurnal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedData = journalSchema.parse(body);

    // Pastikan tanggal adalah Date object
    const date = new Date(parsedData.date);

    // Gunakan fungsi lib/accounting.ts untuk memvalidasi dan membuild payload prisma
    let payload;
    try {
        payload = buildJournalPayload({
            date,
            description: parsedData.description,
            details: parsedData.details
        });
    } catch (accError: any) {
        return NextResponse.json({ error: accError.message }, { status: 400 });
    }

    // Insert menggunakan transaksi (meskipun Prisma sudah menanganinya dengan nested create, kita eksplisit untuk kejelasan)
    const transaction = await prisma.$transaction(async (tx) => {
        return await tx.transaction.create({
            data: payload,
            include: {
                details: {
                    include: { account: true }
                }
            }
        });
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error("API Error [Journal]:", error);
    if (error instanceof z.ZodError) {
      const err = error as any;
      return NextResponse.json({ error: err.errors ? err.errors.map((e: any) => e.message).join(", ") : "Validasi input gagal." }, { status: 400 });
    }
    let message = error.message || "Gagal menyimpan jurnal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
