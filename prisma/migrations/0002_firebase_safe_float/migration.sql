-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'IMPORT', 'KASBON');

-- AlterTable
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

-- CreateTable
CREATE TABLE "CashTransaction" (
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

-- CreateIndex
CREATE INDEX "CashTransaction_date_idx" ON "CashTransaction"("date");

-- CreateIndex
CREATE INDEX "CashTransaction_type_idx" ON "CashTransaction"("type");

-- CreateIndex
CREATE INDEX "CashTransaction_source_idx" ON "CashTransaction"("source");
