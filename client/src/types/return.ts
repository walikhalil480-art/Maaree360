import type { PaymentMethod, Sale } from './sale'
import type { Customer } from './customer'

export type ReturnRestockAction = 'RESTOCK' | 'WRITE_OFF'

export interface SaleReturnItem {
  id: string
  saleReturnId: string
  saleItemId: string
  productId: string
  quantityReturned: number
  unitRefundPrice: number
  refundSubtotal: number
  restockAction: ReturnRestockAction
  notes?: string | null
  stockMovementId?: string | null
  product?: {
    id: string
    name: string
    sku: string
    unit: string
  }
}

export interface SaleReturn {
  id: string
  businessId: string
  saleId: string
  customerId?: string | null
  returnNumber: string
  refundMethod: PaymentMethod
  refundAmount: number
  refundReference?: string | null
  reason?: string | null
  notes?: string | null
  idempotencyKey?: string | null
  processedById: string
  createdAt: string
  updatedAt: string
  sale?: Sale
  customer?: Customer | null
  processedBy?: {
    id: string
    name: string
    email: string
  }
  items: SaleReturnItem[]
  business?: {
    id: string
    name: string
    currency: string
  }
}

export interface CreateReturnItemInput {
  saleItemId: string
  quantity: number
  restockAction?: ReturnRestockAction
  notes?: string
}

export interface CreateReturnInput {
  saleId: string
  items: CreateReturnItemInput[]
  refundMethod: PaymentMethod
  refundReference?: string
  reason?: string
  notes?: string
  idempotencyKey?: string
}

export interface ReturnPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReturnListResponse {
  success: boolean
  returns: SaleReturn[]
  pagination: ReturnPagination
}
