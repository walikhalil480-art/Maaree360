
export type StockMovementType =
  | 'OPENING_STOCK'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE'
  | 'LOSS'
  | 'RETURN'

export interface StockLevel {
  id: string
  businessId: string
  productId: string
  quantity: number
  reservedQuantity: number
  lastUpdated: string
}

export interface StockMovement {
  id: string
  businessId: string
  productId: string
  type: StockMovementType
  quantityChange: number
  previousQuantity: number
  resultingQuantity: number
  reason?: string | null
  reference?: string | null
  idempotencyKey?: string | null
  userId: string
  user?: {
    id: string
    name: string
    email: string
  }
  product?: {
    id: string
    name: string
    sku: string
    unit: string
  }
  createdAt: string
}

export interface InventoryItem {
  product: {
    id: string
    name: string
    sku: string
    brand?: string | null
    unit: string
    costPrice: number | string
    sellingPrice: number | string
    minStockThreshold: number
    isActive: boolean
    imageUrl?: string | null
    category?: {
      id: string
      name: string
    } | null
  }
  stockLevel: {
    quantity: number
    reservedQuantity: number
    lastUpdated: string
  }
  status: 'OPTIMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  isLowStock: boolean
  isOutOfStock: boolean
}

export interface LowStockItem {
  productId: string
  name: string
  sku: string
  brand?: string | null
  imageUrl?: string | null
  unit: string
  category: string
  currentQuantity: number
  minStockThreshold: number
  isOutOfStock: boolean
  deficit: number
}

export interface InventoryPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface InventoryListResponse {
  success: boolean
  items: InventoryItem[]
  pagination: InventoryPagination
  metrics?: {
    totalItems: number
    totalUnits: number
    lowStockCount: number
    outOfStockCount: number
  }
}

export interface LowStockResponse {
  success: boolean
  count: number
  items: LowStockItem[]
}

export interface ProductInventoryResponse {
  success: boolean
  product: {
    id: string
    name: string
    sku: string
    unit: string
    minStockThreshold: number
    isActive: boolean
    imageUrl?: string | null
    category?: { id: string; name: string } | null
  }
  stockLevel: {
    quantity: number
    reservedQuantity: number
    lastUpdated: string
  }
  isLowStock: boolean
  recentMovements: StockMovement[]
}

export interface MovementsListResponse {
  success: boolean
  movements: StockMovement[]
  pagination: InventoryPagination
}

export interface RecordOpeningStockPayload {
  quantity: number
  reason?: string
}

export interface ReceiveStockPayload {
  quantity: number
  reason?: string
  reference?: string
  idempotencyKey?: string
}

export interface IssueStockPayload {
  quantity: number
  reason?: string
  reference?: string
  idempotencyKey?: string
}

export interface AdjustStockPayload {
  mode: 'COUNT' | 'DIFF'
  countedQuantity?: number
  quantityChange?: number
  reason: string
  reference?: string
  idempotencyKey?: string
}

export interface RecordLossDamagePayload {
  quantity: number
  type: 'DAMAGE' | 'LOSS'
  reason: string
  reference?: string
  idempotencyKey?: string
}

export interface RecordReturnPayload {
  quantity: number
  reason: string
  reference?: string
  idempotencyKey?: string
}
