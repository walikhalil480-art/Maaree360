import type { Supplier } from './supplier'

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  quantityOrdered: number
  unitCost: number
  quantityReceived: number
  subtotal: number
  notes?: string | null
  product: {
    id: string
    name: string
    sku: string
    unit: string
    costPrice?: number
    sellingPrice?: number
  }
}

export interface PurchaseOrderReceiptItem {
  id: string
  receiptId: string
  productId: string
  quantityReceived: number
  product: {
    id: string
    name: string
    sku: string
    unit: string
  }
}

export interface PurchaseOrderReceipt {
  id: string
  businessId: string
  purchaseOrderId: string
  receiptNumber: string
  receivedById: string
  receivedBy?: {
    id: string
    name: string
    email: string
  }
  receivedAt: string
  notes?: string | null
  items: PurchaseOrderReceiptItem[]
}

export interface PurchaseOrder {
  id: string
  businessId: string
  supplierId: string
  orderNumber: string
  status: PurchaseOrderStatus
  orderDate?: string | null
  expectedDeliveryDate?: string | null
  currency: string
  subtotal: number
  discount: number
  taxAmount: number
  total: number
  notes?: string | null
  createdById: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
  receivedAt?: string | null
  createdAt: string
  updatedAt: string
  supplier: Supplier
  items: PurchaseOrderItem[]
  receipts?: PurchaseOrderReceipt[]
}

export interface CreatePurchaseOrderItemInput {
  productId: string
  quantityOrdered: number
  unitCost: number
  notes?: string
}

export interface CreatePurchaseOrderInput {
  supplierId: string
  expectedDeliveryDate?: string
  discount?: number
  taxAmount?: number
  notes?: string
  items: CreatePurchaseOrderItemInput[]
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string
  expectedDeliveryDate?: string | null
  discount?: number
  taxAmount?: number
  notes?: string
  items?: CreatePurchaseOrderItemInput[]
}

export interface ReceiveDeliveryItemInput {
  purchaseOrderItemId: string
  quantityReceived: number
}

export interface ReceiveDeliveryInput {
  items: ReceiveDeliveryItemInput[]
  receiptReference?: string
  notes?: string
  idempotencyKey?: string
}

export interface PurchaseOrderPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PurchaseOrderListResponse {
  success: boolean
  purchaseOrders: PurchaseOrder[]
  pagination: PurchaseOrderPagination
}

export interface PurchaseOrderSummaryResponse {
  success: boolean
  summary: {
    totalOrders: number
    draftOrders: number
    orderedOrders: number
    partiallyReceivedOrders: number
    receivedOrders: number
    cancelledOrders: number
    activeOrdersCount: number
    totalPurchasesValue: number
    recentDeliveries: Array<{
      id: string
      receiptNumber: string
      orderNumber: string
      supplierName: string
      receivedAt: string
      receivedByName: string
      itemCount: number
      totalUnitsReceived: number
    }>
  }
}
