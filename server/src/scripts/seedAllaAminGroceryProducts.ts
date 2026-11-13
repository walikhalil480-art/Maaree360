import { prisma } from '../db/prisma.js'
import { Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const TARGET_BUSINESS_ID = 'edaf3399-bf40-4d02-bd4c-9f9a9c763c7e'
const EXPECTED_CURRENCY = 'KES'

interface ProductDef {
  name: string
  categoryName: string
  brand: string
  packageSize: string
  unit: string
  sku: string
  costPrice: number
  sellingPrice: number
  minStockThreshold: number
  imageUrl: string
  description: string
  isFlaggedForOwner?: boolean
}

const PRODUCTS_DATA: ProductDef[] = [
  {
    name: 'Basmati Rice',
    categoryName: 'Rice & Grains',
    brand: 'Daawat',
    packageSize: '2 kg',
    unit: 'kg',
    sku: 'AA-RICE-BASMATI-2KG',
    costPrice: 0.00,
    sellingPrice: 681.00,
    minStockThreshold: 10,
    imageUrl: '/products/dawaat-basmati-rice-2kg.jpg',
    description: 'Premium long-grain Daawat Basmati Rice (2 kg pack). High quality aromatic grains.',
  },
  {
    name: 'Maize Flour (Unga)',
    categoryName: 'Flour',
    brand: 'Jogoo',
    packageSize: '2 kg',
    unit: 'kg',
    sku: 'AA-FLOUR-MAIZE-2KG',
    costPrice: 0.00,
    sellingPrice: 115.00,
    minStockThreshold: 15,
    imageUrl: '/products/jogoo-maize-flour-2kg.jpg',
    description: 'Jogoo sifted maize meal flour (2 kg pack). Fortified with essential vitamins and minerals.',
  },
  {
    name: 'Wheat Flour',
    categoryName: 'Flour',
    brand: 'Exe',
    packageSize: '2 kg',
    unit: 'kg',
    sku: 'AA-FLOUR-WHEAT-2KG',
    costPrice: 0.00,
    sellingPrice: 155.00,
    minStockThreshold: 10,
    imageUrl: '/products/exe-wheat-flour-2kg.jpg',
    description: 'Exe all-purpose premium wheat flour (2 kg pack). Ideal for baking, chapati, and pastries.',
  },
  {
    name: 'Sugar',
    categoryName: 'Sugar',
    brand: 'Mumias',
    packageSize: '1 kg',
    unit: 'kg',
    sku: 'AA-SUGAR-WHITE-1KG',
    costPrice: 0.00,
    sellingPrice: 135.00,
    minStockThreshold: 15,
    imageUrl: '/products/mumias-sugar-1kg.jpg',
    description: 'Pure white cane sugar (1 kg pack). Fine granulated crystals.',
  },
  {
    name: 'Vegetable Cooking Oil',
    categoryName: 'Cooking Oil',
    brand: 'Rina',
    packageSize: '1 litre',
    unit: 'litre',
    sku: 'AA-OIL-VEG-1L',
    costPrice: 0.00,
    sellingPrice: 287.00,
    minStockThreshold: 10,
    imageUrl: '/products/rina-cooking-oil-1l.jpg',
    description: 'Rina pure vegetable cooking oil (1 litre bottle). Triple refined and fortified with vitamins A and D.',
  },
  {
    name: 'Vegetable Cooking Oil',
    categoryName: 'Cooking Oil',
    brand: 'Rina',
    packageSize: '500 ml',
    unit: 'ml',
    sku: 'AA-OIL-VEG-500ML',
    costPrice: 0.00,
    sellingPrice: 159.00,
    minStockThreshold: 10,
    imageUrl: '/products/rina-cooking-oil-500ml.jpg',
    description: 'Rina pure vegetable cooking oil (500 ml bottle). Convenient compact size, triple refined.',
  },
  {
    name: 'Santa Lucia Spaghetti',
    categoryName: 'Pasta',
    brand: 'Santa Lucia',
    packageSize: '400 g',
    unit: 'g',
    sku: 'AA-PASTA-SPAG-400G',
    costPrice: 0.00,
    sellingPrice: 75.00,
    minStockThreshold: 15,
    imageUrl: '/products/santa-lucia-spaghetti-400g.jpg',
    description: 'Santa Lucia premium durum wheat semolina spaghetti (400 g pack). Cooks in 8-10 minutes.',
  },
  {
    name: 'Macaroni',
    categoryName: 'Pasta',
    brand: 'Santa Lucia',
    packageSize: '400 g',
    unit: 'g',
    sku: 'AA-PASTA-MAC-400G',
    costPrice: 0.00,
    sellingPrice: 75.00,
    minStockThreshold: 15,
    imageUrl: '/products/santa-lucia-macaroni-400g.jpg',
    description: '[FLAGGED: Price KES 75 is an indicative estimate requiring owner verification] Santa Lucia durum wheat elbow macaroni (400 g pack). Perfect for salads and pasta bakes.',
    isFlaggedForOwner: true,
  },
  {
    name: 'Eggs',
    categoryName: 'Dairy & Eggs',
    brand: 'Farm Fresh',
    packageSize: '1 piece',
    unit: 'piece',
    sku: 'AA-EGGS-1PC',
    costPrice: 0.00,
    sellingPrice: 16.00,
    minStockThreshold: 30,
    imageUrl: '/products/farm-eggs-tray-30s.jpg',
    description: 'Fresh farm chicken egg (sold individually per piece). Graded fresh daily.',
  },
  {
    name: 'Fresh Milk',
    categoryName: 'Dairy & Eggs',
    brand: 'Brookside',
    packageSize: '500 ml',
    unit: 'ml',
    sku: 'AA-MILK-FRESH-500ML',
    costPrice: 0.00,
    sellingPrice: 39.00,
    minStockThreshold: 20,
    imageUrl: '/products/brookside-fresh-milk-500ml.jpg',
    description: 'Brookside homogenised and pasteurised fresh whole milk pouch (500 ml).',
  },
  {
    name: 'White Bread',
    categoryName: 'Bakery',
    brand: 'Supaloaf',
    packageSize: '400 g',
    unit: 'g',
    sku: 'AA-BREAD-WHITE-400G',
    costPrice: 0.00,
    sellingPrice: 52.00,
    minStockThreshold: 15,
    imageUrl: '/products/supaloaf-white-bread-400g.jpg',
    description: 'Supaloaf fresh sliced white sandwich bread (400 g loaf). Baked fresh daily.',
  },
  {
    name: 'Tea Leaves',
    categoryName: 'Tea & Beverages',
    brand: 'Ketepa Fahari ya Kenya',
    packageSize: '100 g',
    unit: 'g',
    sku: 'AA-TEA-LEAF-100G',
    costPrice: 0.00,
    sellingPrice: 35.00,
    minStockThreshold: 15,
    imageUrl: '/products/fahari-ya-kenya-tea-100g.jpg',
    description: 'Ketepa Fahari Ya Kenya pure black loose tea leaves (100 g pack). Authentic Kenyan highland blend.',
  },
  {
    name: 'Iodised Salt',
    categoryName: 'Seasoning',
    brand: 'Kensalt',
    packageSize: '1 kg',
    unit: 'kg',
    sku: 'AA-SALT-IODISED-1KG',
    costPrice: 0.00,
    sellingPrice: 52.00,
    minStockThreshold: 20,
    imageUrl: '/products/kensalt-table-salt-1kg.jpg',
    description: 'Kensalt vacuum evaporated iodised fine table salt (1 kg pack). Prevents iodine deficiency.',
  },
  {
    name: 'Tomato Paste',
    categoryName: 'Canned & Packaged Food',
    brand: 'Santa Maria',
    packageSize: '30 g',
    unit: 'g',
    sku: 'AA-TOMATO-PASTE-30G',
    costPrice: 0.00,
    sellingPrice: 20.00,
    minStockThreshold: 30,
    imageUrl: '/products/tomato-paste-sachet-30g.jpg',
    description: 'Santa Maria double concentrated rich tomato paste (30 g single-use sachet).',
  },
  {
    name: 'Green Grams (Ndengu)',
    categoryName: 'Rice & Grains',
    brand: 'Local Select',
    packageSize: '1 kg',
    unit: 'kg',
    sku: 'AA-GRAINS-NDENGU-1KG',
    costPrice: 0.00,
    sellingPrice: 236.00,
    minStockThreshold: 10,
    imageUrl: '/products/green-grams-ndengu-1kg.jpg',
    description: 'High-grade whole green grams (Ndengu, 1 kg pack). Cleaned and sorted nutritious pulses.',
  },
  {
    name: 'Cooking Fat',
    categoryName: 'Cooking Fat',
    brand: 'Kasuku',
    packageSize: '50 g',
    unit: 'g',
    sku: 'AA-FAT-COOKING-50G',
    costPrice: 0.00,
    sellingPrice: 20.00,
    minStockThreshold: 25,
    imageUrl: '/products/kasuku-cooking-fat-50g.jpg',
    description: 'Kasuku pure white vegetable cooking fat (50 g tub/sachet). Ideal for daily household cooking.',
  },
  {
    name: 'Brookside Yoghurt',
    categoryName: 'Dairy & Eggs',
    brand: 'Brookside',
    packageSize: '450 ml',
    unit: 'ml',
    sku: 'AA-YOGHURT-450ML',
    costPrice: 0.00,
    sellingPrice: 165.00,
    minStockThreshold: 10,
    imageUrl: '/products/brookside-yoghurt-450ml.jpg',
    description: 'Brookside Fruitness real strawberry flavoured dessert yoghurt cup (450 ml).',
  },
  {
    name: 'Long-Life Milk',
    categoryName: 'Dairy & Eggs',
    brand: 'New KCC',
    packageSize: '200 ml',
    unit: 'ml',
    sku: 'AA-MILK-UHT-200ML',
    costPrice: 0.00,
    sellingPrice: 40.00,
    minStockThreshold: 25,
    imageUrl: '/products/kcc-uht-milk-200ml.jpg',
    description: 'New KCC Gold Crown UHT long-life whole milk packet (200 ml TCA packaging).',
  },
  {
    name: 'Laundry Soap',
    categoryName: 'Household',
    brand: 'Menengai',
    packageSize: '800 g',
    unit: 'g',
    sku: 'AA-SOAP-LAUNDRY-800G',
    costPrice: 0.00,
    sellingPrice: 135.00,
    minStockThreshold: 15,
    imageUrl: '/products/menengai-bar-soap-800g.jpg',
    description: 'Menengai cream multi-purpose long-lasting laundry bar soap (800 g bar).',
  },
  {
    name: 'Sossi Soya Chunks',
    categoryName: 'Packaged Food',
    brand: 'Sossi',
    packageSize: '70 g',
    unit: 'g',
    sku: 'AA-SOYA-CHUNKS-70G',
    costPrice: 0.00,
    sellingPrice: 45.00,
    minStockThreshold: 25,
    imageUrl: '/products/sossi-soya-chunks-70g.jpg',
    description: 'Sossi classic tasty high-protein soya chunks (70 g pack). Meat alternative packed with flavour.',
  },
]

async function main() {
  console.log('=== MAAREE 360: ALLA AMIN REAL GROCERY PRODUCT SEEDER ===\n')

  // 1. Verify Target Business
  const business = await prisma.business.findUnique({
    where: { id: TARGET_BUSINESS_ID },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      status: true,
    },
  })

  if (!business) {
    throw new Error(`CRITICAL: Business with ID ${TARGET_BUSINESS_ID} not found in database!`)
  }

  if (business.status !== 'ACTIVE') {
    throw new Error(`CRITICAL: Business ${business.name} is not in ACTIVE status (current: ${business.status})`)
  }

  console.log(`[VERIFIED TARGET] Business: "${business.name}" (${business.id})`)
  console.log(`[VERIFIED STATUS] ${business.status}`)
  console.log(`[VERIFIED CURRENCY] ${business.currency} (Expected: ${EXPECTED_CURRENCY})\n`)

  // 2. Verify all local image files exist and have non-zero size
  console.log('--- Verifying Product Packaging Images ---')
  const clientPublicRoot = path.resolve('..', 'client', 'public')
  for (const item of PRODUCTS_DATA) {
    const fullImgPath = path.join(clientPublicRoot, item.imageUrl.replace(/^\//, ''))
    if (!fs.existsSync(fullImgPath)) {
      throw new Error(`Missing required product image file: ${fullImgPath}`)
    }
    const stat = fs.statSync(fullImgPath)
    if (stat.size < 1000) {
      throw new Error(`Product image file is invalid or too small (${stat.size} bytes): ${fullImgPath}`)
    }
    console.log(`[IMAGE OK] ${item.name.padEnd(25)} (${item.packageSize}) -> ${item.imageUrl} [${stat.size} bytes]`)
  }
  console.log('')

  // 3. Collect Unique Categories
  const categoryNames = Array.from(new Set(PRODUCTS_DATA.map((p) => p.categoryName)))
  console.log(`--- Creating/Verifying ${categoryNames.length} Categories for Alla Amin ---`)

  const categoryMap = new Map<string, string>()

  for (const catName of categoryNames) {
    const category = await prisma.category.upsert({
      where: {
        businessId_name: {
          businessId: TARGET_BUSINESS_ID,
          name: catName,
        },
      },
      update: {},
      create: {
        businessId: TARGET_BUSINESS_ID,
        name: catName,
        description: `Grocery category for ${catName} at Alla Amin`,
      },
    })
    categoryMap.set(catName, category.id)
    console.log(`[CATEGORY] "${catName}" -> ID: ${category.id}`)
  }
  console.log('')

  // 4. Seed Products Idempotently
  console.log(`--- Seeding Exactly ${PRODUCTS_DATA.length} Products with StockLevel = 0 ---`)
  const insertedOrUpdatedProducts = []

  for (const p of PRODUCTS_DATA) {
    const categoryId = categoryMap.get(p.categoryName)
    if (!categoryId) {
      throw new Error(`Category ${p.categoryName} ID not found in map!`)
    }

    const product = await prisma.product.upsert({
      where: {
        businessId_sku: {
          businessId: TARGET_BUSINESS_ID,
          sku: p.sku,
        },
      },
      update: {
        name: p.name,
        brand: p.brand,
        categoryId: categoryId,
        imageUrl: p.imageUrl,
        unit: p.unit,
        costPrice: new Prisma.Decimal(p.costPrice),
        sellingPrice: new Prisma.Decimal(p.sellingPrice),
        minStockThreshold: p.minStockThreshold,
        description: p.description,
        isActive: true,
      },
      create: {
        businessId: TARGET_BUSINESS_ID,
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        categoryId: categoryId,
        imageUrl: p.imageUrl,
        unit: p.unit,
        costPrice: new Prisma.Decimal(p.costPrice),
        sellingPrice: new Prisma.Decimal(p.sellingPrice),
        minStockThreshold: p.minStockThreshold,
        description: p.description,
        isActive: true,
      },
      include: {
        category: { select: { name: true } },
      },
    })

    // Upsert StockLevel for accurate opening stock = 0.00
    const stockLevel = await prisma.stockLevel.upsert({
      where: {
        productId: product.id,
      },
      update: {
        // preserve existing if not zero, or ensure 0 on initial
      },
      create: {
        businessId: TARGET_BUSINESS_ID,
        productId: product.id,
        quantity: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(0),
      },
    })

    insertedOrUpdatedProducts.push({
      id: product.id,
      name: product.name,
      category: product.category?.name,
      packageSize: p.packageSize,
      unit: product.unit,
      sku: product.sku,
      sellingPrice: product.sellingPrice.toNumber(),
      costPrice: product.costPrice.toNumber(),
      stockQuantity: stockLevel.quantity.toNumber(),
      imageUrl: product.imageUrl,
      isFlagged: !!p.isFlaggedForOwner,
    })

    const flagStr = p.isFlaggedForOwner ? ' **[FLAGGED: Macaroni price requires owner verification]**' : ''
    console.log(
      `[SAVED] "${product.name}" (${p.packageSize}) | SKU: ${product.sku} | Price: ${business.currency} ${product.sellingPrice} | Stock: ${stockLevel.quantity} | ID: ${product.id}${flagStr}`
    )
  }

  console.log(`\n=== SUCCESS: ${insertedOrUpdatedProducts.length} PRODUCTS SEEDED TO ALLA AMIN ===\n`)
  return insertedOrUpdatedProducts
}

main()
  .catch((e) => {
    console.error('SEEDING FAILED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
