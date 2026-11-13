import { z } from 'zod'
import { ProductCodeType } from '@prisma/client'

// Regex validators for standard barcode formats
const EAN13_REGEX = /^\d{13}$/
const UPCA_REGEX = /^\d{12}$/
const EAN8_REGEX = /^\d{8}$/

export const productCodeItemSchema = z
  .object({
    code: z
      .string({ required_error: 'Code value is required' })
      .trim()
      .min(1, 'Code cannot be empty')
      .max(500, 'Code cannot exceed 500 characters'),
    type: z.nativeEnum(ProductCodeType).default(ProductCodeType.CODE_128),
  })
  .superRefine((data, ctx) => {
    if (data.type === ProductCodeType.EAN_13 && !EAN13_REGEX.test(data.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['code'],
        message: 'EAN-13 barcodes must be exactly 13 numeric digits',
      })
    } else if (data.type === ProductCodeType.UPC_A && !UPCA_REGEX.test(data.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['code'],
        message: 'UPC-A barcodes must be exactly 12 numeric digits',
      })
    } else if (data.type === ProductCodeType.EAN_8 && !EAN8_REGEX.test(data.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['code'],
        message: 'EAN-8 barcodes must be exactly 8 numeric digits',
      })
    }
  })

export const addProductCodeSchema = productCodeItemSchema

export const resolveCodeQuerySchema = z.object({
  code: z
    .string({ required_error: 'Barcode or QR code is required' })
    .trim()
    .min(1, 'Code cannot be empty')
    .max(500, 'Code cannot exceed 500 characters'),
})

export type AddProductCodeInput = z.infer<typeof addProductCodeSchema>
export type ResolveCodeQueryInput = z.infer<typeof resolveCodeQuerySchema>
