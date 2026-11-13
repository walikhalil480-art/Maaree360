import { prisma } from '../db/prisma.js'
import { hashPassword } from '../utils/password.js'
import { Role, SubscriptionStatus, BillingInterval } from '@prisma/client'
import { generateSlug } from '../utils/security.js'

export async function setupShabeeleAccounts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏪 Setting up dedicated Shabeele Business Accounts')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const defaultPassword = 'Shabeele@2026!'
  const passwordHash = await hashPassword(defaultPassword)

  // 1. Locate or create "Shabeele Whole Sellers"
  let mainBusiness = await prisma.business.findFirst({
    where: { name: { contains: 'Shabeele Whole Sellers', mode: 'insensitive' } },
  })

  if (!mainBusiness) {
    mainBusiness = await prisma.business.create({
      data: {
        name: 'Shabeele Whole Sellers',
        slug: generateSlug('Shabeele Whole Sellers'),
        currency: 'KES',
        timezone: 'Africa/Nairobi',
      },
    })
    console.log(`Created primary business: ${mainBusiness.name} (${mainBusiness.id})`)
  } else {
    console.log(`Found existing primary business: ${mainBusiness.name} (${mainBusiness.id})`)
  }

  // 2. Locate or create secondary business "Shabeele Retail Branch" for multi-store switching
  let branchBusiness = await prisma.business.findFirst({
    where: { name: { contains: 'Shabeele Retail Branch', mode: 'insensitive' } },
  })

  if (!branchBusiness) {
    branchBusiness = await prisma.business.create({
      data: {
        name: 'Shabeele Retail Branch',
        slug: generateSlug('Shabeele Retail Branch'),
        currency: 'KES',
        timezone: 'Africa/Nairobi',
      },
    })
    console.log(`Created secondary business: ${branchBusiness.name} (${branchBusiness.id})`)
  } else {
    console.log(`Found secondary business: ${branchBusiness.name} (${branchBusiness.id})`)
  }

  // Ensure both businesses have an active subscription
  const plan = await prisma.subscriptionPlan.findFirst({ where: { code: 'professional' } })
  if (plan) {
    for (const b of [mainBusiness, branchBusiness]) {
      const existingSub = await prisma.businessSubscription.findUnique({ where: { businessId: b.id } })
      if (!existingSub) {
        const now = new Date()
        const end = new Date()
        end.setFullYear(now.getFullYear() + 1)
        await prisma.businessSubscription.create({
          data: {
            businessId: b.id,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            billingInterval: BillingInterval.ANNUAL,
            currentPeriodStart: now,
            currentPeriodEnd: end,
            paymentProvider: 'SETUP_SCRIPT',
          },
        })
      }
    }
  }

  // 3. Create/Upsert dedicated Business Owner (Strictly NO platformAdmin)
  const businessOwner = await prisma.user.upsert({
    where: { email: 'owner@shabeele.com' },
    update: {
      name: 'Shabeele Business Owner',
      passwordHash,
    },
    create: {
      email: 'owner@shabeele.com',
      name: 'Shabeele Business Owner',
      passwordHash,
    },
  })
  console.log(`✅ Business Owner: ${businessOwner.email} (ID: ${businessOwner.id})`)

  // 4. Create/Upsert dedicated Branch Manager
  const branchManager = await prisma.user.upsert({
    where: { email: 'manager@shabeele.com' },
    update: {
      name: 'Shabeele Branch Manager',
      passwordHash,
    },
    create: {
      email: 'manager@shabeele.com',
      name: 'Shabeele Branch Manager',
      passwordHash,
    },
  })
  console.log(`✅ Branch Manager: ${branchManager.email} (ID: ${branchManager.id})`)

  // 5. Create/Upsert dedicated Cashier
  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@shabeele.com' },
    update: {
      name: 'Shabeele Cashier',
      passwordHash,
    },
    create: {
      email: 'cashier@shabeele.com',
      name: 'Shabeele Cashier',
      passwordHash,
    },
  })
  console.log(`✅ Cashier: ${cashier.email} (ID: ${cashier.id})`)

  // 6. Assign Memberships
  // Business Owner owns both "Shabeele Whole Sellers" and "Shabeele Retail Branch"
  await prisma.businessMembership.upsert({
    where: {
      id: `${businessOwner.id}-${mainBusiness.id}`,
    },
    update: { role: Role.OWNER, isActive: true },
    create: {
      id: `${businessOwner.id}-${mainBusiness.id}`,
      userId: businessOwner.id,
      businessId: mainBusiness.id,
      role: Role.OWNER,
      isActive: true,
    },
  })
  await prisma.businessMembership.upsert({
    where: {
      id: `${businessOwner.id}-${branchBusiness.id}`,
    },
    update: { role: Role.OWNER, isActive: true },
    create: {
      id: `${businessOwner.id}-${branchBusiness.id}`,
      userId: businessOwner.id,
      businessId: branchBusiness.id,
      role: Role.OWNER,
      isActive: true,
    },
  })

  // Branch Manager only has access to main business
  await prisma.businessMembership.upsert({
    where: {
      id: `${branchManager.id}-${mainBusiness.id}`,
    },
    update: { role: Role.MANAGER, isActive: true },
    create: {
      id: `${branchManager.id}-${mainBusiness.id}`,
      userId: branchManager.id,
      businessId: mainBusiness.id,
      role: Role.MANAGER,
      isActive: true,
    },
  })

  // Cashier only has access to main business
  await prisma.businessMembership.upsert({
    where: {
      id: `${cashier.id}-${mainBusiness.id}`,
    },
    update: { role: Role.CASHIER, isActive: true },
    create: {
      id: `${cashier.id}-${mainBusiness.id}`,
      userId: cashier.id,
      businessId: mainBusiness.id,
      role: Role.CASHIER,
      isActive: true,
    },
  })

  // 7. Remove owner@maaree360.com from Shabeele businesses to enforce strict platform separation
  const platformOwnerUser = await prisma.user.findUnique({ where: { email: 'owner@maaree360.com' } })
  if (platformOwnerUser) {
    const deleted = await prisma.businessMembership.deleteMany({
      where: {
        userId: platformOwnerUser.id,
        businessId: { in: [mainBusiness.id, branchBusiness.id] },
      },
    })
    console.log(`✅ Removed Platform Owner from shop memberships (${deleted.count} removed)`)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 Shabeele Business Accounts Ready:')
  console.log(`   Business Owner:   owner@shabeele.com   (Password: ${defaultPassword})`)
  console.log(`   Branch Manager:   manager@shabeele.com (Password: ${defaultPassword})`)
  console.log(`   Cashier:          cashier@shabeele.com (Password: ${defaultPassword})`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

setupShabeeleAccounts()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Failed to setup accounts:', e)
    process.exit(1)
  })
