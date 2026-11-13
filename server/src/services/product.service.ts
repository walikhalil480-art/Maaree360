import { prisma } from '../db/prisma.js'
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from '../schemas/product.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { Product, Prisma } from '@prisma/client'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

export interface PaginatedProducts {
  products: Product[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export class ProductService {
  async listProducts(
    businessId: string,
    query: ProductQueryInput
  ): Promise<PaginatedProducts> {
    const { page, limit, search, categoryId, isActive, sortBy, sortOrder } = query

    const where: Prisma.ProductWhereInput = {
      businessId,
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        { codes: { some: { code: { contains: term, mode: 'insensitive' } } } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (isActive !== 'all') {
      where.isActive = isActive === 'true'
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          codes: true,
          stockLevel: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ])

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  async createProduct(businessId: string, input: CreateProductInput): Promise<Product> {
    const existingSku = await prisma.product.findUnique({
      where: {
        businessId_sku: {
          businessId,
          sku: input.sku,
        },
      },
    })

    if (existingSku) {
      throw new AppError(
        `SKU '${input.sku}' is already in use by another product in this business`,
        409,
        'SKU_EXISTS'
      )
    }

    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, businessId },
      })
      if (!category) {
        throw new AppError('Specified category does not exist in this business', 400, 'INVALID_CATEGORY')
      }
    }

    if (input.codes && input.codes.length > 0) {
      for (const item of input.codes) {
        const cleanCode = item.code.trim()
        const existingCode = await prisma.productCode.findUnique({
          where: {
            businessId_code: {
              businessId,
              code: cleanCode,
            },
          },
          include: { product: true },
        })
        if (existingCode) {
          throw new AppError(
            `Code '${cleanCode}' is already in use by product '${existingCode.product.name}' in this business`,
            409,
            'CODE_EXISTS'
          )
        }
      }
    }

    return prisma.product.create({
      data: {
        businessId,
        name: input.name,
        sku: input.sku,
        description: input.description,
        brand: input.brand,
        categoryId: input.categoryId,
        imageUrl: input.imageUrl,
        unit: input.unit,
        costPrice: input.costPrice,
        sellingPrice: input.sellingPrice,
        minStockThreshold: input.minStockThreshold,
        isActive: true,
        codes:
          input.codes && input.codes.length > 0
            ? {
                create: input.codes.map((c) => ({
                  businessId,
                  code: c.code.trim(),
                  type: c.type,
                })),
              }
            : undefined,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        codes: true,
      },
    })
  }

  async getProduct(businessId: string, productId: string): Promise<any> {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
      include: {
        category: {
          select: { id: true, name: true },
        },
        codes: true,
        stockLevel: true,
        purchaseOrderItems: {
          take: 1,
          orderBy: { purchaseOrder: { createdAt: 'desc' } },
          include: {
            purchaseOrder: {
              include: {
                supplier: {
                  select: { id: true, name: true, phone: true, email: true },
                },
              },
            },
          },
        },
      },
    })

    if (!product) {
      const existsElsewhere = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Product',
          resourceId: productId,
          action: 'CROSS_TENANT_PRODUCT_READ_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
    }

    const supplier = (product as any).purchaseOrderItems?.[0]?.purchaseOrder?.supplier || null

    return {
      ...product,
      supplier,
    }
  }

  async updateProduct(
    businessId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<Product> {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
    })

    if (!product) {
      const existsElsewhere = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Product',
          resourceId: productId,
          action: 'CROSS_TENANT_PRODUCT_UPDATE_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
    }

    if (input.sku && input.sku !== product.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: {
          businessId_sku: {
            businessId,
            sku: input.sku,
          },
        },
      })
      if (duplicateSku) {
        throw new AppError(
          `SKU '${input.sku}' is already in use by another product in this business`,
          409,
          'SKU_EXISTS'
        )
      }
    }

    if (input.categoryId && input.categoryId !== product.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, businessId },
      })
      if (!category) {
        throw new AppError('Specified category does not exist in this business', 400, 'INVALID_CATEGORY')
      }
    }

    return prisma.product.update({
      where: { id: productId },
      data: input,
      include: {
        category: {
          select: { id: true, name: true },
        },
        codes: true,
      },
    })
  }

  async setProductStatus(businessId: string, productId: string, isActive: boolean): Promise<Product> {
    return this.updateProduct(businessId, productId, { isActive })
  }
}

export const productService = new ProductService()
