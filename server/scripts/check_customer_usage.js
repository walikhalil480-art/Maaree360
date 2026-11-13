import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const customers = await prisma.customer.findMany({
    include: {
      business: { select: { name: true } },
      _count: { select: { sales: true, returns: true } }
    }
  })

  console.log('Customer sales & returns breakdown:')
  customers.forEach(c => {
    console.log(`[${c.business.name}] ID: ${c.id} | Name: ${c.name} | Sales: ${c._count.sales} | Returns: ${c._count.returns}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
