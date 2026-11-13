import { prisma } from '../db/prisma.js'
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
} from '../schemas/customer.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { Prisma, SaleStatus } from '@prisma/client'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

export class CustomerService {
  /**
   * Create a new customer for a business.
   */
  async createCustomer(businessId: string, input: CreateCustomerInput) {
    // If phone is provided, check if active customer with same phone exists in business
    if (input.phone) {
      const existing = await prisma.customer.findFirst({
        where: {
          businessId,
          phone: input.phone,
          isActive: true,
        },
      })

      if (existing) {
        throw new AppError(
          `A customer with phone number '${input.phone}' already exists: ${existing.name}`,
          409,
          'CUSTOMER_PHONE_EXISTS'
        )
      }
    }

    const customer = await prisma.customer.create({
      data: {
        businessId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        taxPin: input.taxPin || null,
        notes: input.notes || null,
      },
    })

    return customer
  }

  /**
   * List customers with pagination, search, and spend metrics.
   */
  async listCustomers(businessId: string, query: CustomerQueryInput) {
    const { page, limit, search, isActive } = query
    const skip = (page - 1) * limit

    const where: Prisma.CustomerWhereInput = { businessId }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { taxPin: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sales: true,
              returns: true,
            },
          },
          sales: {
            where: { status: SaleStatus.COMPLETED },
            select: { total: true },
          },
          returns: {
            select: { refundAmount: true },
          },
        },
      }),
    ])

    // Calculate aggregated spend metrics for each customer
    const formattedCustomers = customers.map((c) => {
      const totalSpent = c.sales.reduce(
        (acc, s) => acc.plus(s.total),
        new Prisma.Decimal(0)
      )
      const totalRefunded = c.returns.reduce(
        (acc, r) => acc.plus(r.refundAmount),
        new Prisma.Decimal(0)
      )
      const netSpend = totalSpent.minus(totalRefunded)

      const { sales, returns, ...rest } = c

      return {
        ...rest,
        totalPurchases: c._count.sales,
        totalReturns: c._count.returns,
        totalSpent: totalSpent.toNumber(),
        totalRefunded: totalRefunded.toNumber(),
        netSpend: netSpend.toNumber(),
      }
    })

    return {
      customers: formattedCustomers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Get customer details with full purchase history, returns history, and lifetime stats.
   */
  async getCustomer(businessId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            payments: true,
            items: {
              select: {
                id: true,
                productName: true,
                quantity: true,
                unitPrice: true,
                lineTotal: true,
                quantityReturned: true,
              },
            },
            returns: {
              select: {
                id: true,
                returnNumber: true,
                refundAmount: true,
                refundMethod: true,
                createdAt: true,
              },
            },
          },
        },
        returns: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            sale: {
              select: {
                id: true,
                receiptNumber: true,
                createdAt: true,
                total: true,
              },
            },
            items: true,
          },
        },
      },
    })

    if (!customer) {
      // Cross-tenant probing detection: verify if record belongs to another business
      const existsElsewhere = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Customer',
          resourceId: customerId,
          action: 'CROSS_TENANT_CUSTOMER_READ_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Customer not found or access denied', 404, 'NOT_FOUND')
    }

    // Lifetime metrics
    const completedSales = customer.sales.filter((s) => s.status === SaleStatus.COMPLETED)
    const totalSpent = completedSales.reduce(
      (acc, s) => acc.plus(s.total),
      new Prisma.Decimal(0)
    )
    const totalRefunded = customer.returns.reduce(
      (acc, r) => acc.plus(r.refundAmount),
      new Prisma.Decimal(0)
    )
    const netSpend = totalSpent.minus(totalRefunded)

    return {
      ...customer,
      metrics: {
        totalPurchases: completedSales.length,
        totalReturns: customer.returns.length,
        totalSpent: totalSpent.toNumber(),
        totalRefunded: totalRefunded.toNumber(),
        netSpend: netSpend.toNumber(),
      },
    }
  }

  /**
   * Update an existing customer.
   */
  async updateCustomer(
    businessId: string,
    customerId: string,
    input: UpdateCustomerInput
  ) {
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    })

    if (!existing) {
      const existsElsewhere = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Customer',
          resourceId: customerId,
          action: 'CROSS_TENANT_CUSTOMER_UPDATE_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Customer not found or access denied', 404, 'NOT_FOUND')
    }

    // Check phone uniqueness if phone is changing
    if (input.phone && input.phone !== existing.phone) {
      const phoneConflict = await prisma.customer.findFirst({
        where: {
          businessId,
          phone: input.phone,
          id: { not: customerId },
          isActive: true,
        },
      })

      if (phoneConflict) {
        throw new AppError(
          `Another customer already has phone number '${input.phone}': ${phoneConflict.name}`,
          409,
          'CUSTOMER_PHONE_EXISTS'
        )
      }
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.taxPin !== undefined && { taxPin: input.taxPin }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    })

    return updated
  }

  /**
   * Delete or archive a customer.
   * If customer has sales or returns, soft-deletes (archives) to preserve financial integrity.
   */
  async deleteCustomer(businessId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
      include: {
        _count: {
          select: { sales: true, returns: true },
        },
      },
    })

    if (!customer) {
      const existsElsewhere = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Customer',
          resourceId: customerId,
          action: 'CROSS_TENANT_CUSTOMER_DELETE_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Customer not found or access denied', 404, 'NOT_FOUND')
    }

    if (customer._count.sales > 0 || customer._count.returns > 0) {
      // Soft delete
      await prisma.customer.update({
        where: { id: customerId },
        data: { isActive: false },
      })
      return { message: 'Customer archived successfully (preserved transaction history).' }
    } else {
      // Hard delete
      await prisma.customer.delete({
        where: { id: customerId },
      })
      return { message: 'Customer deleted successfully.' }
    }
  }
}

export const customerService = new CustomerService()
