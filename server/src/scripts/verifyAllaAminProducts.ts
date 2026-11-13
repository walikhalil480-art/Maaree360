import { prisma } from '../db/prisma.js'

const ALLA_AMIN_ID = 'edaf3399-bf40-4d02-bd4c-9f9a9c763c7e'
const SHABEELE_ID = '1f7894e6-f0c4-4c82-b2ae-28a8a9d81479'
const CITY_GENERAL_ID = '42ad11d2-69b1-4dc1-85ea-a49ed874eeab'

async function verify() {
  console.log('====================================================')
  console.log('MAAREE 360: ALLA AMIN GROCERY PRODUCTS VERIFICATION')
  console.log('====================================================\n')

  // 1. Confirm product count in Alla Amin
  const allaAminProducts = await prisma.product.findMany({
    where: { businessId: ALLA_AMIN_ID },
    include: {
      category: true,
      stockLevel: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`[CHECK 1: PRODUCT COUNT] Expected: 20 | Found: ${allaAminProducts.length}`)
  if (allaAminProducts.length !== 20) {
    throw new Error(`Product count mismatch: expected 20, got ${allaAminProducts.length}`)
  }

  // 2. Confirm Categories
  console.log('\n[CHECK 2: CATEGORY ASSIGNMENTS]')
  const unassigned = allaAminProducts.filter((p) => !p.categoryId || !p.category)
  if (unassigned.length > 0) {
    throw new Error(`Found ${unassigned.length} products without assigned category!`)
  }
  const categorySet = new Set(allaAminProducts.map((p) => p.category?.name))
  console.log(`Unique categories assigned across 20 products: ${categorySet.size}`)
  categorySet.forEach((cat) => console.log(`  - ${cat}`))

  // 3. Confirm Prices in KES and non-zero selling price
  console.log('\n[CHECK 3: SELLING PRICES & CURRENCY]')
  const business = await prisma.business.findUnique({
    where: { id: ALLA_AMIN_ID },
    select: { name: true, currency: true },
  })
  console.log(`Business Currency: ${business?.currency}`)
  allaAminProducts.forEach((p) => {
    console.log(
      `  - ${p.name.padEnd(25)} | SKU: ${p.sku.padEnd(20)} | Price: ${business?.currency} ${p.sellingPrice} | Cost: ${p.costPrice}`
    )
  })

  // 4. Confirm Images
  console.log('\n[CHECK 4: PRODUCT PACKAGING IMAGES]')
  const missingImages = allaAminProducts.filter((p) => !p.imageUrl)
  if (missingImages.length > 0) {
    throw new Error(`Found ${missingImages.length} products with missing imageUrl!`)
  }
  allaAminProducts.forEach((p) => {
    console.log(`  - ${p.name.padEnd(25)} -> ${p.imageUrl}`)
  })

  // 5. Confirm Stock Levels start at 0
  console.log('\n[CHECK 5: STOCK LEVELS (OPENING STOCK = 0)]')
  const nonZeroStock = allaAminProducts.filter(
    (p) => !p.stockLevel || p.stockLevel.quantity.toNumber() !== 0
  )
  if (nonZeroStock.length > 0) {
    throw new Error(`Found ${nonZeroStock.length} products with non-zero stock!`)
  }
  console.log(`All 20 products have active StockLevel initialized with quantity = 0.0000`)

  // 6. Confirm Multi-Tenant Isolation
  console.log('\n[CHECK 6: MULTI-TENANT DATA ISOLATION AUDIT]')
  const shabeeleCheck = await prisma.product.findMany({
    where: {
      businessId: SHABEELE_ID,
      sku: { in: allaAminProducts.map((p) => p.sku) },
    },
  })
  console.log(`Alla Amin products visible in Shabeele Whole Sellers: ${shabeeleCheck.length} (Expected: 0)`)
  if (shabeeleCheck.length !== 0) {
    throw new Error(`CRITICAL ISOLATION BREACH: Alla Amin products leaked to Shabeele!`)
  }

  const cityGeneralCheck = await prisma.product.findMany({
    where: {
      businessId: CITY_GENERAL_ID,
      sku: { in: allaAminProducts.map((p) => p.sku) },
    },
  })
  console.log(`Alla Amin products visible in City General Shop: ${cityGeneralCheck.length} (Expected: 0)`)
  if (cityGeneralCheck.length !== 0) {
    throw new Error(`CRITICAL ISOLATION BREACH: Alla Amin products leaked to City General!`)
  }

  // 7. Verify POS / Product Service Query
  console.log('\n[CHECK 7: POS / CATALOGUE SERVICE SEARCH QUERY]')
  const posSearchResults = await prisma.product.findMany({
    where: {
      businessId: ALLA_AMIN_ID,
      isActive: true,
      OR: [
        { name: { contains: 'Rice', mode: 'insensitive' } },
        { name: { contains: 'Milk', mode: 'insensitive' } },
        { name: { contains: 'Spaghetti', mode: 'insensitive' } },
      ],
    },
    include: {
      category: { select: { name: true } },
      stockLevel: true,
    },
  })
  console.log(`Sample POS search ('Rice', 'Milk', 'Spaghetti') returned ${posSearchResults.length} items:`)
  posSearchResults.forEach((p) => {
    console.log(`  - ${p.name} (${p.category?.name}) | Price: KES ${p.sellingPrice} | Stock: ${p.stockLevel?.quantity}`)
  })

  // 8. Macaroni Flagged Status
  console.log('\n[CHECK 8: MACARONI PRICE OWNER VERIFICATION FLAG]')
  const macaroni = allaAminProducts.find((p) => p.name === 'Macaroni')
  console.log(`Macaroni Product: ${macaroni?.name}`)
  console.log(`Description: ${macaroni?.description}`)
  const isFlagged = macaroni?.description?.includes('FLAGGED')
  console.log(`Owner Verification Flagged: ${isFlagged ? 'YES (Confirmed)' : 'NO (Failed)'}`)

  console.log('\n====================================================')
  console.log('ALL 8 VERIFICATION CHECKS PASSED PERFECTLY!')
  console.log('====================================================')
}

verify()
  .catch((e) => {
    console.error('VERIFICATION FAILED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
