import { prisma } from '../db/prisma.js'

async function main() {
  const [businesses, users, products, categories, stockLevels, sales, customers, suppliers] =
    await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.category.count(),
      prisma.stockLevel.count(),
      prisma.sale.count(),
      prisma.customer.count(),
      prisma.supplier.count(),
    ])

  console.log('--- DATABASE STATS ---')
  console.log(
    JSON.stringify(
      { businesses, users, products, categories, stockLevels, sales, customers, suppliers },
      null,
      2
    )
  )
}

main().finally(() => prisma.$disconnect())
