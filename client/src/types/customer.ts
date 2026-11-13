export interface CustomerMetrics {
  totalPurchases: number
  totalReturns: number
  totalSpent: number
  totalRefunded: number
  netSpend: number
}

export interface Customer {
  id: string
  businessId: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  taxPin?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  totalPurchases?: number
  totalReturns?: number
  totalSpent?: number
  totalRefunded?: number
  netSpend?: number
  metrics?: CustomerMetrics
  sales?: Array<{
    id: string
    receiptNumber: string
    status: string
    total: number
    createdAt: string
    items?: Array<{
      id: string
      productName: string
      quantity: number
      unitPrice: number
      lineTotal: number
      quantityReturned: number
    }>
    payments?: Array<{
      id: string
      method: string
      amount: number
    }>
    returns?: Array<{
      id: string
      returnNumber: string
      refundAmount: number
      refundMethod: string
      createdAt: string
    }>
  }>
  returns?: Array<{
    id: string
    returnNumber: string
    refundAmount: number
    refundMethod: string
    createdAt: string
    sale?: {
      id: string
      receiptNumber: string
      total: number
      createdAt: string
    }
  }>
}

export interface CreateCustomerInput {
  name: string
  phone?: string
  email?: string
  address?: string
  taxPin?: string
  notes?: string
}

export interface UpdateCustomerInput {
  name?: string
  phone?: string
  email?: string
  address?: string
  taxPin?: string
  notes?: string
  isActive?: boolean
}

export interface CustomerPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CustomerListResponse {
  success: boolean
  customers: Customer[]
  pagination: CustomerPagination
}
