import { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;

/**
 * Calculates Income Statement (Laba Rugi) parameters from given transaction details.
 * Rule:
 * - Revenue: SUM(credit - debit) for AccountType = REVENUE
 * - Expense: SUM(debit - credit) for AccountType = EXPENSE
 * - Laba = Revenue - Expense
 */
export function calculateLabaRugi(details: { account: { type: string }, debit: Decimal, credit: Decimal }[]) {
    let revenue = new Prisma.Decimal(0);
    let expense = new Prisma.Decimal(0);

    for (const d of details) {
        if (d.account.type === "REVENUE") {
            revenue = revenue.add(d.credit).sub(d.debit);
        } else if (d.account.type === "EXPENSE") {
            expense = expense.add(d.debit).sub(d.credit);
        }
    }

    return {
        revenue: parseFloat(revenue.toString()),
        expense: parseFloat(expense.toString()),
        laba: parseFloat(revenue.sub(expense).toString())
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
