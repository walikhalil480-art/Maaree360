import { prisma } from '../db/prisma.js'
import { BusinessStatus, Role, SubscriptionStatus } from '@prisma/client'

export class PlatformOverviewService {
  async getOverviewMetrics() {
    const now = new Date()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const [
      totalBusinesses,
      activeBusinesses,
      trialBusinesses,
      suspendedBusinesses,
      deactivatedBusinesses,
      totalUsers,
      totalPlatformAdmins,
      distinctOwners,
      distinctManagers,
      distinctCashiers,
      distinctActiveSessionUsers,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      pastDueSubscriptions,
      upcomingRenewals,
      allActiveSubs,
      plans,
      recentBusinesses,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { status: BusinessStatus.ACTIVE } }),
      prisma.business.count({ where: { status: BusinessStatus.TRIAL } }),
      prisma.business.count({ where: { status: BusinessStatus.SUSPENDED } }),
      prisma.business.count({ where: { status: BusinessStatus.DEACTIVATED } }),
      prisma.user.count(),
      prisma.platformAdmin.count({ where: { isActive: true } }),
      prisma.businessMembership.findMany({
        where: { role: Role.OWNER },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.businessMembership.findMany({
        where: { role: Role.MANAGER },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.businessMembership.findMany({
        where: { role: Role.CASHIER },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.session.findMany({
        where: { expiresAt: { gt: now } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.businessSubscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.businessSubscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      prisma.businessSubscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      prisma.businessSubscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      prisma.businessSubscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      prisma.businessSubscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: { lte: thirtyDaysFromNow, gte: now },
        },
      }),
      prisma.businessSubscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { plan: true },
      }),
      prisma.subscriptionPlan.findMany({
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
      }),
      prisma.business.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          memberships: {
            where: { role: Role.OWNER },
            include: {
              user: {
                select: { name: true, email: true },
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
      prisma.platformAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Calculate actual Monthly Recurring Revenue (MRR) from active paid subscriptions
    let mrr = 0
    for (const sub of allActiveSubs) {
      // Exclude free trial plans with price 0
      const monthly = Number(sub.plan.priceMonthly)
      const annual = Number(sub.plan.priceAnnual)

      if (sub.billingInterval === 'MONTHLY' && monthly > 0) {
        mrr += monthly
      } else if (sub.billingInterval === 'ANNUAL' && annual > 0) {
        mrr += annual / 12
      }
    }

    // Plan distribution
    const planDistribution = plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      subscriberCount: p._count.subscriptions,
      priceMonthly: Number(p.priceMonthly),
    }))

    return {
      metrics: {
        businesses: {
          total: totalBusinesses,
          active: activeBusinesses,
          trial: trialBusinesses,
          suspended: suspendedBusinesses,
          deactivated: deactivatedBusinesses,
        },
        users: {
          total: totalUsers,
          platformAdmins: totalPlatformAdmins,
          owners: distinctOwners.length,
          managers: distinctManagers.length,
          cashiers: distinctCashiers.length,
          activeSessionUsers: distinctActiveSessionUsers.length,
        },
        subscriptions: {
          active: activeSubscriptions,
          trial: trialSubscriptions,
          expired: expiredSubscriptions,
          cancelled: cancelledSubscriptions,
          pastDue: pastDueSubscriptions,
          upcomingRenewals,
          mrr: Math.round(mrr),
          currency: 'KES',
        },
      },
      planDistribution,
      recentBusinesses: recentBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        status: b.status,
        createdAt: b.createdAt,
        userCount: b._count.memberships,
        productCount: b._count.products,
        salesCount: b._count.sales,
        branchCount: b._count.registers || 1,
        ownerName: b.memberships[0]?.user?.name || 'Unassigned',
        planName: b.subscription?.plan.name || 'Unassigned',
      })),
      recentAuditLogs,
    }
  }
}

export const platformOverviewService = new PlatformOverviewService()
