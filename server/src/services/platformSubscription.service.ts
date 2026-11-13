import { prisma } from '../db/prisma.js'
import { BillingInterval, Prisma, SubscriptionStatus } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { platformAuditService } from './platformAudit.service.js'

export class PlatformSubscriptionService {
  async listPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    })

    return plans.map((p) => ({
      ...p,
      priceMonthly: Number(p.priceMonthly),
      priceAnnual: Number(p.priceAnnual),
      subscriberCount: p._count.subscriptions,
    }))
  }

  async createPlan(
    data: {
      code: string
      name: string
      description?: string
      priceMonthly: number
      priceAnnual: number
      currency?: string
      trialDays?: number
      maxUsers?: number
      maxBranches?: number
      features?: Record<string, boolean>
    },
    actor: { id: string; email: string; role: any }
  ) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: data.code.toLowerCase().trim() },
    })

    if (existing) {
      throw new AppError('Plan code already exists', 400, 'PLAN_CODE_EXISTS')
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        code: data.code.toLowerCase().trim(),
        name: data.name,
        description: data.description,
        priceMonthly: new Prisma.Decimal(data.priceMonthly),
        priceAnnual: new Prisma.Decimal(data.priceAnnual),
        currency: data.currency || 'KES',
        trialDays: data.trialDays ?? 14,
        maxUsers: data.maxUsers ?? 5,
        maxBranches: data.maxBranches ?? 1,
        features: (data.features as Prisma.InputJsonValue) || {},
        isActive: true,
      },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'plan.create',
      resourceType: 'SubscriptionPlan',
      resourceId: plan.id,
      metadata: { code: plan.code, name: plan.name, priceMonthly: data.priceMonthly },
    })

    return {
      ...plan,
      priceMonthly: Number(plan.priceMonthly),
      priceAnnual: Number(plan.priceAnnual),
    }
  }

  async updatePlan(
    planId: string,
    data: {
      name?: string
      description?: string
      priceMonthly?: number
      priceAnnual?: number
      maxUsers?: number
      maxBranches?: number
      features?: Record<string, boolean>
      isActive?: boolean
    },
    actor: { id: string; email: string; role: any }
  ) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      throw new AppError('Subscription plan not found', 404, 'NOT_FOUND')
    }

    const updateData: Prisma.SubscriptionPlanUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.priceMonthly !== undefined) updateData.priceMonthly = new Prisma.Decimal(data.priceMonthly)
    if (data.priceAnnual !== undefined) updateData.priceAnnual = new Prisma.Decimal(data.priceAnnual)
    if (data.maxUsers !== undefined) updateData.maxUsers = data.maxUsers
    if (data.maxBranches !== undefined) updateData.maxBranches = data.maxBranches
    if (data.features !== undefined) updateData.features = data.features as Prisma.InputJsonValue
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const updated = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'plan.update',
      resourceType: 'SubscriptionPlan',
      resourceId: planId,
      metadata: { previous: plan, updated: updateData },
    })

    return {
      ...updated,
      priceMonthly: Number(updated.priceMonthly),
      priceAnnual: Number(updated.priceAnnual),
    }
  }

  async assignSubscriptionToBusiness(
    businessId: string,
    data: {
      planId: string
      status?: SubscriptionStatus
      billingInterval?: BillingInterval
      durationMonths?: number
      paymentProvider?: string
    },
    actor: { id: string; email: string; role: any }
  ) {
    const [business, plan] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.subscriptionPlan.findUnique({ where: { id: data.planId } }),
    ])

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND')
    }
    if (!plan) {
      throw new AppError('Subscription plan not found', 404, 'NOT_FOUND')
    }

    const duration = data.durationMonths || (data.billingInterval === 'ANNUAL' ? 12 : 1)
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + duration)

    const subscription = await prisma.businessSubscription.upsert({
      where: { businessId },
      update: {
        planId: plan.id,
        status: data.status || SubscriptionStatus.ACTIVE,
        billingInterval: data.billingInterval || BillingInterval.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentProvider: data.paymentProvider || 'MANUAL_OVERRIDE',
      },
      create: {
        businessId,
        planId: plan.id,
        status: data.status || SubscriptionStatus.ACTIVE,
        billingInterval: data.billingInterval || BillingInterval.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentProvider: data.paymentProvider || 'MANUAL_OVERRIDE',
      },
      include: { plan: true },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'business.subscription_assigned',
      resourceType: 'BusinessSubscription',
      resourceId: subscription.id,
      businessId,
      metadata: {
        planCode: plan.code,
        status: subscription.status,
        billingInterval: subscription.billingInterval,
        currentPeriodEnd: periodEnd,
      },
    })

    return subscription
  }
}

export const platformSubscriptionService = new PlatformSubscriptionService()
