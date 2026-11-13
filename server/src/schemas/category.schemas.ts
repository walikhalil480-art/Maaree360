import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(100, 'Category name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
})

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Category name cannot be empty')
      .max(100, 'Category name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
