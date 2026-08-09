import { NextResponse } from "next/server";
import { firestore, toNumber } from "@/lib/firebase-admin";
import { createJournal, ensureAccounts } from "@/lib/accounting";
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

    const result = await firestore.runTransaction(async (t) => {
      const collection = data.type === "PIUTANG" ? "receivables" : "payables";
      const docRef = firestore.collection(collection).doc(data.id);
      const snap = await t.get(docRef);

      if (!snap.exists) {
        throw new Error(data.type === "PIUTANG" ? "Piutang tidak ditemukan" : "Utang tidak ditemukan");
      }

      const entity = snap.data();
      if (!entity) {
        throw new Error(data.type === "PIUTANG" ? "Piutang tidak ditemukan" : "Utang tidak ditemukan");
      }
      if (entity.status === "LUNAS") {
        throw new Error(data.type === "PIUTANG" ? "Piutang sudah lunas" : "Utang sudah lunas");
      }

      const newPaid = toNumber(entity.paid) + data.amount;
      if (newPaid > toNumber(entity.total)) {
        throw new Error(
          data.type === "PIUTANG" ? "Pembayaran melebihi sisa piutang" : "Pembayaran melebihi sisa utang"
        );
      }

      const newStatus = newPaid >= toNumber(entity.total) ? "LUNAS" : "BELUM_LUNAS";

      let debitCode = "";
      let creditCode = "";
      let description = "";

      if (data.type === "PIUTANG") {
        // Journal: Kas (Debit) - Piutang Usaha (Kredit)
        debitCode = "1110";
        creditCode = "1120";
        description = `Pembayaran Piutang dari ${entity.customer}`;
      } else {
        // Journal: Hutang Usaha (Debit) - Kas (Kredit)
        debitCode = "2110";
        creditCode = "1110";
        description = `Pembayaran Utang ke ${entity.name}`;
      }

      const accountIds = await ensureAccounts(t, [
        {
          code: debitCode,
          name: debitCode === "1110" ? "Kas" : debitCode === "2110" ? "Hutang Usaha" : "Piutang Usaha",
          type: debitCode === "1110" || debitCode === "1120" ? "ASSET" : "LIABILITY",
        },
        {
          code: creditCode,
          name: creditCode === "1110" ? "Kas" : "Piutang Usaha",
          type: creditCode === "1110" || creditCode === "1120" ? "ASSET" : "LIABILITY",
        },
      ]);

      t.set(docRef, { ...entity, paid: newPaid, status: newStatus });

      createJournal(t, {
        date: new Date(),
        description,
        details: [
          { accountId: accountIds[debitCode], debit: data.amount, credit: 0 },
          { accountId: accountIds[creditCode], debit: 0, credit: data.amount },
        ],
      });

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
