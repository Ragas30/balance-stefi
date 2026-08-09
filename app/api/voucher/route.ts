import { NextResponse } from "next/server";
import { firestore, docsWithId, toPlain } from "@/lib/firebase-admin";
import { createJournal, ensureAccounts } from "@/lib/accounting";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

const voucherSchema = z.object({
    value: z.number().min(1, "Nominal harus lebih dari 0"),
    code: z.string().min(1, "Kode tidak boleh kosong")
});

export async function GET() {
    try {
        const snap = await firestore.collection("vouchers").get();
        const vouchers = docsWithId(snap).sort((a, b) => String(b.id).localeCompare(String(a.id)));
        return NextResponse.json(vouchers);
    } catch (error: unknown) {
        console.error("API Error [Voucher GET]:", error);
        const message = getErrorMessage(error, "Gagal memuat daftar voucher.");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = voucherSchema.parse(body);

        const result = await firestore.runTransaction(async (t) => {
            const dup = await t.get(
                firestore.collection("vouchers").where("code", "==", data.code).limit(1)
            );
            if (!dup.empty) throw new Error("Kode Voucher sudah digunakan");

            const accountIds = await ensureAccounts(t, [
                { code: "1110", name: "Kas", type: "ASSET" },
                { code: "2120", name: "Hutang Voucher", type: "LIABILITY" },
            ]);

            const ref = firestore.collection("vouchers").doc();
            const voucher = {
                code: data.code,
                value: data.value,
                balance: data.value,
                status: "ACTIVE",
                createdAt: new Date(),
            };
            t.set(ref, voucher);

            createJournal(t, {
                date: new Date(),
                description: `Penerbitan Voucher ${data.code}`,
                details: [
                    { accountId: accountIds["1110"], debit: data.value, credit: 0 },
                    { accountId: accountIds["2120"], debit: 0, credit: data.value },
                ],
            });

            return { id: ref.id, ...(toPlain(voucher) as Record<string, unknown>) };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
        console.error("API Error [Voucher]:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
        }
        const message = getErrorMessage(error, "Gagal memproses voucher.");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
