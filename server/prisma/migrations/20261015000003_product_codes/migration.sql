-- CreateEnum
CREATE TYPE "ProductCodeType" AS ENUM ('EAN_13', 'UPC_A', 'EAN_8', 'CODE_128', 'QR', 'OTHER');

-- CreateTable
CREATE TABLE "product_codes" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ProductCodeType" NOT NULL DEFAULT 'CODE_128',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_codes_businessId_idx" ON "product_codes"("businessId");

-- CreateIndex
CREATE INDEX "product_codes_productId_idx" ON "product_codes"("productId");

-- CreateIndex
CREATE INDEX "product_codes_businessId_code_idx" ON "product_codes"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "product_codes_businessId_code_key" ON "product_codes"("businessId", "code");

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
