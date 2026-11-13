-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxPin" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" DECIMAL(14,4) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "quantityReceived" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_receipts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "idempotencyKey" TEXT,

    CONSTRAINT "purchase_order_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityReceived" DECIMAL(14,4) NOT NULL,
    "stockMovementId" TEXT,

    CONSTRAINT "purchase_order_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_businessId_idx" ON "suppliers"("businessId");

-- CreateIndex
CREATE INDEX "suppliers_businessId_isActive_idx" ON "suppliers"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "suppliers_businessId_name_idx" ON "suppliers"("businessId", "name");

-- CreateIndex
CREATE INDEX "purchase_orders_businessId_idx" ON "purchase_orders"("businessId");

-- CreateIndex
CREATE INDEX "purchase_orders_businessId_status_idx" ON "purchase_orders"("businessId", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_createdById_idx" ON "purchase_orders"("createdById");

-- CreateIndex
CREATE INDEX "purchase_orders_businessId_createdAt_idx" ON "purchase_orders"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_businessId_orderNumber_key" ON "purchase_orders"("businessId", "orderNumber");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_items_productId_idx" ON "purchase_order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_purchaseOrderId_productId_key" ON "purchase_order_items"("purchaseOrderId", "productId");

-- CreateIndex
CREATE INDEX "purchase_order_receipts_businessId_idx" ON "purchase_order_receipts"("businessId");

-- CreateIndex
CREATE INDEX "purchase_order_receipts_purchaseOrderId_idx" ON "purchase_order_receipts"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_receipts_receivedById_idx" ON "purchase_order_receipts"("receivedById");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_receipts_businessId_idempotencyKey_key" ON "purchase_order_receipts"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_items_receiptId_idx" ON "purchase_order_receipt_items"("receiptId");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_items_purchaseOrderItemId_idx" ON "purchase_order_receipt_items"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_items_productId_idx" ON "purchase_order_receipt_items"("productId");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
