import { z } from 'zod'
import { productCodeItemSchema } from './productCode.schemas.js'

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(1, 'Product name cannot be empty')
    .max(200, 'Product name cannot exceed 200 characters'),
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .min(1, 'SKU cannot be empty')
    .max(100, 'SKU cannot exceed 100 characters'),
  description: z.string().trim().max(1000).optional().nullable(),
  brand: z.string().trim().max(100).optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID format').optional().nullable(),
  imageUrl: z.string().trim().max(2000).optional().nullable(),
  unit: z.string().trim().min(1).max(50).default('piece'),
  costPrice: z.coerce
    .number({ required_error: 'Cost price is required' })
    .min(0, 'Cost price cannot be negative'),
  sellingPrice: z.coerce
    .number({ required_error: 'Selling price is required' })
    .min(0, 'Selling price cannot be negative'),
  minStockThreshold: z.coerce
    .number()
    .int('Threshold must be an integer')
    .min(0, 'Threshold cannot be negative')
    .default(5),
  codes: z.array(productCodeItemSchema).optional(),
})

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    sku: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    brand: z.string().trim().max(100).optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    imageUrl: z.string().trim().max(2000).optional().nullable(),
    unit: z.string().trim().min(1).max(50).optional(),
    costPrice: z.coerce.number().min(0, 'Cost price cannot be negative').optional(),
    sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').optional(),
    minStockThreshold: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  isActive: z.enum(['true', 'false', 'all']).default('all'),
  sortBy: z.enum(['name', 'sellingPrice', 'costPrice', 'createdAt', 'sku']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductQueryInput = z.infer<typeof productQuerySchema>
