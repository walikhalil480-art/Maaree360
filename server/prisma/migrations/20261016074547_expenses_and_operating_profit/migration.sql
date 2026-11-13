-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'ELECTRICITY_AND_WATER', 'EMPLOYEE_WAGES', 'TRANSPORT_AND_DELIVERY', 'INTERNET_AND_PHONE', 'PACKAGING_AND_SUPPLIES', 'REPAIRS_AND_MAINTENANCE', 'MARKETING', 'OTHER');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_businessId_idx" ON "expenses"("businessId");

-- CreateIndex
CREATE INDEX "expenses_businessId_expenseDate_idx" ON "expenses"("businessId", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_businessId_category_idx" ON "expenses"("businessId", "category");

-- CreateIndex
CREATE INDEX "expenses_createdById_idx" ON "expenses"("createdById");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
