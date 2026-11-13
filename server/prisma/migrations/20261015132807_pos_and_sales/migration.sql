-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'DRAFT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIALLY_PAID', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "amountTendered" DECIMAL(12,2),
    "changeDue" DECIMAL(12,2),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_businessId_idx" ON "sales"("businessId");

-- CreateIndex
CREATE INDEX "sales_cashierId_idx" ON "sales"("cashierId");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"("status");

-- CreateIndex
CREATE INDEX "sales_businessId_createdAt_idx" ON "sales"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_businessId_status_idx" ON "sales"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_businessId_receiptNumber_key" ON "sales"("businessId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_businessId_idempotencyKey_key" ON "sales"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "sale_payments_businessId_idx" ON "sale_payments"("businessId");

-- CreateIndex
CREATE INDEX "sale_payments_saleId_idx" ON "sale_payments"("saleId");

-- CreateIndex
CREATE INDEX "sale_payments_businessId_method_idx" ON "sale_payments"("businessId", "method");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
