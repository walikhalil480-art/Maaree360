import { prisma } from '../db/prisma.js'
import { BusinessStatus, Prisma, Role } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { platformAuditService } from './platformAudit.service.js'
import { generateSlug } from '../utils/security.js'

export interface QueryBusinessesParams {
  search?: string
  status?: BusinessStatus
  planId?: string
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}

export class PlatformBusinessService {
  async listBusinesses(params: QueryBusinessesParams) {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const skip = (page - 1) * limit

    const where: Prisma.BusinessWhereInput = {}

    if (params.status) {
      where.status = params.status
    }

    if (params.planId) {
      where.subscription = {
        planId: params.planId,
      }
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {}
      if (params.startDate) where.createdAt.gte = new Date(params.startDate)
      if (params.endDate) where.createdAt.lte = new Date(params.endDate)
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          memberships: {
            where: { role: Role.OWNER },
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              memberships: true,
              products: true,
              sales: true,
              registers: true,
            },
          },
        },
      }),
      prisma.business.count({ where }),
    ])

    return {
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        status: b.status,
        suspensionReason: b.suspensionReason,
        deactivationReason: b.deactivationReason,
        currency: b.currency,
        timezone: b.timezone,
        phone: b.phone,
        email: b.email,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        owner: b.memberships[0]?.user || null,
        counts: {
          users: b._count.memberships,
          products: b._count.products,
          sales: b._count.sales,
          registers: b._count.registers,
        },
        subscription: b.subscription
          ? {
              id: b.subscription.id,
              status: b.subscription.status,
              planName: b.subscription.plan.name,
              planCode: b.subscription.plan.code,
              billingInterval: b.subscription.billingInterval,
              currentPeriodEnd: b.subscription.currentPeriodEnd,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getBusinessById(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscription: {
          include: { plan: true },
        },
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, createdAt: true },
            },
          },
        },
        registers: true,
        _count: {
          select: {
            products: true,
            sales: true,
            purchaseOrders: true,
            customers: true,
            expenses: true,
          },
        },
      },
    })

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND')
    }

    return business
  }

  async createBusiness(
    data: {
      name: string
      currency?: string
      timezone?: string
      ownerEmail?: string
      ownerName?: string
      planCode?: string
    },
    actor: { id: string; email: string; role: any }
  ) {
    const slug = generateSlug(data.name)
    const currency = data.currency || 'KES'
    const timezone = data.timezone || 'Africa/Nairobi'

    // Find or determine plan
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { code: data.planCode || 'starter' },
    })

    const result = await prisma.$transaction(async (tx) => {
      // Find or create owner user
      let ownerId: string
      if (data.ownerEmail) {
        let existingUser = await tx.user.findUnique({ where: { email: data.ownerEmail } })
        if (!existingUser) {
          existingUser = await tx.user.create({
            data: {
              email: data.ownerEmail,
              name: data.ownerName || data.ownerEmail.split('@')[0],
              passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$placeholderHashMustReset',
            },
          })
        }
        ownerId = existingUser.id
      } else {
        ownerId = actor.id // Default to admin's user ID if no owner email provided
      }

      const business = await tx.business.create({
        data: {
          name: data.name,
          slug,
          currency,
          timezone,
          status: BusinessStatus.ACTIVE,
        },
      })

      // Add owner membership
      await tx.businessMembership.create({
        data: {
          businessId: business.id,
          userId: ownerId,
          role: Role.OWNER,
        },
      })

      // Create initial subscription if plan found
      if (plan) {
        const now = new Date()
        const end = new Date()
        end.setFullYear(now.getFullYear() + 1)
        await tx.businessSubscription.create({
          data: {
            businessId: business.id,
            planId: plan.id,
            status: 'ACTIVE',
            billingInterval: 'MONTHLY',
            currentPeriodStart: now,
            currentPeriodEnd: end,
          },
        })
      }

      return business
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'business.create',
      resourceType: 'Business',
      resourceId: result.id,
      businessId: result.id,
      metadata: { name: result.name, slug: result.slug },
    })

    return result
  }

  async updateBusinessStatus(
    businessId: string,
    newStatus: BusinessStatus,
    reason: string,
    actor: { id: string; email: string; role: any; ipAddress?: string; userAgent?: string }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND')
    }

    if (!reason || reason.trim().length === 0) {
      throw new AppError('A documented reason is required to change business account status', 400, 'REASON_REQUIRED')
    }

    const previousStatus = business.status

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        status: newStatus,
        suspensionReason: newStatus === BusinessStatus.SUSPENDED ? reason : business.suspensionReason,
        deactivationReason: newStatus === BusinessStatus.DEACTIVATED ? reason : business.deactivationReason,
      },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: `business.status_${newStatus.toLowerCase()}`,
      resourceType: 'Business',
      resourceId: businessId,
      businessId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      metadata: {
        previousStatus,
        newStatus,
        reason,
      },
    })

    return updated
  }
}

export const platformBusinessService = new PlatformBusinessService()
