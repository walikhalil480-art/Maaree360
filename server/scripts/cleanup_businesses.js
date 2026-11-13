import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const KEEP_BUSINESS_IDS = [
  'dcf9ee62-dbed-4ae9-9c1d-ec46f0e24031', // Khalil Academy
  'eb97f794-9d2b-4b54-86f7-bb39f236da79', // RAQIIS ELECTRONICS
  '42ad11d2-69b1-4dc1-85ea-a49ed874eeab', // City General Shop
  '1f7894e6-f0c4-4c82-b2ae-28a8a9d81479', // Shabeele Whole Sellers
]

async function main() {
  console.log('=== VERIFYING BUSINESSES TO KEEP ===')
  const keepBusinesses = await prisma.business.findMany({
    where: { id: { in: KEEP_BUSINESS_IDS } },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      subscription: { include: { plan: true } },
      _count: {
        select: {
          products: true,
          sales: true,
          memberships: true,
          registers: true,
        },
      },
    },
  })

  for (const b of keepBusinesses) {
    console.log(`[KEEP] ${b.name} (${b.id}) - Members: ${b.memberships.map((m) => `${m.user.name} <${m.user.email}> [${m.role}]`).join(', ')}`)
  }

  const toDelete = await prisma.business.findMany({
    where: { id: { notIn: KEEP_BUSINESS_IDS } },
    select: { id: true },
  })

  const delIds = toDelete.map((b) => b.id)
  console.log(`\nFound ${delIds.length} businesses to delete. Performing dependency-ordered deletion...`)

  if (delIds.length > 0) {
    // 1. Returns & Sales
    await prisma.saleReturnItem.deleteMany({
      where: { saleReturn: { businessId: { in: delIds } } },
    })
    await prisma.saleReturn.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.salePayment.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.saleItem.deleteMany({
      where: { sale: { businessId: { in: delIds } } },
    })
    await prisma.sale.deleteMany({
      where: { businessId: { in: delIds } },
    })

    // 2. Stock Movements & Inventory
    await prisma.stockMovement.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.stockLevel.deleteMany({
      where: { businessId: { in: delIds } },
    })

    // 3. Purchase Orders
    await prisma.purchaseOrderReceiptItem.deleteMany({
      where: { receipt: { purchaseOrder: { businessId: { in: delIds } } } },
    })
    await prisma.purchaseOrderReceipt.deleteMany({
      where: { purchaseOrder: { businessId: { in: delIds } } },
    })
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrder: { businessId: { in: delIds } } },
    })
    await prisma.purchaseOrder.deleteMany({
      where: { businessId: { in: delIds } },
    })

    // 4. Products & Codes
    await prisma.productCode.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.product.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.category.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.supplier.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.customer.deleteMany({
      where: { businessId: { in: delIds } },
    })

    // 5. Operations & Shifts
    await prisma.expense.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.staffInvitation.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.cashierShift.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.register.deleteMany({
      where: { businessId: { in: delIds } },
    })

    // 6. Logs & Communications
    await prisma.auditLog.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.aiChatMessage.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.aiConversation.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.paymentTransaction.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.notification.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.alertSetting.deleteMany({
      where: { businessId: { in: delIds } },
    })

    // 7. Roles & Memberships
    await prisma.userRoleAssignment.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.rolePermission.deleteMany({
      where: { role: { businessId: { in: delIds } } },
    })
    await prisma.appRole.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.businessMembership.deleteMany({
      where: { businessId: { in: delIds } },
    })
    await prisma.businessSubscription.deleteMany({
      where: { businessId: { in: delIds } },
    })

    // 8. Delete the businesses
    const deletedBusinesses = await prisma.business.deleteMany({
      where: { id: { in: delIds } },
    })
    console.log(`Successfully deleted ${deletedBusinesses.count} businesses.`);
  }

  // Step 2: Clean up orphaned users
  const orphanedUsers = await prisma.user.findMany({
    where: {
      memberships: { none: {} },
      platformAdmin: null,
    },
    select: { id: true, email: true },
  })
  console.log(`\nFound ${orphanedUsers.length} orphaned users (demo/test accounts with no memberships).`)

  if (orphanedUsers.length > 0) {
    const orphanIds = orphanedUsers.map((u) => u.id)
    await prisma.session.deleteMany({
      where: { userId: { in: orphanIds } },
    })
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: orphanIds } },
    })
    console.log(`Successfully deleted ${deletedUsers.count} orphaned users.`)
  }

  // Step 3: Verify remaining state
  const remainingBusinesses = await prisma.business.findMany({
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      subscription: { include: { plan: true } },
      _count: {
        select: {
          products: true,
          sales: true,
          memberships: true,
          registers: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const remainingUsers = await prisma.user.findMany({
    include: {
      platformAdmin: true,
      memberships: { include: { business: { select: { name: true } } } },
    },
    orderBy: { email: 'asc' },
  })

  console.log('\n=============================================')
  console.log(`REMAINING BUSINESSES (${remainingBusinesses.length}):`)
  console.log('=============================================')
  for (const b of remainingBusinesses) {
    console.log(`• ${b.name} (Slug: /${b.slug})`)
    console.log(`  - Plan: ${b.subscription?.plan.name || 'Unassigned'} (${b.subscription?.status || 'N/A'})`)
    console.log(`  - Products: ${b._count.products}`)
    console.log(`  - Sales: ${b._count.sales}`)
    console.log(`  - Members: ${b.memberships.map((m) => `${m.user.name} <${m.user.email}> [${m.role}]`).join(', ')}`)
  }

  console.log('\n=============================================')
  console.log(`REMAINING USERS (${remainingUsers.length}):`)
  console.log('=============================================')
  for (const u of remainingUsers) {
    const adminTag = u.platformAdmin ? `[PLATFORM ADMIN: ${u.platformAdmin.role}]` : ''
    const stores = u.memberships.map((m) => `${m.business.name} (${m.role})`).join(', ')
    console.log(`• ${u.name} <${u.email}> ${adminTag}`)
    console.log(`  Businesses: ${stores || 'None (Platform-only account)'}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})
