import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildJournalPayload, getOrCreateAccount } from "@/lib/accounting";
import { z } from "zod";

const saleDetailSchema = z.object({
    productId: z.string().uuid("Invalid Product ID"),
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
            // 1. Process Product Stocks
            for (const item of data.details) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new Error(`Product ${item.productId} tidak ditemukan`);
                if (product.stock < item.qty) {
                    throw new Error(`Stok ${product.name} tidak mencukupi. Tersedia: ${product.stock}`);
                }
                
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.qty } }
                });
            }

            // 2. Process Payment Methods (Voucher / Kasbon constraints)
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

            // 3. Create Sale record
            const sale = await tx.sale.create({
                data: {
                    date,
                    total: totalAmount,
                    details: {
                        create: data.details.map(d => ({
                            productId: d.productId,
                            qty: d.qty,
                            price: d.price
                        }))
                    }
                }
            });

            // 4. Generate Journal Double-Entry
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

    } catch (error: any) {
        console.error("API Error [Sales]:", error);
        if (error instanceof z.ZodError) {
            const err = error as any;
            return NextResponse.json({ error: err.errors ? err.errors.map((e: any) => e.message).join(", ") : "Validasi input gagal." }, { status: 400 });
        }
        let message = error.message || "Gagal memproses penjualan.";
        if (error.message?.includes("Record to update not found")) message = "Produk tidak ditemukan di database.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
