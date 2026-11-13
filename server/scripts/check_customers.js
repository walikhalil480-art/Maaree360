import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, slug: true }
  })
  console.log('Businesses:', businesses)

  const customers = await prisma.customer.findMany({
    include: { business: { select: { id: true, name: true } } }
  })
  console.log(`\nTotal customers in DB: ${customers.length}`)
  customers.forEach(c => {
    console.log(`- [${c.business.name}] ID: ${c.id} | Name: ${c.name} | Phone: ${c.phone} | BusinessId: ${c.businessId}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
