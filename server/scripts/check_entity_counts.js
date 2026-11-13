import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const businesses = await prisma.business.findMany({
    include: {
      _count: {
        select: {
          products: true,
          suppliers: true,
          sales: true,
          purchaseOrders: true,
          customers: true,
          expenses: true,
        }
      }
    }
  })

  console.log('--- Summary per Business ---')
  businesses.forEach(b => {
    console.log(`\nStore: ${b.name} (${b.id})`)
    console.log(`- Customers: ${b._count.customers}`)
    console.log(`- Products: ${b._count.products}`)
    console.log(`- Suppliers: ${b._count.suppliers}`)
    console.log(`- Sales: ${b._count.sales}`)
    console.log(`- Purchase Orders: ${b._count.purchaseOrders}`)
    console.log(`- Expenses: ${b._count.expenses}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
