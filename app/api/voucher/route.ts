import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildJournalPayload, getOrCreateAccount } from "@/lib/accounting";
import { z } from "zod";

const voucherSchema = z.object({
    value: z.number().min(1, "Nominal harus lebih dari 0"),
    code: z.string().min(1, "Kode tidak boleh kosong")
});

export async function GET() {
    try {
        const vouchers = await prisma.voucher.findMany({
            orderBy: { id: "desc" }
        });
        return NextResponse.json(vouchers);
    } catch (error: any) {
        console.error("API Error [Voucher GET]:", error);
        let message = error.message || "Gagal memuat daftar voucher.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = voucherSchema.parse(body);

        const result = await prisma.$transaction(async (tx) => {
            // Check constraint
            const existing = await tx.voucher.findUnique({ where: { code: data.code } });
            if (existing) throw new Error("Kode Voucher sudah digunakan");

            // 1. Create Voucher
            const voucher = await tx.voucher.create({
                data: {
                    code: data.code,
                    value: data.value,
                    balance: data.value,
                    status: "ACTIVE"
                }
            });

            // 2. Generate Journal 
            // Kas (Debit) vs Hutang Voucher (Kredit)
            const kasAccountId = await getOrCreateAccount(tx, "1110", "Kas", "ASSET");
            const hutangVoucherId = await getOrCreateAccount(tx, "2120", "Hutang Voucher", "LIABILITY");

            const journalPayload = buildJournalPayload({
                date: new Date(),
                description: `Penerbitan Voucher ${data.code}`,
                details: [
                    { accountId: kasAccountId, debit: data.value, credit: 0 },
                    { accountId: hutangVoucherId, debit: 0, credit: data.value }
                ]
            });

            await tx.transaction.create({
                data: journalPayload
            });

            return voucher;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error("API Error [Voucher]:", error);
        if (error instanceof z.ZodError) {
            const err = error as any;
            return NextResponse.json({ error: err.errors ? err.errors.map((e: any) => e.message).join(", ") : "Validasi input gagal." }, { status: 400 });
        }
        let message = error.message || "Gagal memproses voucher.";
        if (error.code === 'P2002') message = "Kode Voucher tersebut sudah digunakan! Harap coba kode lain.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
