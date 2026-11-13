import { prisma } from '../db/prisma.js'

async function main() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          products: true,
          categories: true,
          memberships: true,
        },
      },
    },
  })
  console.log('--- REGISTERED BUSINESSES ---')
  console.log(JSON.stringify(businesses, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
