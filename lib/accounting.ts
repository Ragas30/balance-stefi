import { Prisma } from "@prisma/client";

/**
 * Validates that the sum of all debits equals the sum of all credits in a transaction.
 * @param details Array of transaction details containing string or number debit and credit.
 * @returns boolean True if balanced, False otherwise.
 */
export function isJournalBalanced(
    details: { debit: number | string; credit: number | string }[]
): boolean {
    const sumDebit = details.reduce((acc, curr) => acc + Number(curr.debit), 0);
    const sumCredit = details.reduce((acc, curr) => acc + Number(curr.credit), 0);
    
    // Using a tiny epsilon for float comparison safety
    return Math.abs(sumDebit - sumCredit) < 0.0001;
}

/**
 * Generates an accounting journal payload for Prisma based on provided debits and credits.
 * Automatically validates if the journal is balanced before proceeding.
 */
export function buildJournalPayload({
    date,
    description,
    details
}: {
    date: Date;
    description: string;
    details: { accountId: string; debit: number; credit: number }[];
}) {
    if (!isJournalBalanced(details)) {
        throw new Error("Jurnal tidak seimbang: Total Debit harus sama dengan Total Kredit.");
    }

    return {
        date,
        description,
        details: {
            create: details.map(d => ({
                accountId: d.accountId,
                debit: d.debit,
                credit: d.credit
            }))
        }
    };
}

/**
 * Gets an account by its code, or creates it if it doesn't exist.
 */
export async function getOrCreateAccount(
    tx: Prisma.TransactionClient,
    code: string, 
    name: string, 
    type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
) {
    const existing = await tx.account.findUnique({
        where: { code }
    });
    
    if (existing) return existing.id;
    
    const newAccount = await tx.account.create({
        data: {
            code,
            name,
            type
        }
    });
    
    return newAccount.id;
}
