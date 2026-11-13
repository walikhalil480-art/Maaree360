export interface Supplier {
  id: string
  businessId: string
  name: string
  contactPerson?: string | null
  phone: string
  email?: string | null
  physicalAddress?: string | null
  taxPin?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    purchaseOrders: number
  }
}

export interface CreateSupplierInput {
  name: string
  contactPerson?: string
  phone: string
  email?: string
  physicalAddress?: string
  taxPin?: string
  notes?: string
}

export interface UpdateSupplierInput {
  name?: string
  contactPerson?: string
  phone?: string
  email?: string
  physicalAddress?: string
  taxPin?: string
  notes?: string
  isActive?: boolean
}

export interface SupplierPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SupplierListResponse {
  success: boolean
  suppliers: Supplier[]
  pagination: SupplierPagination
}
