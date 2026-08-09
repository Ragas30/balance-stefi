import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildJournalPayload, getOrCreateAccount } from "@/lib/accounting";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

const saleDetailSchema = z.object({
    label: z.string().min(1, "Label produk wajib diisi"),
    qty: z.number().int().min(1, "Qty minimal 1"),
    price: z.number().min(0, "Harga tidak valid")
});

const saleSchema = z.object({
    date: z.string().or(z.date()),
    paymentMethod: z.enum(["CASH", "VOUCHER", "KASBON"]),
    voucherCode: z.string().optional(),
    customerName: z.string().optional(),
    details: z.array(saleDetailSchema).min(1, "Minimal 1 item")
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = saleSchema.parse(body);
        
        const date = new Date(data.date);
        const totalAmount = data.details.reduce((sum, item) => sum + (item.qty * item.price), 0);

        // Execute in a giant transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Process Payment Methods (Voucher / Kasbon constraints)
            if (data.paymentMethod === "VOUCHER") {
                if (!data.voucherCode) throw new Error("Kode Voucher wajib diisi.");
                const voucher = await tx.voucher.findUnique({ where: { code: data.voucherCode } });
                if (!voucher) throw new Error("Voucher tidak ditemukan.");
                if (Number(voucher.balance) < totalAmount) {
                    throw new Error("Saldo voucher tidak mencukupi.");
                }
                
                // Deduct voucher balance
                const newBalance = Number(voucher.balance) - totalAmount;
                await tx.voucher.update({
                    where: { id: voucher.id },
                    data: { 
                        balance: newBalance,
                        status: newBalance <= 0 ? "USED" : "ACTIVE"
                    }
                });
            } else if (data.paymentMethod === "KASBON") {
                if (!data.customerName) throw new Error("Nama Pelanggan wajib diisi untuk Kasbon.");
                
                // Create Receivable
                await tx.receivable.create({
                    data: {
                        customer: data.customerName,
                        total: totalAmount,
                        paid: 0,
                        status: "BELUM_LUNAS"
                    }
                });
            }

            // 2. Create Sale record
            const sale = await tx.sale.create({
                data: {
                    date,
                    total: totalAmount,
                    details: {
                        create: data.details.map(d => ({
                            // Menyimpan label produk bebas ke kolom productId existing
                            productId: d.label,
                            qty: d.qty,
                            price: d.price
                        }))
                    }
                }
            });

            // 3. Generate Journal Double-Entry
            const pendapatanAccountId = await getOrCreateAccount(tx, "4110", "Pendapatan Penjualan", "REVENUE");
            
            let debitAccountId = "";
            let description = `Penjualan #${sale.id}`;

            if (data.paymentMethod === "CASH") {
                debitAccountId = await getOrCreateAccount(tx, "1110", "Kas", "ASSET");
                description += " (Cash)";
            } else if (data.paymentMethod === "VOUCHER") {
                debitAccountId = await getOrCreateAccount(tx, "2120", "Hutang Voucher", "LIABILITY");
                description += ` (Voucher ${data.voucherCode})`;
            } else if (data.paymentMethod === "KASBON") {
                debitAccountId = await getOrCreateAccount(tx, "1120", "Piutang Usaha", "ASSET");
                description += ` (Kasbon: ${data.customerName})`;
            }

            const journalPayload = buildJournalPayload({
                date,
                description,
                details: [
                    { accountId: debitAccountId, debit: totalAmount, credit: 0 },
                    { accountId: pendapatanAccountId, debit: 0, credit: totalAmount }
                ]
            });

            await tx.transaction.create({
                data: journalPayload
            });

            return sale;
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error: unknown) {
        console.error("API Error [Sales]:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
        }
        const message = getErrorMessage(error, "Gagal memproses penjualan.");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
