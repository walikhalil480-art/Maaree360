import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from '../db/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function verifySupermarketCatalog() {
  console.log('=================================================================')
  console.log('SmartStock Supermarket Product Photography Verification')
  console.log('=================================================================\n')

  const business = await prisma.business.findFirst({
    where: { name: 'SmartStock Demo Mini-Mart' },
  })

  if (!business) {
    throw new Error('Business "SmartStock Demo Mini-Mart" not found!')
  }

  const businessId = business.id
  console.log(`Checking Business: ${business.name} (${businessId})`)

  let failedChecks = 0

  function pass(title: string, details?: string) {
    console.log(`[PASS] ${title}${details ? ` (${details})` : ''}`)
  }

  function fail(title: string, error: string) {
    console.error(`[FAIL] ${title} - ${error}`)
    failedChecks++
  }

  // 1. Fetch all products
  const products = await prisma.product.findMany({
    where: { businessId },
    include: {
      category: true,
      stockLevel: true,
      codes: true,
      stockMovements: true,
    },
    orderBy: { sku: 'asc' },
  })

  // Check 1: Product count >= 200
  if (products.length >= 200) {
    pass('Catalog Product Count', `${products.length} products found in database`)
  } else {
    fail('Catalog Product Count', `Expected at least 200 products, found ${products.length}`)
  }

  // Check 2: SKU uniqueness
  const skus = products.map((p) => p.sku)
  const uniqueSkus = new Set(skus)
  if (uniqueSkus.size === products.length) {
    pass('SKU Uniqueness', `All ${uniqueSkus.size} SKUs are unique`)
  } else {
    fail('SKU Uniqueness', `Duplicate SKUs found! ${uniqueSkus.size} unique of ${products.length}`)
  }

  // Check 3: Every product has a valid category
  const noCategory = products.filter((p) => !p.category)
  if (noCategory.length === 0) {
    const categories = new Set(products.map((p) => p.category?.name))
    pass('Category Mapping', `All ${products.length} products mapped across ${categories.size} categories`)
  } else {
    fail('Category Mapping', `${noCategory.length} products missing category`)
  }

  // Check 4: Real product photography on disk
  const publicProductsDir = path.resolve(__dirname, '../../../client/public')
  let withValidImage = 0
  let missingImageFile = 0
  let noImageUrl = 0

  for (const p of products) {
    if (!p.imageUrl) {
      noImageUrl++
      continue
    }
    const relativePath = p.imageUrl.startsWith('/') ? p.imageUrl.slice(1) : p.imageUrl
    const absolutePath = path.join(publicProductsDir, relativePath)
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).size > 1000) {
      withValidImage++
    } else {
      missingImageFile++
    }
  }

  if (noImageUrl === 0 && missingImageFile === 0) {
    pass('Product Photography', `All ${withValidImage}/${products.length} products have verified local images on disk`)
  } else {
    fail('Product Photography', `Images missing: ${noImageUrl} have no imageUrl, ${missingImageFile} files missing on disk`)
  }

  // Check 5: Barcode registration
  const withCodes = products.filter((p) => p.codes && p.codes.length > 0)
  if (withCodes.length === products.length) {
    pass('Barcode Codes', `All ${products.length} products have at least one barcode registered`)
  } else {
    fail('Barcode Codes', `${products.length - withCodes.length} products have no registered barcode`)
  }

  // Check 6: Stock level & ledger integrity
  const withStock = products.filter((p) => p.stockLevel !== null)
  const positiveStock = products.filter((p) => p.stockLevel && Number(p.stockLevel.quantity) > 0)
  if (withStock.length === products.length) {
    pass('Inventory Ledger', `All ${products.length} products have initialized stock levels (${positiveStock.length} in stock)`)
  } else {
    fail('Inventory Ledger', `${products.length - withStock.length} products lack stockLevel records`)
  }

  // Check 7: Price sanity (sellingPrice > costPrice > 0)
  const validPricing = products.filter(
    (p) => Number(p.sellingPrice) > Number(p.costPrice) && Number(p.costPrice) > 0
  )
  if (validPricing.length === products.length) {
    pass('Price Integrity', `All ${products.length} products have positive margins (sellingPrice > costPrice > 0)`)
  } else {
    fail('Price Integrity', `${products.length - validPricing.length} products have invalid price/margin`)
  }

  // Summary
  console.log('\n=================================================================')
  if (failedChecks === 0) {
    console.log(`ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! (${products.length} products ready)`)
  } else {
    console.error(`VERIFICATION FAILED WITH ${failedChecks} ERRORS!`)
  }
  console.log('=================================================================\n')

  return failedChecks === 0
}

// Direct execution
if (process.argv[1]?.endsWith('verifySupermarketCatalog.ts')) {
  verifySupermarketCatalog()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((err) => {
      console.error('Verification error:', err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
