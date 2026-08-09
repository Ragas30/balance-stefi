import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!projectId || !clientEmail || !privateKey) {
    console.error("Firebase env belum lengkap. Cek .env");
    process.exit(1);
}

const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
});
const db = getFirestore(app);

const BATCH_SIZE = 450;
const summary = {};

async function commitOps(ops) {
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
        const batch = db.batch();
        for (const op of ops.slice(i, i + BATCH_SIZE)) {
            batch.set(op.ref, op.data);
        }
        await batch.commit();
    }
}

async function migrateCollection(name, rows, mapper) {
    const ops = rows.map((row) => ({
        ref: db.collection(name).doc(String(row.id)),
        data: mapper(row),
    }));
    await commitOps(ops);
    summary[name] = rows.length;
    console.log(`[migrate] ${name}: ${rows.length} dokumen`);
}

async function main() {
    console.log("Memulai migrasi PostgreSQL -> Firestore...\n");

    const accounts = await prisma.account.findMany();
    await migrateCollection("accounts", accounts, (a) => ({
        code: a.code,
        name: a.name,
        type: a.type,
        createdAt: a.createdAt,
    }));

    const products = await prisma.product.findMany();
    await migrateCollection("products", products, (p) => ({
        name: p.name,
        price: p.price,
        stock: p.stock,
    }));

    const vouchers = await prisma.voucher.findMany();
    await migrateCollection("vouchers", vouchers, (v) => ({
        code: v.code,
        value: v.value,
        balance: v.balance,
        status: v.status,
    }));

    const receivables = await prisma.receivable.findMany();
    await migrateCollection("receivables", receivables, (r) => ({
        customer: r.customer,
        total: r.total,
        paid: r.paid,
        status: r.status,
    }));

    const payables = await prisma.payable.findMany();
    await migrateCollection("payables", payables, (p) => ({
        name: p.name,
        total: p.total,
        paid: p.paid,
        status: p.status,
    }));

    const cashTransactions = await prisma.cashTransaction.findMany();
    await migrateCollection("cashTransactions", cashTransactions, (c) => ({
        date: c.date,
        type: c.type,
        category: c.category,
        amount: c.amount,
        description: c.description,
        source: c.source,
        kasbonType: c.kasbonType,
        kasbonRef: c.kasbonRef,
        createdAt: c.createdAt,
    }));

    const transactions = await prisma.transaction.findMany({ include: { details: true } });
    const txOps = [];
    for (const t of transactions) {
        txOps.push({
            ref: db.collection("transactions").doc(t.id),
            data: { date: t.date, description: t.description, createdAt: t.createdAt },
        });
        for (const d of t.details) {
            txOps.push({
                ref: db.collection("transactions").doc(t.id).collection("details").doc(d.id),
                data: { transactionId: d.transactionId, accountId: d.accountId, debit: d.debit, credit: d.credit },
            });
        }
    }
    await commitOps(txOps);
    summary["transactions"] = transactions.length;
    console.log(`[migrate] transactions: ${transactions.length} dokumen (+ ${txOps.length - transactions.length} detail)`);

    const sales = await prisma.sale.findMany({ include: { details: true } });
    const saleOps = [];
    for (const s of sales) {
        saleOps.push({
            ref: db.collection("sales").doc(s.id),
            data: { date: s.date, total: s.total },
        });
        for (const d of s.details) {
            saleOps.push({
                ref: db.collection("sales").doc(s.id).collection("details").doc(d.id),
                data: { saleId: d.saleId, productId: d.productId, qty: d.qty, price: d.price },
            });
        }
    }
    await commitOps(saleOps);
    summary["sales"] = sales.length;
    console.log(`[migrate] sales: ${sales.length} dokumen (+ ${saleOps.length - sales.length} detail)`);

    console.log("\n=== RINGKASAN MIGRASI ===");
    for (const [name, count] of Object.entries(summary)) {
        console.log(`${name}: ${count}`);
    }
    console.log("\nSelesai.");

    await pool.end();
}

main().catch((err) => {
    console.error("Migrasi gagal:", err);
    process.exit(1);
});
