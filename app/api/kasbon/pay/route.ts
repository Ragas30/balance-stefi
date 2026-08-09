import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildJournalPayload, getOrCreateAccount } from "@/lib/accounting";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

const paySchema = z.object({
  type: z.enum(["PIUTANG", "UTANG"]),
  id: z.string().min(1),
  amount: z.number().min(1, "Jumlah bayar harus lebih dari 0"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = paySchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      if (data.type === "PIUTANG") {
        const receivable = await tx.receivable.findUnique({ where: { id: data.id } });
        if (!receivable) throw new Error("Piutang tidak ditemukan");
        if (receivable.status === "LUNAS") throw new Error("Piutang sudah lunas");

        const newPaid = Number(receivable.paid) + data.amount;
        if (newPaid > Number(receivable.total)) throw new Error("Pembayaran melebihi sisa piutang");

        const newStatus = newPaid >= Number(receivable.total) ? "LUNAS" : "BELUM_LUNAS";

        await tx.receivable.update({
          where: { id: data.id },
          data: { paid: newPaid, status: newStatus },
        });

        // Journal: Kas (Debit) - Piutang Usaha (Kredit)
        const kasId = await getOrCreateAccount(tx, "1110", "Kas", "ASSET");
        const piutangId = await getOrCreateAccount(tx, "1120", "Piutang Usaha", "ASSET");

        const journalPayload = buildJournalPayload({
          date: new Date(),
          description: `Pembayaran Piutang dari ${receivable.customer}`,
          details: [
            { accountId: kasId, debit: data.amount, credit: 0 },
            { accountId: piutangId, debit: 0, credit: data.amount },
          ],
        });

        await tx.transaction.create({ data: journalPayload });
      } else {
        const payable = await tx.payable.findUnique({ where: { id: data.id } });
        if (!payable) throw new Error("Utang tidak ditemukan");
        if (payable.status === "LUNAS") throw new Error("Utang sudah lunas");

        const newPaid = Number(payable.paid) + data.amount;
        if (newPaid > Number(payable.total)) throw new Error("Pembayaran melebihi sisa utang");

        const newStatus = newPaid >= Number(payable.total) ? "LUNAS" : "BELUM_LUNAS";

        await tx.payable.update({
          where: { id: data.id },
          data: { paid: newPaid, status: newStatus },
        });

        // Journal: Hutang Usaha (Debit) - Kas (Kredit)
        const hutangId = await getOrCreateAccount(tx, "2110", "Hutang Usaha", "LIABILITY");
        const kasId = await getOrCreateAccount(tx, "1110", "Kas", "ASSET");

        const journalPayload = buildJournalPayload({
          date: new Date(),
          description: `Pembayaran Utang ke ${payable.name}`,
          details: [
            { accountId: hutangId, debit: data.amount, credit: 0 },
            { accountId: kasId, debit: 0, credit: data.amount },
          ],
        });

        await tx.transaction.create({ data: journalPayload });
      }

      return { success: true };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("API Error [Kasbon Pay]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
    }
    const message = getErrorMessage(error, "Gagal memproses pembayaran kasbon.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
