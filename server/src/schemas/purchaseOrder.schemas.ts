import { z } from 'zod'

export const purchaseOrderItemInputSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .uuid('Valid Product UUID is required'),
  quantityOrdered: z.coerce
    .number({ required_error: 'Ordered quantity is required' })
    .positive('Quantity ordered must be greater than zero'),
  unitCost: z.coerce
    .number({ required_error: 'Unit cost is required' })
    .min(0, 'Unit cost cannot be negative'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z
    .string({ required_error: 'Supplier ID is required' })
    .uuid('Valid Supplier UUID is required'),
  orderDate: z.string().datetime().optional().nullable(),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  taxAmount: z.coerce.number().min(0, 'Tax amount cannot be negative').default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(purchaseOrderItemInputSchema)
    .min(1, 'Purchase order must contain at least one product item'),
})

export const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Valid Supplier UUID is required').optional(),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').optional(),
  taxAmount: z.coerce.number().min(0, 'Tax amount cannot be negative').optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(purchaseOrderItemInputSchema).min(1).optional(),
})

export const receiveDeliveryItemInputSchema = z.object({
  purchaseOrderItemId: z
    .string({ required_error: 'PO item ID is required' })
    .uuid('Valid PO Item UUID is required'),
  quantityReceived: z.coerce
    .number({ required_error: 'Received quantity is required' })
    .positive('Delivered quantity must be greater than zero'),
})

export const receiveDeliverySchema = z.object({
  receiptReference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  idempotencyKey: z.string().trim().max(100).optional().nullable(),
  items: z
    .array(receiveDeliveryItemInputSchema)
    .min(1, 'Delivery receipt must contain at least one received item'),
})

export const cancelPurchaseOrderSchema = z.object({
  notes: z.string().trim().max(1000).optional().nullable(),
})

export const purchaseOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'ALL'])
    .default('ALL'),
  supplierId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemInputSchema>
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>
export type ReceiveDeliveryItemInput = z.infer<typeof receiveDeliveryItemInputSchema>
export type ReceiveDeliveryInput = z.infer<typeof receiveDeliverySchema>
export type CancelPurchaseOrderInput = z.infer<typeof cancelPurchaseOrderSchema>
export type PurchaseOrderQueryInput = z.infer<typeof purchaseOrderQuerySchema>
