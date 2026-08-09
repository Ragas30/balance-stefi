import { firestore } from "@/lib/firebase-admin";
import { toNumber } from "@/lib/firebase-admin";
import type { Transaction } from "firebase-admin/firestore";

export type JournalDetailInput = { accountId: string; debit: number; credit: number };
export type AccountSpec = { code: string; name: string; type: string };

export function isJournalBalanced(
    details: { debit: number | string; credit: number | string }[]
): boolean {
    const sumDebit = details.reduce((acc, curr) => acc + toNumber(curr.debit), 0);
    const sumCredit = details.reduce((acc, curr) => acc + toNumber(curr.credit), 0);

    // Using a tiny epsilon for float comparison safety
    return Math.abs(sumDebit - sumCredit) < 0.0001;
}

export function assertJournalBalanced(
    details: { debit: number | string; credit: number | string }[]
) {
    if (!isJournalBalanced(details)) {
        throw new Error("Jurnal tidak seimbang: Total Debit harus sama dengan Total Kredit.");
    }
}

export async function ensureAccounts(
    t: Transaction,
    specs: AccountSpec[]
): Promise<Record<string, string>> {
    const uniqueSpecs = [...new Map(specs.map((s) => [s.code, s])).values()];

    const reads = uniqueSpecs.map((s) =>
        t.get(firestore.collection("accounts").where("code", "==", s.code).limit(1))
    );
    const snapshots = await Promise.all(reads);

    const ids: Record<string, string> = {};
    uniqueSpecs.forEach((s, i) => {
        if (!snapshots[i].empty) ids[s.code] = snapshots[i].docs[0].id;
    });

    for (const s of uniqueSpecs) {
        if (!ids[s.code]) {
            const ref = firestore.collection("accounts").doc();
            ids[s.code] = ref.id;
            t.set(ref, { code: s.code, name: s.name, type: s.type, createdAt: new Date() });
        }
    }

    return ids;
}

export function createJournal(
    t: Transaction,
    opts: { date: Date; description: string; details: JournalDetailInput[] }
): string {
    const { date, description, details } = opts;
    assertJournalBalanced(details);

    const txRef = firestore.collection("transactions").doc();
    t.set(txRef, { date, description, createdAt: new Date() });

    for (const d of details) {
        const detRef = txRef.collection("details").doc();
        t.set(detRef, {
            transactionId: txRef.id,
            accountId: d.accountId,
            debit: d.debit,
            credit: d.credit,
        });
    }

    return txRef.id;
}

export async function getAccountsMap(
    ids: string[]
): Promise<Map<string, { id: string; code: string; name: string; type: string }>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();

    const refs = unique.map((id) => firestore.collection("accounts").doc(id));
    const snapshots = await firestore.getAll(...refs);

    const map = new Map<string, { id: string; code: string; name: string; type: string }>();
    snapshots.forEach((snap) => {
        if (snap.exists) {
            const data = snap.data();
            map.set(snap.id, {
                id: snap.id,
                code: data?.code ?? "",
                name: data?.name ?? "",
                type: data?.type ?? "",
            });
        }
    });

    return map;
}
