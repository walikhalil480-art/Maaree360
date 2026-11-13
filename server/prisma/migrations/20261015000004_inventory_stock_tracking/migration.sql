-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('OPENING_STOCK', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'RETURN');

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantityChange" DECIMAL(14,4) NOT NULL,
    "previousQuantity" DECIMAL(14,4) NOT NULL,
    "resultingQuantity" DECIMAL(14,4) NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "idempotencyKey" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_productId_key" ON "stock_levels"("productId");

-- CreateIndex
CREATE INDEX "stock_levels_businessId_idx" ON "stock_levels"("businessId");

-- CreateIndex
CREATE INDEX "stock_levels_productId_idx" ON "stock_levels"("productId");

-- CreateIndex
CREATE INDEX "stock_levels_businessId_quantity_idx" ON "stock_levels"("businessId", "quantity");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_businessId_productId_key" ON "stock_levels"("businessId", "productId");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_idx" ON "stock_movements"("businessId");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_productId_idx" ON "stock_movements"("businessId", "productId");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_type_idx" ON "stock_movements"("businessId", "type");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_createdAt_idx" ON "stock_movements"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_businessId_idempotencyKey_key" ON "stock_movements"("businessId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration Data Initialization:
-- Initialize zero stock level for any pre-existing products
INSERT INTO "stock_levels" ("id", "businessId", "productId", "quantity", "reservedQuantity", "lastUpdated", "createdAt")
SELECT gen_random_uuid(), "businessId", "id", 0, 0, NOW(), NOW()
FROM "products"
ON CONFLICT ("productId") DO NOTHING;
