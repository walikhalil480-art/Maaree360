import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from '../db/prisma.js'
import { Role, ProductCodeType, StockMovementType, Prisma } from '@prisma/client'
import { InventoryService } from '../services/inventory.service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const inventoryService = new InventoryService()

interface SupermarketProductItem {
  sku: string
  name: string
  brand: string
  categoryName: string
  packageSize: string
  unit: string
  costPrice: number
  sellingPrice: number
  minStockThreshold: number
  initialStock: number
  barcode: string
  description: string
  imageFilename: string
  imageUrl: string
  imageStatus: string
}

function determineCodeType(code: string): ProductCodeType {
  const clean = code.trim()
  if (/^\d{13}$/.test(clean)) return ProductCodeType.EAN_13
  if (/^\d{12}$/.test(clean)) return ProductCodeType.UPC_A
  if (/^\d{8}$/.test(clean)) return ProductCodeType.EAN_8
  return ProductCodeType.CODE_128
}

export async function seedSupermarketCatalog() {
  console.log('=================================================================')
  console.log('SmartStock Supermarket Product Catalog Seeder')
  console.log('200+ Products with Real Supermarket Packshot Photography')
  console.log('=================================================================\n')

  // 1. Load Catalog Dataset
  const catalogPath = path.resolve(__dirname, '../data/supermarketProducts.json')
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catalog dataset not found at: ${catalogPath}`)
  }
  const rawData = fs.readFileSync(catalogPath, 'utf-8')
  const products: SupermarketProductItem[] = JSON.parse(rawData)
  console.log(`Loaded ${products.length} products from catalog dataset.`)

  // 2. Identify target user
  let user = await prisma.user.findFirst({
    where: { email: 'walikhalil480@gmail.com' },
  })
  if (!user) {
    user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    })
  }
  if (!user) {
    throw new Error('No user account found to attribute inventory actions.')
  }
  console.log(`Inventory actions attributed to user: ${user.name} (${user.email})\n`)

  // 3. Identify target businesses
  const targetBusinesses = await prisma.business.findMany({
    where: {
      OR: [
        { name: 'SmartStock Demo Mini-Mart' },
        { name: 'Khalil Academy' },
      ],
    },
  })

  if (targetBusinesses.length === 0) {
    // If neither exists, pick the first business
    const defaultBusiness = await prisma.business.findFirst({
      orderBy: { createdAt: 'asc' },
    })
    if (!defaultBusiness) {
      throw new Error('No business found in database.')
    }
    targetBusinesses.push(defaultBusiness)
  }

  for (const business of targetBusinesses) {
    console.log(`\n-----------------------------------------------------------------`)
    console.log(`Processing Business: "${business.name}" (${business.id})`)
    console.log(`-----------------------------------------------------------------`)

    // A. Reconcile Categories
    const categoryNames = Array.from(new Set(products.map((p) => p.categoryName)))
    const categoryMap = new Map<string, string>()
    let categoriesCreated = 0
    let categoriesExisting = 0

    for (const catName of categoryNames) {
      let cat = await prisma.category.findUnique({
        where: {
          businessId_name: {
            businessId: business.id,
            name: catName,
          },
        },
      })

      if (!cat) {
        cat = await prisma.category.create({
          data: {
            businessId: business.id,
            name: catName,
            description: `${catName} packaged retail products and groceries.`,
          },
        })
        categoriesCreated++
      } else {
        categoriesExisting++
      }
      categoryMap.set(catName, cat.id)
    }
    console.log(`Categories: ${categoriesCreated} created, ${categoriesExisting} existing. Total: ${categoryMap.size}`)

    // B. Upsert Products & Reconcile Images
    let productsCreated = 0
    let productsUpdated = 0
    let codesCreated = 0
    let codesExisting = 0
    let stockRecorded = 0
    let stockPreserved = 0

    for (const item of products) {
      const categoryId = categoryMap.get(item.categoryName)
      if (!categoryId) {
        console.warn(`Category not found for product ${item.sku}: ${item.categoryName}`)
        continue
      }

      const existingProduct = await prisma.product.findUnique({
        where: {
          businessId_sku: {
            businessId: business.id,
            sku: item.sku,
          },
        },
      })

      let product
      if (!existingProduct) {
        product = await prisma.product.create({
          data: {
            businessId: business.id,
            sku: item.sku,
            name: item.name,
            brand: item.brand,
            description: item.description,
            categoryId,
            unit: item.unit,
            costPrice: new Prisma.Decimal(item.costPrice),
            sellingPrice: new Prisma.Decimal(item.sellingPrice),
            minStockThreshold: item.minStockThreshold,
            imageUrl: item.imageUrl,
            isActive: true,
          },
        })
        productsCreated++
      } else {
        // Update product metadata & ensure imageUrl is populated
        product = await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: item.name,
            brand: item.brand,
            description: item.description,
            categoryId,
            unit: item.unit,
            costPrice: new Prisma.Decimal(item.costPrice),
            sellingPrice: new Prisma.Decimal(item.sellingPrice),
            minStockThreshold: item.minStockThreshold,
            imageUrl: item.imageUrl,
            isActive: true,
          },
        })
        productsUpdated++
      }

      // C. Barcode registration
      if (item.barcode) {
        const existingCode = await prisma.productCode.findUnique({
          where: {
            businessId_code: {
              businessId: business.id,
              code: item.barcode,
            },
          },
        })

        if (!existingCode) {
          await prisma.productCode.create({
            data: {
              businessId: business.id,
              productId: product.id,
              code: item.barcode,
              type: determineCodeType(item.barcode),
            },
          })
          codesCreated++
        } else {
          // If code was pointing to a different product or already exists
          codesExisting++
        }
      }

      // D. Opening Stock Level through Inventory Ledger
      const existingMovement = await prisma.stockMovement.findFirst({
        where: {
          businessId: business.id,
          productId: product.id,
          type: StockMovementType.OPENING_STOCK,
        },
      })

      if (!existingMovement) {
        await inventoryService.recordOpeningStock(business.id, product.id, user.id, {
          quantity: item.initialStock,
          notes: `Opening inventory balance for ${item.name} (${item.sku})`,
        })
        stockRecorded++
      } else {
        stockPreserved++
      }
    }

    console.log(`Products:   ${productsCreated} created, ${productsUpdated} updated with photos (Total: ${productsCreated + productsUpdated})`)
    console.log(`Barcodes:   ${codesCreated} created, ${codesExisting} existing`)
    console.log(`Inventory:  ${stockRecorded} opening stock movements recorded, ${stockPreserved} preserved`)
  }

  console.log('\n=================================================================')
  console.log('SUPERMARKET CATALOG SEEDING COMPLETED SUCCESSFULLY!')
  console.log('=================================================================\n')
}

// Direct execution
if (process.argv[1]?.endsWith('seedSupermarketCatalog.ts')) {
  seedSupermarketCatalog()
    .then(() => {
      console.log('Done.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seeding failed:', err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
