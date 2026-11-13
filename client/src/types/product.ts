export type ProductCodeType =
  | 'EAN_13'
  | 'UPC_A'
  | 'EAN_8'
  | 'CODE_128'
  | 'QR'
  | 'OTHER'

export interface ProductCode {
  id: string
  businessId: string
  productId: string
  code: string
  type: ProductCodeType
  createdAt: string
}

export interface Category {
  id: string
  businessId: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  productsCount?: number
  _count?: {
    products: number
  }
}

export interface Product {
  id: string
  businessId: string
  name: string
  sku: string
  description?: string | null
  brand?: string | null
  categoryId?: string | null
  imageUrl?: string | null
  category?: {
    id: string
    name: string
  } | null
  codes?: ProductCode[]
  stockLevel?: {
    id?: string
    quantity: number | string
    reservedQuantity?: number | string
    lastUpdated?: string
  } | null
  unit: string
  costPrice: number | string
  sellingPrice: number | string
  minStockThreshold: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductListResponse {
  success: boolean
  products: Product[]
  pagination: ProductPagination
}

export interface CategoryListResponse {
  success: boolean
  categories: Category[]
}

export interface ProductCodeListResponse {
  success: boolean
  codes: ProductCode[]
}

export interface ResolveCodeResponse {
  success: boolean
  matchedBy: 'BARCODE' | 'QR' | 'QR_REFERENCE' | 'SKU'
  code: string
  product: Product
}
