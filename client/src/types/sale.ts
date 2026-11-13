export type SaleStatus = 'COMPLETED' | 'DRAFT' | 'CANCELLED'

export type PaymentStatus =
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'PENDING'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export type PaymentMethod =
  | 'CASH'
  | 'MOBILE_MONEY'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'OTHER'

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  productName: string
  productSku: string
  unit: string
  quantity: number
  unitPrice: number
  unitCost?: number | null
  discount: number
  taxAmount: number
  lineTotal: number
  quantityReturned?: number
  notes?: string | null
  product?: {
    id: string
    name: string
    sku: string
    unit: string
  }
}

export interface SalePayment {
  id: string
  businessId: string
  saleId: string
  method: PaymentMethod
  amount: number
  amountTendered?: number | null
  changeDue?: number | null
  reference?: string | null
  notes?: string | null
  createdAt: string
}

export interface Sale {
  id: string
  businessId: string
  receiptNumber: string
  cashierId: string
  cashier?: {
    id: string
    name: string
    email: string
  }
  status: SaleStatus
  subtotal: number
  discount: number
  taxAmount: number
  total: number
  currency: string
  paymentStatus: PaymentStatus
  customerId?: string | null
  customer?: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
  } | null
  customerName?: string | null
  customerPhone?: string | null
  notes?: string | null
  idempotencyKey?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  items: SaleItem[]
  payments: SalePayment[]
  returns?: Array<{
    id: string
    returnNumber: string
    refundAmount: number
    refundMethod: PaymentMethod
    createdAt: string
  }>
  business?: {
    id: string
    name: string
    currency: string
    taxPin?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    receiptFooter?: string | null
  }
}

export interface CreateSaleItemInput {
  productId: string
  quantity: number
  discount?: number
  notes?: string
}

export interface CreateSalePaymentInput {
  method: PaymentMethod
  amount?: number
  amountTendered?: number
  reference?: string
  notes?: string
}

export interface CreateSaleInput {
  items: CreateSaleItemInput[]
  discount?: number
  taxAmount?: number
  payment?: CreateSalePaymentInput
  payments?: CreateSalePaymentInput[]
  customerId?: string | null
  customerName?: string
  customerPhone?: string
  notes?: string
  idempotencyKey?: string
}

export interface SalePagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SaleListResponse {
  success: boolean
  sales: Sale[]
  pagination: SalePagination
}

export interface SaleSummaryResponse {
  success: boolean
  summary: {
    todaySalesValue: number
    todayTransactionsCount: number
    totalCompletedTransactions: number
    averageTransactionValue: number
    paymentMethodBreakdown: Array<{
      method: string
      count: number
      total: number
    }>
    recentSales: Array<{
      id: string
      receiptNumber: string
      total: number
      currency: string
      createdAt: string
      cashierName: string
      paymentMethod: string
      itemsCount: number
    }>
  }
}
