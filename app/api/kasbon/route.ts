import { NextResponse } from "next/server";
import { firestore, docsWithId, toPlain } from "@/lib/firebase-admin";
import { createJournal, ensureAccounts } from "@/lib/accounting";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

const kasbonSchema = z.object({
    type: z.enum(["PIUTANG", "UTANG"]),
    name: z.string().min(1, "Nama diperlukan"),
    total: z.number().min(1, "Total harus lebih dari 0")
});

export async function GET() {
    try {
        const [piutangSnap, utangSnap] = await Promise.all([
            firestore.collection("receivables").get(),
            firestore.collection("payables").get(),
        ]);

        const sortDesc = (list: Record<string, unknown>[]) =>
            list.sort((a, b) => String(b.id).localeCompare(String(a.id)));

        const piutang = sortDesc(docsWithId(piutangSnap));
        const utang = sortDesc(docsWithId(utangSnap));

        return NextResponse.json({ piutang, utang });
    } catch (error: unknown) {
        console.error("API Error [Kasbon GET]:", error);
        const message = getErrorMessage(error, "Gagal memuat data kasbon.");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = kasbonSchema.parse(body);

        const result = await firestore.runTransaction(async (t) => {
            let debitCode = "";
            let creditCode = "";
            let entity;

            if (data.type === "PIUTANG") {
                entity = {
                    customer: data.name,
                    total: data.total,
                    paid: 0,
                    status: "BELUM_LUNAS",
                    createdAt: new Date(),
                };
                debitCode = "1120";
                creditCode = "1110";
            } else {
                entity = {
                    name: data.name,
                    total: data.total,
                    paid: 0,
                    status: "BELUM_LUNAS",
                    createdAt: new Date(),
                };
                debitCode = "1130";
                creditCode = "2110";
            }

            const accountIds = await ensureAccounts(t, [
                {
                    code: debitCode,
                    name: debitCode === "1120" ? "Piutang Usaha" : "Persediaan Barang",
                    type: "ASSET",
                },
                {
                    code: creditCode,
                    name: creditCode === "1110" ? "Kas" : "Hutang Usaha",
                    type: creditCode === "1110" ? "ASSET" : "LIABILITY",
                },
            ]);

            const entityRef = firestore.collection(
                data.type === "PIUTANG" ? "receivables" : "payables"
            ).doc();
            t.set(entityRef, entity);

            createJournal(t, {
                date: new Date(),
                description: `Pencatatan ${data.type} ${data.name}`,
                details: [
                    { accountId: accountIds[debitCode], debit: data.total, credit: 0 },
                    { accountId: accountIds[creditCode], debit: 0, credit: data.total },
                ],
            });

            return { id: entityRef.id, ...(toPlain(entity) as Record<string, unknown>) };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
        console.error("API Error [Kasbon]:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
        }
        const message = getErrorMessage(error, "Gagal memproses kasbon.");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
