import { NextResponse } from "next/server";
import { firestore, toNumber } from "@/lib/firebase-admin";
import { createJournal, ensureAccounts } from "@/lib/accounting";
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

        const result = await firestore.runTransaction(async (t) => {
            // 1. Validate payment constraints (read phase)
            let voucherSnap = null;
            if (data.paymentMethod === "VOUCHER") {
                if (!data.voucherCode) throw new Error("Kode Voucher wajib diisi.");
                voucherSnap = await t.get(
                    firestore.collection("vouchers").where("code", "==", data.voucherCode).limit(1)
                );
                if (voucherSnap.empty) throw new Error("Voucher tidak ditemukan.");
                const voucher = voucherSnap.docs[0].data();
                if (toNumber(voucher.balance) < totalAmount) {
                    throw new Error("Saldo voucher tidak mencukupi.");
                }
            } else if (data.paymentMethod === "KASBON") {
                if (!data.customerName) throw new Error("Nama Pelanggan wajib diisi untuk Kasbon.");
            }

            // 2. Resolve accounts
            const accountSpecs = [
                { code: "4110", name: "Pendapatan Penjualan", type: "REVENUE" },
                data.paymentMethod === "CASH"
                    ? { code: "1110", name: "Kas", type: "ASSET" }
                    : data.paymentMethod === "VOUCHER"
                        ? { code: "2120", name: "Hutang Voucher", type: "LIABILITY" }
                        : { code: "1120", name: "Piutang Usaha", type: "ASSET" },
            ];
            const accountIds = await ensureAccounts(t, accountSpecs);

            // 3. Deduct voucher balance
            if (voucherSnap) {
                const vDoc = voucherSnap.docs[0];
                const v = vDoc.data();
                const newBalance = toNumber(v.balance) - totalAmount;
                t.set(vDoc.ref, { ...v, balance: newBalance, status: newBalance <= 0 ? "USED" : "ACTIVE" });
            }

            // 4. Create Receivable for Kasbon
            if (data.paymentMethod === "KASBON") {
                const ref = firestore.collection("receivables").doc();
                t.set(ref, {
                    customer: data.customerName,
                    total: totalAmount,
                    paid: 0,
                    status: "BELUM_LUNAS",
                    createdAt: new Date(),
                });
            }

            // 5. Create Sale record
            const saleRef = firestore.collection("sales").doc();
            t.set(saleRef, { date, total: totalAmount, createdAt: new Date() });
            for (const d of data.details) {
                t.set(saleRef.collection("details").doc(), {
                    saleId: saleRef.id,
                    productId: d.label,
                    qty: d.qty,
                    price: d.price,
                });
            }

            // 6. Generate Journal Double-Entry
            const debitCode = accountSpecs[1].code;
            let description = `Penjualan #${saleRef.id}`;
            if (data.paymentMethod === "CASH") {
                description += " (Cash)";
            } else if (data.paymentMethod === "VOUCHER") {
                description += ` (Voucher ${data.voucherCode})`;
            } else if (data.paymentMethod === "KASBON") {
                description += ` (Kasbon: ${data.customerName})`;
            }

            createJournal(t, {
                date,
                description,
                details: [
                    { accountId: accountIds[debitCode], debit: totalAmount, credit: 0 },
                    { accountId: accountIds["4110"], debit: 0, credit: totalAmount },
                ],
            });

            return { id: saleRef.id, date, total: totalAmount, details: data.details };
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
