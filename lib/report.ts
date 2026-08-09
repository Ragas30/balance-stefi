import { firestore, toDate, toNumber } from "@/lib/firebase-admin";
import { getAccountsMap } from "@/lib/accounting";
import type { Query, DocumentData } from "firebase-admin/firestore";

/**
 * Calculates Income Statement (Laba Rugi) parameters from given transaction details.
 * Rule:
 * - Revenue: SUM(credit - debit) for AccountType = REVENUE
 * - Expense: SUM(debit - credit) for AccountType = EXPENSE
 * - Laba = Revenue - Expense
 */
export function calculateLabaRugi(details: { account: { type: string }, debit: number, credit: number }[]) {
    let revenue = 0;
    let expense = 0;

    for (const d of details) {
        if (d.account.type === "REVENUE") {
            revenue += Number(d.credit) - Number(d.debit);
        } else if (d.account.type === "EXPENSE") {
            expense += Number(d.debit) - Number(d.credit);
        }
    }

    return {
        revenue: Math.round(revenue * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        laba: Math.round((revenue - expense) * 100) / 100
    };
}

export type LabaRugiMode = "summary" | "detailed";

export type LabaRugiLine = {
    date: string;
    description: string;
    accountCode: string;
    accountName: string;
    type: "REVENUE" | "EXPENSE";
    debit: number;
    credit: number;
    amount: number;
};

export type JournalLine = {
    id: string;
    date: Date;
    description: string;
    account: { id: string; code: string; name: string; type: string };
    debit: number;
    credit: number;
};

export async function fetchJournalDetails(opts: {
    start?: Date;
    end?: Date;
}): Promise<JournalLine[]> {
    let query: Query<DocumentData, DocumentData> = firestore.collection("transactions");
    if (opts.start) query = query.where("date", ">=", opts.start);
    if (opts.end) query = query.where("date", "<=", opts.end);

    const txSnap = await query.get();
    const lines: JournalLine[] = [];

    for (const txDoc of txSnap.docs) {
        const tx = txDoc.data();
        const detSnap = await txDoc.ref.collection("details").get();
        if (detSnap.empty) continue;

        const accountIds = detSnap.docs.map((d) => d.data().accountId);
        const accounts = await getAccountsMap(accountIds);

        for (const det of detSnap.docs) {
            const data = det.data();
            const account = accounts.get(data.accountId);
            if (!account) continue;
            lines.push({
                id: det.id,
                date: toDate(tx.date),
                description: tx.description,
                account,
                debit: toNumber(data.debit),
                credit: toNumber(data.credit),
            });
        }
    }

    return lines;
}
