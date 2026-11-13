import { prisma } from '../db/prisma.js'
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierQueryInput,
} from '../schemas/supplier.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { Supplier, Prisma } from '@prisma/client'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

export interface PaginatedSuppliers {
  suppliers: (Supplier & { _count?: { purchaseOrders: number } })[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export class SupplierService {
  async listSuppliers(
    businessId: string,
    query: SupplierQueryInput
  ): Promise<PaginatedSuppliers> {
    const { page, limit, search, isActive } = query

    const where: Prisma.SupplierWhereInput = {
      businessId,
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { contactPerson: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ]
    }

    if (isActive !== 'all') {
      where.isActive = isActive === 'true'
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ])

    return {
      suppliers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  async getSupplier(businessId: string, supplierId: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            orderDate: true,
            expectedDeliveryDate: true,
            total: true,
            currency: true,
            createdAt: true,
          },
        },
      },
    })

    if (!supplier) {
      const existsElsewhere = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Supplier',
          resourceId: supplierId,
          action: 'CROSS_TENANT_SUPPLIER_READ_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Supplier not found or access denied', 404, 'NOT_FOUND')
    }

    return supplier
  }

  async createSupplier(
    businessId: string,
    input: CreateSupplierInput
  ): Promise<Supplier> {
    // Normalise email to null if empty string
    const cleanEmail = input.email && input.email.trim() ? input.email.trim().toLowerCase() : null

    return prisma.supplier.create({
      data: {
        businessId,
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        email: cleanEmail,
        address: input.address?.trim() || null,
        taxPin: input.taxPin?.trim() || null,
        notes: input.notes?.trim() || null,
        isActive: true,
      },
    })
  }

  async updateSupplier(
    businessId: string,
    supplierId: string,
    input: UpdateSupplierInput
  ): Promise<Supplier> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    })

    if (!supplier) {
      const existsElsewhere = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Supplier',
          resourceId: supplierId,
          action: 'CROSS_TENANT_SUPPLIER_UPDATE_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Supplier not found or access denied', 404, 'NOT_FOUND')
    }

    const cleanEmail =
      input.email !== undefined
        ? input.email && input.email.trim()
          ? input.email.trim().toLowerCase()
          : null
        : undefined

    return prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: input.name?.trim(),
        contactPerson: input.contactPerson !== undefined ? input.contactPerson?.trim() || null : undefined,
        phone: input.phone !== undefined ? input.phone?.trim() || null : undefined,
        email: cleanEmail,
        address: input.address !== undefined ? input.address?.trim() || null : undefined,
        taxPin: input.taxPin !== undefined ? input.taxPin?.trim() || null : undefined,
        notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
      },
    })
  }

  async archiveSupplier(businessId: string, supplierId: string): Promise<Supplier> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    })

    if (!supplier) {
      const existsElsewhere = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Supplier',
          resourceId: supplierId,
          action: 'CROSS_TENANT_SUPPLIER_ARCHIVE_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Supplier not found or access denied', 404, 'NOT_FOUND')
    }

    // Archiving preserves historical purchase orders; does NOT delete
    return prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: false },
    })
  }

  async reactivateSupplier(businessId: string, supplierId: string): Promise<Supplier> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    })

    if (!supplier) {
      const existsElsewhere = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Supplier',
          resourceId: supplierId,
          action: 'CROSS_TENANT_SUPPLIER_REACTIVATE_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Supplier not found or access denied', 404, 'NOT_FOUND')
    }

    return prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: true },
    })
  }
}

export const supplierService = new SupplierService()
