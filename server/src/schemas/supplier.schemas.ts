import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z
    .string({ required_error: 'Supplier name is required' })
    .trim()
    .min(2, 'Supplier name must be at least 2 characters')
    .max(100, 'Supplier name cannot exceed 100 characters'),
  contactPerson: z
    .string()
    .trim()
    .max(100, 'Contact person cannot exceed 100 characters')
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z
    .string()
    .trim()
    .max(255, 'Address cannot exceed 255 characters')
    .optional()
    .nullable(),
  taxPin: z
    .string()
    .trim()
    .max(50, 'Tax/Registration reference cannot exceed 50 characters')
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export const supplierQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  isActive: z.enum(['all', 'true', 'false']).default('all'),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>
