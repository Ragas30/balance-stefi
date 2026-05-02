import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildJournalPayload, getOrCreateAccount } from "@/lib/accounting";
import { z } from "zod";

const kasbonSchema = z.object({
    type: z.enum(["PIUTANG", "UTANG"]),
    name: z.string().min(1, "Nama diperlukan"),
    total: z.number().min(1, "Total harus lebih dari 0")
});

export async function GET() {
    try {
        const [piutang, utang] = await Promise.all([
            prisma.receivable.findMany({ orderBy: { id: "desc" } }),
            prisma.payable.findMany({ orderBy: { id: "desc" } })
        ]);
        
        return NextResponse.json({ piutang, utang });
    } catch (error: any) {
        console.error("API Error [Kasbon GET]:", error);
        let message = error.message || "Gagal memuat data kasbon.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = kasbonSchema.parse(body);

        const result = await prisma.$transaction(async (tx) => {
            let entity;
            let debitAccountId = "";
            let creditAccountId = "";

            if (data.type === "PIUTANG") {
                // Pinjaman Uang Kasbon Karyawan/Customer via Kas
                entity = await tx.receivable.create({
                    data: {
                        customer: data.name,
                        total: data.total,
                        paid: 0,
                        status: "BELUM_LUNAS"
                    }
                });

                debitAccountId = await getOrCreateAccount(tx, "1120", "Piutang Usaha", "ASSET");
                creditAccountId = await getOrCreateAccount(tx, "1110", "Kas", "ASSET");
                
            } else {
                // Pinjaman Barang Toko via Supplier
                entity = await tx.payable.create({
                    data: {
                        name: data.name,
                        total: data.total,
                        paid: 0,
                        status: "BELUM_LUNAS"
                    }
                });

                debitAccountId = await getOrCreateAccount(tx, "1130", "Persediaan Barang", "ASSET");
                creditAccountId = await getOrCreateAccount(tx, "2110", "Hutang Usaha", "LIABILITY");
            }

            // Generate Journal
            const journalPayload = buildJournalPayload({
                date: new Date(),
                description: `Pencatatan ${data.type} ${data.name}`,
                details: [
                    { accountId: debitAccountId, debit: data.total, credit: 0 },
                    { accountId: creditAccountId, debit: 0, credit: data.total }
                ]
            });

            await tx.transaction.create({
                data: journalPayload
            });

            return entity;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error("API Error [Kasbon]:", error);
        if (error instanceof z.ZodError) {
            const err = error as any;
            return NextResponse.json({ error: err.errors ? err.errors.map((e: any) => e.message).join(", ") : "Validasi input gagal." }, { status: 400 });
        }
        let message = error.message || "Gagal memproses kasbon.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
