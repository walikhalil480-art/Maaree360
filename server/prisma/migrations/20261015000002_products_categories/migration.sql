-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "categoryId" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "costPrice" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "minStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_businessId_idx" ON "categories"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_businessId_name_key" ON "categories"("businessId", "name");

-- CreateIndex
CREATE INDEX "products_businessId_idx" ON "products"("businessId");

-- CreateIndex
CREATE INDEX "products_businessId_isActive_idx" ON "products"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "products_businessId_categoryId_idx" ON "products"("businessId", "categoryId");

-- CreateIndex
CREATE INDEX "products_businessId_name_idx" ON "products"("businessId", "name");

-- CreateIndex
CREATE INDEX "products_businessId_sku_idx" ON "products"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_businessId_sku_key" ON "products"("businessId", "sku");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
