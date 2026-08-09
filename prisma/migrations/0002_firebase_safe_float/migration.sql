-- CreateEnum (idempotent: lewati jika sudah ada dari 0001_baseline)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CashFlowType') THEN
    CREATE TYPE "CashFlowType" AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionSource') THEN
    CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'IMPORT', 'KASBON');
  END IF;
END
$$;

-- AlterTable (no-op pada DB fresh karena kolom sudah DOUBLE PRECISION dari baseline)
ALTER TABLE "Payable" ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "paid" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Receivable" ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "paid" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SaleDetail" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TransactionDetail" ALTER COLUMN "debit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "credit" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Voucher" ALTER COLUMN "value" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "balance" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable (idempotent: lewati jika sudah ada dari 0001_baseline)
CREATE TABLE IF NOT EXISTS "CashTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "CashFlowType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "kasbonType" TEXT,
    "kasbonRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "CashTransaction_date_idx" ON "CashTransaction"("date");
CREATE INDEX IF NOT EXISTS "CashTransaction_type_idx" ON "CashTransaction"("type");
CREATE INDEX IF NOT EXISTS "CashTransaction_source_idx" ON "CashTransaction"("source");
