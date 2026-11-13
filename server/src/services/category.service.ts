import { prisma } from '../db/prisma.js'
import { CreateCategoryInput, UpdateCategoryInput } from '../schemas/category.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { Category } from '@prisma/client'

export interface CategoryWithCount extends Category {
  _count?: {
    products: number
  }
}

export class CategoryService {
  async listCategories(businessId: string): Promise<Array<CategoryWithCount & { productsCount: number }>> {
    const categories = await prisma.category.findMany({
      where: { businessId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return categories.map((c) => ({
      ...c,
      productsCount: c._count?.products ?? 0,
    }))
  }

  async createCategory(businessId: string, input: CreateCategoryInput): Promise<Category> {
    const existing = await prisma.category.findUnique({
      where: {
        businessId_name: {
          businessId,
          name: input.name,
        },
      },
    })

    if (existing) {
      throw new AppError(
        `Category '${input.name}' already exists in this business`,
        409,
        'CATEGORY_EXISTS'
      )
    }

    return prisma.category.create({
      data: {
        businessId,
        name: input.name,
        description: input.description,
      },
    })
  }

  async updateCategory(
    businessId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<Category> {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, businessId },
    })

    if (!category) {
      throw new AppError('Category not found or access denied', 404, 'NOT_FOUND')
    }

    if (input.name && input.name !== category.name) {
      const duplicate = await prisma.category.findUnique({
        where: {
          businessId_name: {
            businessId,
            name: input.name,
          },
        },
      })

      if (duplicate) {
        throw new AppError(
          `Category '${input.name}' already exists in this business`,
          409,
          'CATEGORY_EXISTS'
        )
      }
    }

    return prisma.category.update({
      where: { id: categoryId },
      data: input,
    })
  }

  async deleteCategory(businessId: string, categoryId: string): Promise<void> {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, businessId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    if (!category) {
      throw new AppError('Category not found or access denied', 404, 'NOT_FOUND')
    }

    if (category._count.products > 0) {
      throw new AppError(
        `Cannot delete category '${category.name}' because ${category._count.products} product(s) are assigned to it. Please reassign products first.`,
        409,
        'CATEGORY_IN_USE'
      )
    }

    await prisma.category.delete({
      where: { id: categoryId },
    })
  }
}

export const categoryService = new CategoryService()
