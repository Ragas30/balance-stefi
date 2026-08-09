import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildJournalPayload } from "@/lib/accounting";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

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

    const dateFilter: { gte?: Date; lte?: Date } = {};
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
  } catch (error: unknown) {
    console.error("API Error [Journal GET]:", error);
    const message = getErrorMessage(error, "Gagal mengambil data jurnal.");
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
    let payload: ReturnType<typeof buildJournalPayload>;
    try {
        payload = buildJournalPayload({
            date,
            description: parsedData.description,
            details: parsedData.details
        });
    } catch (accError: unknown) {
        return NextResponse.json({ error: getErrorMessage(accError, "Validasi jurnal gagal.") }, { status: 400 });
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
  } catch (error: unknown) {
    console.error("API Error [Journal]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
    }
    const message = getErrorMessage(error, "Gagal menyimpan jurnal.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
