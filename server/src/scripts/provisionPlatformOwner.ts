import crypto from 'node:crypto'
import { prisma } from '../db/prisma.js'
import { hashPassword } from '../utils/password.js'
import { PlatformRoleType, SubscriptionStatus, BillingInterval } from '@prisma/client'

export async function provisionPlatformOwner(options?: {
  email?: string
  password?: string
  name?: string
}) {
  const email =
    options?.email ||
    process.env.INITIAL_PLATFORM_OWNER_EMAIL ||
    'owner@maaree360.com'
  const name =
    options?.name ||
    process.env.INITIAL_PLATFORM_OWNER_NAME ||
    'MAAREE 360 Platform Owner'
  const password =
    options?.password ||
    process.env.INITIAL_PLATFORM_OWNER_PASSWORD ||
    'Maaree360@Admin2026!'

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🛡️  MAAREE 360 — Platform Administration Provisioning')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Target Email: ${email}`)
  console.log(`Target Name:  ${name}`)

  // 1. Upsert root User
  const passwordHash = await hashPassword(password)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
    },
    create: {
      email,
      name,
      passwordHash,
    },
  })
  console.log(`✅ Root User record ready (ID: ${user.id})`)

  // 2. Upsert PlatformAdmin record with PLATFORM_OWNER role
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { userId: user.id },
    update: {
      role: PlatformRoleType.PLATFORM_OWNER,
      isActive: true,
    },
    create: {
      userId: user.id,
      role: PlatformRoleType.PLATFORM_OWNER,
      isActive: true,
    },
  })
  console.log(`✅ Platform Owner administrative privileges granted (Admin ID: ${platformAdmin.id})`)

  // 3. Seed Default Subscription Plans
  console.log('📦 Seeding default platform subscription plans...')
  const defaultPlans = [
    {
      code: 'trial',
      name: 'Free Trial',
      description: '14-day fully featured evaluation tier for retail businesses.',
      priceMonthly: 0,
      priceAnnual: 0,
      currency: 'KES',
      trialDays: 14,
      maxUsers: 3,
      maxBranches: 1,
      features: {
        pos: true,
        inventory: true,
        barcodeScanner: true,
        advancedReports: false,
        multiBranch: false,
        apiAccess: false,
      },
    },
    {
      code: 'starter',
      name: 'Starter Retail',
      description: 'Single-store standard POS, inventory tracking, and sales analytics.',
      priceMonthly: 2500,
      priceAnnual: 25000,
      currency: 'KES',
      trialDays: 0,
      maxUsers: 5,
      maxBranches: 1,
      features: {
        pos: true,
        inventory: true,
        barcodeScanner: true,
        hardwareIntegration: true,
        advancedReports: false,
        multiBranch: false,
        apiAccess: false,
      },
    },
    {
      code: 'professional',
      name: 'Professional Multi-Store',
      description: 'Designed for growing retailers with multiple branches and staff shifts.',
      priceMonthly: 6500,
      priceAnnual: 65000,
      currency: 'KES',
      trialDays: 0,
      maxUsers: 15,
      maxBranches: 3,
      features: {
        pos: true,
        inventory: true,
        barcodeScanner: true,
        hardwareIntegration: true,
        advancedReports: true,
        multiBranch: true,
        shiftManagement: true,
        stockAlerts: true,
        apiAccess: false,
      },
    },
    {
      code: 'enterprise',
      name: 'Enterprise 360',
      description: 'Unlimited capacity, complete API access, dedicated SLAs, and priority support.',
      priceMonthly: 18000,
      priceAnnual: 180000,
      currency: 'KES',
      trialDays: 0,
      maxUsers: 100,
      maxBranches: 20,
      features: {
        pos: true,
        inventory: true,
        barcodeScanner: true,
        hardwareIntegration: true,
        advancedReports: true,
        multiBranch: true,
        shiftManagement: true,
        stockAlerts: true,
        apiAccess: true,
        customRoles: true,
        prioritySupport: true,
      },
    },
  ]

  const seededPlans: Record<string, string> = {}
  for (const plan of defaultPlans) {
    const record = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        trialDays: plan.trialDays,
        maxUsers: plan.maxUsers,
        maxBranches: plan.maxBranches,
        features: plan.features,
      },
      create: plan,
    })
    seededPlans[plan.code] = record.id
    console.log(`   - Plan [${plan.code}] ${plan.name} (${record.id})`)
  }

  // 4. Ensure all existing businesses have a valid Subscription attached
  const businesses = await prisma.business.findMany({
    include: { subscription: true },
  })
  const proPlanId = seededPlans['professional'] || seededPlans['starter']

  for (const b of businesses) {
    if (!b.subscription && proPlanId) {
      const now = new Date()
      const end = new Date()
      end.setFullYear(now.getFullYear() + 1)

      await prisma.businessSubscription.create({
        data: {
          businessId: b.id,
          planId: proPlanId,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: BillingInterval.ANNUAL,
          currentPeriodStart: now,
          currentPeriodEnd: end,
          paymentProvider: 'MANUAL_OVERRIDE',
        },
      })
      console.log(`   - Attached default subscription to existing business: ${b.name}`)
    }
  }

  // 5. Create immutable platform audit log for bootstrap
  await prisma.platformAuditLog.create({
    data: {
      actorId: platformAdmin.id,
      actorEmail: email,
      actorRole: PlatformRoleType.PLATFORM_OWNER,
      action: 'platform.bootstrap',
      resourceType: 'PlatformAdmin',
      resourceId: platformAdmin.id,
      ipAddress: '127.0.0.1',
      userAgent: 'CLI/ProvisionScript',
      metadata: {
        event: 'Initial Platform Owner provisioned and default subscription plans seeded',
        plansSeeded: Object.keys(seededPlans),
      },
    },
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 Platform Owner Provisioning Complete!')
  console.log(`   Login Email:    ${email}`)
  console.log(`   Admin Level:    PLATFORM_OWNER`)
  console.log(`   Access URL:     /admin`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return { user, platformAdmin }
}

// Allow execution as CLI script
if (process.argv[1] && process.argv[1].endsWith('provisionPlatformOwner.ts')) {
  provisionPlatformOwner()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Provisioning failed:', err)
      process.exit(1)
    })
}
