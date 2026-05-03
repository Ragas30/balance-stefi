<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 📦 AI AGENT SPECIFICATION

## Sistem Laporan Keuangan Minimarket (Next.js + Prisma)

---

# 🎯 OBJECTIVE

Bangun sistem berbasis web menggunakan Next.js (App Router) untuk:

* Mencatat transaksi keuangan (double-entry accounting)
* Mengelola:

  * Penjualan
  * Voucher
  * Kasbon (piutang & utang)
* Menghasilkan laporan:

  * **Laba Rugi (core feature)**
* Mendukung:

  * Filter tanggal (harian, bulanan, tahunan, custom)
  * Export & import Excel
* UI modern, responsive

---

# 🧠 CORE PRINCIPLE

* Gunakan double-entry accounting
* Semua transaksi bisnis HARUS menghasilkan jurnal
* Tidak menyimpan saldo langsung (harus dihitung dari jurnal)

---

# 📊 FORMULA LABA RUGI

Laba = Total Pendapatan - Total Beban

---

# ⚙️ TECH STACK

* Framework: Next.js (App Router)
* ORM: Prisma
* Database: PostgreSQL
* Styling: Tailwind CSS
* Validation: Zod
* Excel: xlsx / exceljs

---

# 🗂️ FOLDER STRUCTURE

app/
├── dashboard/
├── transaksi/
├── laporan/
├── voucher/
├── kasbon/
├── api/

components/
lib/
├── prisma.ts
├── accounting.ts
├── report.ts

prisma/
└── schema.prisma

---

# 🧱 DATABASE SCHEMA (PRISMA)

## Account

model Account {
id        String   @id @default(uuid())
code      String   @unique
name      String
type      AccountType

createdAt DateTime @default(now())

details   TransactionDetail[]
}

enum AccountType {
ASSET
LIABILITY
EQUITY
REVENUE
EXPENSE
}

---

## Transaction

model Transaction {
id          String   @id @default(uuid())
date        DateTime
description String

createdAt   DateTime @default(now())

details     TransactionDetail[]
}

---

## Transaction Detail

model TransactionDetail {
id            String   @id @default(uuid())
transactionId String
accountId     String

debit         Decimal  @default(0)
credit        Decimal  @default(0)

transaction   Transaction @relation(fields: [transactionId], references: [id])
account       Account     @relation(fields: [accountId], references: [id])
}

---

## Product

model Product {
id     String @id @default(uuid())
name   String
price  Decimal
stock  Int
}

---

## Sale

model Sale {
id        String   @id @default(uuid())
date      DateTime
total     Decimal

details   SaleDetail[]
}

---

## Sale Detail

model SaleDetail {
id        String @id @default(uuid())
saleId    String
productId String

qty       Int
price     Decimal

sale      Sale @relation(fields: [saleId], references: [id])
}

---

## Voucher

model Voucher {
id        String   @id @default(uuid())
code      String   @unique
value     Decimal
balance   Decimal
status    String
}

---

## Receivable (Piutang)

model Receivable {
id        String   @id @default(uuid())
customer  String
total     Decimal
paid      Decimal
status    String
}

---

## Payable (Utang)

model Payable {
id        String   @id @default(uuid())
name      String
total     Decimal
paid      Decimal
status    String
}

---

# 🔗 BUSINESS FLOW

## 1. PENJUALAN

Input:

* Produk
* Qty
* Metode bayar (Cash / Voucher / Kasbon)

Backend:

1. Simpan ke sales
2. Update stok
3. Generate jurnal:

Cash:

* Kas (Debit)
* Pendapatan (Kredit)

Voucher:

* Hutang Voucher (Debit)
* Pendapatan (Kredit)

Kasbon:

* Piutang (Debit)
* Pendapatan (Kredit)

---

## 2. VOUCHER

Saat dibuat:

* Kas (Debit)
* Hutang Voucher (Kredit)

Saat dipakai:

* Hutang Voucher (Debit)
* Pendapatan (Kredit)

---

## 3. PIUTANG

Saat transaksi:

* Piutang (Debit)
* Pendapatan (Kredit)

Saat dibayar:

* Kas (Debit)
* Piutang (Kredit)

---

## 4. UTANG

Saat beli:

* Persediaan (Debit)
* Hutang (Kredit)

Saat bayar:

* Hutang (Debit)
* Kas (Kredit)

---

# 📊 LAPORAN LABA RUGI

Filter:
WHERE date BETWEEN start_date AND end_date

Revenue:
SUM(credit - debit)

Expense:
SUM(debit - credit)

Final:
laba = revenue - expense

---

# 📤 EXPORT EXCEL

Format:

| Date | Description | Account | Debit | Credit |

---

# 📥 IMPORT EXCEL

* Parse file
* Validasi:

  * Debit = Kredit
* Insert ke jurnal

---

# 🎨 UI REQUIREMENT

* Responsive (mobile + desktop)
* Dashboard ringkasan laba
* Table + filter
* Form transaksi multi-row

---

# 📄 HALAMAN

1. Dashboard
2. Transaksi (Jurnal)
3. Penjualan
4. Laporan Laba Rugi
5. Voucher
6. Kasbon

---

# ⚠️ VALIDATION RULES

* Debit = Kredit (WAJIB)
* Tidak boleh kosong
* Voucher tidak boleh minus
* Piutang tidak boleh overpaid

---

# 🚀 API / SERVER ACTION

POST /api/sales
POST /api/journal
GET /api/report

---

# 🔥 PRIORITAS IMPLEMENTASI

1. COA + Jurnal
2. Laporan laba rugi
3. Penjualan
4. Voucher
5. Kasbon
6. Export/import

---

# 🎯 FINAL EXPECTATION

* Laporan laba rugi akurat
* Semua transaksi terhubung ke jurnal
* Sistem scalable dan maintainable
* UI responsive & clean

---

# 📌 CATATAN

* Semua logic akuntansi di `lib/accounting.ts`
* Jangan hitung di frontend
* Gunakan Prisma query efisien
* Gunakan validasi Zod di semua input

---

# 🧩 CATATAN DISKUSI (KEEP)

## Arah Simplifikasi (disepakati, belum full migrasi)

- Fokus utama aplikasi diarahkan ke pencatatan kas sederhana:
  - Pemasukan
  - Pengeluaran
  - Analisa Laba/Rugi
- COA tidak menjadi kebutuhan utama operasional harian pada mode sederhana.
- Relasi transaksi dengan kasbon tetap dipertahankan.
- Fitur import tetap wajib tersedia.

## Mode Laporan (disepakati)

- Laporan laba rugi memiliki mode:
  - `summary` (ringkas)
  - `detailed` (detail + keterangan transaksi)
- Laporan mendukung export:
  - Excel
  - PDF

## Catatan Implementasi Saat Ini

- Mode laporan dan export sudah ditambahkan di endpoint laporan laba-rugi.
- Export Excel sementara menggunakan format CSV kompatibel Excel.
- Export PDF menggunakan generator PDF ringan internal.
- Upgrade ke `.xlsx` native dan layout PDF lanjutan dilakukan setelah environment package install normal.

## Prinsip Lanjutan

- Backend tetap menjadi sumber kebenaran perhitungan laba/rugi.
- Hindari logika hitung laporan di frontend.
- Pertahankan validasi input ketat (Zod) untuk semua endpoint.

---
