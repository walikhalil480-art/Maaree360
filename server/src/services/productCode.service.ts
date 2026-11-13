import { prisma } from '../db/prisma.js'
import { AddProductCodeInput } from '../schemas/productCode.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { ProductCode, Product } from '@prisma/client'

export interface ResolvedProductResult {
  matchedBy: 'BARCODE' | 'QR' | 'QR_REFERENCE' | 'SKU'
  code: string
  product: Product & {
    category?: { id: string; name: string } | null
    codes: ProductCode[]
  }
}

export class ProductCodeService {
  async listCodes(businessId: string, productId: string): Promise<ProductCode[]> {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
    })

    if (!product) {
      throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
    }

    return prisma.productCode.findMany({
      where: { businessId, productId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async addCode(
    businessId: string,
    productId: string,
    input: AddProductCodeInput
  ): Promise<ProductCode> {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
    })

    if (!product) {
      throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
    }

    const cleanCode = input.code.trim()

    // Check if code is already assigned to ANY product within this business
    const existing = await prisma.productCode.findUnique({
      where: {
        businessId_code: {
          businessId,
          code: cleanCode,
        },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    })

    if (existing) {
      throw new AppError(
        `Code '${cleanCode}' is already assigned to product '${existing.product.name}' (${existing.product.sku}) in this business`,
        409,
        'CODE_EXISTS'
      )
    }

    return prisma.productCode.create({
      data: {
        businessId,
        productId,
        code: cleanCode,
        type: input.type,
      },
    })
  }

  async removeCode(businessId: string, productId: string, codeId: string): Promise<void> {
    const code = await prisma.productCode.findFirst({
      where: { id: codeId, businessId, productId },
    })

    if (!code) {
      throw new AppError('Product code not found or access denied', 404, 'NOT_FOUND')
    }

    await prisma.productCode.delete({
      where: { id: codeId },
    })
  }

  async resolveCode(businessId: string, rawCode: string): Promise<ResolvedProductResult> {
    const cleanCode = rawCode.trim()

    if (!cleanCode) {
      throw new AppError('Barcode or QR code is required', 400, 'VALIDATION_ERROR')
    }

    // 1. Direct barcode/QR match in product_codes table
    const matchedCode = await prisma.productCode.findUnique({
      where: {
        businessId_code: {
          businessId,
          code: cleanCode,
        },
      },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            codes: true,
            stockLevel: true,
          },
        },
      },
    })

    if (matchedCode) {
      return {
        matchedBy: matchedCode.type === 'QR' ? 'QR' : 'BARCODE',
        code: matchedCode.code,
        product: matchedCode.product,
      }
    }

    // 2. Stable TillPro / SmartStock QR Reference pattern (e.g. tillpro:product:<productId> or smartstock:product:<productId>)
    if (cleanCode.startsWith('tillpro:product:') || cleanCode.startsWith('smartstock:product:')) {
      const extractedId = cleanCode
        .replace('tillpro:product:', '')
        .replace('smartstock:product:', '')
        .trim()
      const product = await prisma.product.findFirst({
        where: { id: extractedId, businessId },
        include: {
          category: { select: { id: true, name: true } },
          codes: true,
          stockLevel: true,
        },
      })

      if (product) {
        return {
          matchedBy: 'QR_REFERENCE',
          code: cleanCode,
          product,
        }
      }
    }

    // 3. Fallback: match by product SKU if barcode matches SKU exactly
    const productBySku = await prisma.product.findUnique({
      where: {
        businessId_sku: {
          businessId,
          sku: cleanCode,
        },
      },
      include: {
        category: { select: { id: true, name: true } },
        codes: true,
        stockLevel: true,
      },
    })

    if (productBySku) {
      return {
        matchedBy: 'SKU',
        code: cleanCode,
        product: productBySku,
      }
    }

    // Not found
    throw new AppError(
      `No product found matching code '${cleanCode}' in this business`,
      404,
      'CODE_NOT_FOUND'
    )
  }
}

export const productCodeService = new ProductCodeService()
