import { NextResponse } from "next/server";
import { firestore, toIso, toNumber } from "@/lib/firebase-admin";
import { assertJournalBalanced, createJournal, getAccountsMap } from "@/lib/accounting";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";
import type { Query, DocumentData } from "firebase-admin/firestore";

const journalDetailSchema = z.object({
  accountId: z.string().min(1, "Invalid Account ID"),
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: Query<DocumentData, DocumentData> = firestore.collection("transactions");
    if (startDate) query = query.where("date", ">=", new Date(startDate));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.where("date", "<=", end);
    }

    const snap = await query.get();
    const transactions = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const detSnap = await doc.ref.collection("details").get();
      const accountIds = detSnap.docs.map((d) => d.data().accountId);
      const accounts = await getAccountsMap(accountIds);

      const details = detSnap.docs.map((d) => {
        const det = d.data();
        return {
          id: d.id,
          transactionId: det.transactionId ?? doc.id,
          accountId: det.accountId,
          debit: toNumber(det.debit),
          credit: toNumber(det.credit),
          account: accounts.get(det.accountId) ?? null,
        };
      });

      transactions.push({
        id: doc.id,
        date: toIso(data.date),
        description: data.description,
        createdAt: toIso(data.createdAt),
        details,
      });
    }

    transactions.sort((a, b) => b.date.localeCompare(a.date));

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

    const date = new Date(parsedData.date);
    assertJournalBalanced(parsedData.details);

    const transactionId = await firestore.runTransaction(async (t) => {
      return createJournal(t, {
        date,
        description: parsedData.description,
        details: parsedData.details,
      });
    });

    const txDoc = await firestore.collection("transactions").doc(transactionId).get();
    const data = txDoc.data();
    const detSnap = await txDoc.ref.collection("details").get();
    const accountIds = detSnap.docs.map((d) => d.data().accountId);
    const accounts = await getAccountsMap(accountIds);

    const details = detSnap.docs.map((d) => {
      const det = d.data();
      return {
        id: d.id,
        transactionId,
        accountId: det.accountId,
        debit: toNumber(det.debit),
        credit: toNumber(det.credit),
        account: accounts.get(det.accountId) ?? null,
      };
    });

    return NextResponse.json(
      {
        id: transactionId,
        date: toIso(data?.date),
        description: data?.description,
        createdAt: toIso(data?.createdAt),
        details,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("API Error [Journal]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Jurnal tidak seimbang")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = getErrorMessage(error, "Gagal menyimpan jurnal.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
