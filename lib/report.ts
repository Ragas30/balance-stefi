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
