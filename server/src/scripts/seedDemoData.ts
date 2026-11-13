import { prisma } from '../db/prisma.js'
import { Role, ProductCodeType, StockMovementType, PurchaseOrderStatus, Prisma } from '@prisma/client'
import { InventoryService } from '../services/inventory.service.js'
import { PurchaseOrderService } from '../services/purchaseOrder.service.js'
import { generateSlug } from '../utils/security.js'

const inventoryService = new InventoryService()
const purchaseOrderService = new PurchaseOrderService()

interface ProductSeedItem {
  name: string
  sku: string
  categoryName: string
  brand: string
  unit: string
  costPrice: number
  sellingPrice: number
  minStockThreshold: number
  initialStock: number
  code: string
  description: string
}

const DEMO_CATEGORIES = [
  { name: 'Flour & Cereals', description: 'Maize flour, wheat flour, and grain mill products.' },
  { name: 'Rice & Grains', description: 'Local Mwea pishori, aromatic rice, and cereal staples.' },
  { name: 'Sugar & Baking', description: 'Sugars, iodized table salt, yeast, and baking ingredients.' },
  { name: 'Cooking Essentials', description: 'Pure vegetable cooking oils, shortening, and culinary oils.' },
  { name: 'Dairy & Spreads', description: 'UHT milk, fresh milk bottles, and fortified margarine spreads.' },
  { name: 'Dairy & Eggs', description: 'Fresh farm eggs and poultry dairy products.' },
  { name: 'Bakery', description: 'Fresh sliced bread loaves, buns, and confectionery.' },
  { name: 'Beverages', description: 'Kenyan black tea bags, premium instant coffee, and drinking water.' },
  { name: 'Soft Drinks', description: 'Carbonated sodas, flavored juices, and cold beverages.' },
  { name: 'Household Cleaning', description: 'Laundry washing powder, dishwashing liquid, and detergents.' },
  { name: 'Personal Care', description: 'Bathing soaps, herbal bar soaps, and fluoride toothpastes.' },
]

const DEMO_PRODUCTS: ProductSeedItem[] = [
  {
    name: 'Pembe Maize Flour 2kg',
    sku: 'FLOUR-001',
    categoryName: 'Flour & Cereals',
    brand: 'Pembe',
    unit: 'Pack',
    costPrice: 195.0,
    sellingPrice: 230.0,
    minStockThreshold: 15,
    initialStock: 40,
    code: 'DEMO-PEMBE-2KG',
    description: 'High quality sifted maize meal fortified with vitamins and minerals.',
  },
  {
    name: 'Jogoo Maize Flour 2kg',
    sku: 'FLOUR-002',
    categoryName: 'Flour & Cereals',
    brand: 'Jogoo',
    unit: 'Pack',
    costPrice: 190.0,
    sellingPrice: 225.0,
    minStockThreshold: 15,
    initialStock: 12, // Low stock: 12 <= 15
    code: 'DEMO-JOGOO-2KG',
    description: 'Traditional household favourite sifted maize meal.',
  },
  {
    name: 'Soko Wheat Flour 2kg',
    sku: 'FLOUR-003',
    categoryName: 'Flour & Cereals',
    brand: 'Soko',
    unit: 'Pack',
    costPrice: 210.0,
    sellingPrice: 250.0,
    minStockThreshold: 10,
    initialStock: 25,
    code: 'DEMO-SOKO-2KG',
    description: 'All-purpose fortified home baking wheat flour for mandazi and chapati.',
  },
  {
    name: 'Mwea Pishori Rice 2kg',
    sku: 'RICE-001',
    categoryName: 'Rice & Grains',
    brand: 'Mwea',
    unit: 'Pack',
    costPrice: 340.0,
    sellingPrice: 420.0,
    minStockThreshold: 10,
    initialStock: 18,
    code: 'DEMO-MWEA-2KG',
    description: 'Grade 1 pure aromatic long grain pishori rice from Mwea plains.',
  },
  {
    name: 'White Sugar 1kg',
    sku: 'SUGAR-001',
    categoryName: 'Sugar & Baking',
    brand: 'Local Millers',
    unit: 'Pack',
    costPrice: 145.0,
    sellingPrice: 175.0,
    minStockThreshold: 20,
    initialStock: 8, // Low stock: 8 <= 20
    code: 'DEMO-SUGAR-1KG',
    description: 'Fine granulated fortified cane white sugar in 1kg pack.',
  },
  {
    name: 'Iodized Table Salt 500g',
    sku: 'SALT-001',
    categoryName: 'Sugar & Baking',
    brand: 'Kensalt',
    unit: 'Pack',
    costPrice: 28.0,
    sellingPrice: 40.0,
    minStockThreshold: 25,
    initialStock: 50,
    code: 'DEMO-SALT-500G',
    description: 'Refined vacuum evaporated table salt with potassium iodate.',
  },
  {
    name: 'Cooking Oil 1 Litre',
    sku: 'OIL-001',
    categoryName: 'Cooking Essentials',
    brand: 'Rina',
    unit: 'Bottle',
    costPrice: 285.0,
    sellingPrice: 340.0,
    minStockThreshold: 12,
    initialStock: 20,
    code: 'DEMO-OIL-1L',
    description: 'Pure double-refined cholesterol-free vegetable palm cooking oil.',
  },
  {
    name: 'UHT Whole Milk 500ml',
    sku: 'MILK-001',
    categoryName: 'Dairy & Spreads',
    brand: 'KCC',
    unit: 'Pack',
    costPrice: 55.0,
    sellingPrice: 70.0,
    minStockThreshold: 24,
    initialStock: 36,
    code: 'DEMO-UHT-500ML',
    description: 'Long life homogenized ultra-heat treated full cream cow milk.',
  },
  {
    name: 'Fresh Milk 1 Litre',
    sku: 'MILK-002',
    categoryName: 'Dairy & Spreads',
    brand: 'Brookside',
    unit: 'Bottle',
    costPrice: 105.0,
    sellingPrice: 130.0,
    minStockThreshold: 15,
    initialStock: 5, // Low stock: 5 <= 15
    code: 'DEMO-MILK-1L',
    description: 'Pasteurized homogenized fresh whole cow milk in bottle.',
  },
  {
    name: 'White Bread 400g',
    sku: 'BREAD-001',
    categoryName: 'Bakery',
    brand: 'Supaloaf',
    unit: 'Loaf',
    costPrice: 52.0,
    sellingPrice: 65.0,
    minStockThreshold: 15,
    initialStock: 0, // Out of stock: 0 in stock
    code: 'DEMO-BREAD-400G',
    description: 'Soft sliced fortified white sandwich bread loaf.',
  },
  {
    name: 'Eggs',
    sku: 'EGGS-001',
    categoryName: 'Dairy & Eggs',
    brand: 'Local Farm',
    unit: 'Piece',
    costPrice: 15.0,
    sellingPrice: 20.0,
    minStockThreshold: 60,
    initialStock: 120,
    code: 'DEMO-EGGS-PC',
    description: 'Fresh farm graded brown chicken eggs, sold individually or by tray.',
  },
  {
    name: 'Blue Band Margarine 250g',
    sku: 'SPREAD-001',
    categoryName: 'Dairy & Spreads',
    brand: 'Blue Band',
    unit: 'Tub',
    costPrice: 120.0,
    sellingPrice: 150.0,
    minStockThreshold: 10,
    initialStock: 15,
    code: 'DEMO-BLUEBAND-250G',
    description: 'Medium fat spread fortified with 7 essential vitamins & Omega 3 and 6.',
  },
  {
    name: 'Black Tea Bags 50s',
    sku: 'TEA-001',
    categoryName: 'Beverages',
    brand: 'Ketepa',
    unit: 'Box',
    costPrice: 135.0,
    sellingPrice: 175.0,
    minStockThreshold: 10,
    initialStock: 22,
    code: 'DEMO-TEA-50S',
    description: 'Premium Kenyan black CTC tea tagless filter bags.',
  },
  {
    name: 'Instant Coffee 100g',
    sku: 'COFFEE-001',
    categoryName: 'Beverages',
    brand: 'Nescafe',
    unit: 'Jar',
    costPrice: 310.0,
    sellingPrice: 395.0,
    minStockThreshold: 8,
    initialStock: 0, // Out of stock: 0 in stock
    code: 'DEMO-COFFEE-100G',
    description: 'Classic rich roast 100% pure soluble coffee granules in glass jar.',
  },
  {
    name: 'Bottled Water 1 Litre',
    sku: 'WATER-001',
    categoryName: 'Beverages',
    brand: 'Keringet',
    unit: 'Bottle',
    costPrice: 45.0,
    sellingPrice: 70.0,
    minStockThreshold: 24,
    initialStock: 48,
    code: 'DEMO-WATER-1L',
    description: 'Natural mineral drinking water sourced from the Great Rift Valley.',
  },
  {
    name: 'Orange Soda 500ml',
    sku: 'SODA-001',
    categoryName: 'Soft Drinks',
    brand: 'Fanta',
    unit: 'Bottle',
    costPrice: 50.0,
    sellingPrice: 70.0,
    minStockThreshold: 24,
    initialStock: 18, // Low stock: 18 <= 24
    code: 'DEMO-FANTA-500ML',
    description: 'Fruity orange sparkling soft drink in recyclable PET bottle.',
  },
  {
    name: 'Washing Powder 1kg',
    sku: 'CLEAN-001',
    categoryName: 'Household Cleaning',
    brand: 'Ariel',
    unit: 'Pack',
    costPrice: 260.0,
    sellingPrice: 330.0,
    minStockThreshold: 12,
    initialStock: 20,
    code: 'DEMO-ARIEL-1KG',
    description: 'High-efficiency active enzyme hand and machine laundry detergent powder.',
  },
  {
    name: 'Dishwashing Liquid 500ml',
    sku: 'CLEAN-002',
    categoryName: 'Household Cleaning',
    brand: 'Sunlight',
    unit: 'Bottle',
    costPrice: 165.0,
    sellingPrice: 215.0,
    minStockThreshold: 10,
    initialStock: 14,
    code: 'DEMO-SUNLIGHT-500ML',
    description: 'Lemon degreasing dishwashing liquid with real lemon juice.',
  },
  {
    name: 'Bathing Soap 125g',
    sku: 'SOAP-001',
    categoryName: 'Personal Care',
    brand: 'Geisha',
    unit: 'Bar',
    costPrice: 72.0,
    sellingPrice: 95.0,
    minStockThreshold: 30,
    initialStock: 15, // Low stock: 15 <= 30
    code: 'DEMO-GEISHA-125G',
    description: 'Long-lasting beauty soap with aloe vera and honey fragrance.',
  },
  {
    name: 'Toothpaste 100ml',
    sku: 'DENTAL-001',
    categoryName: 'Personal Care',
    brand: 'Colgate',
    unit: 'Tube',
    costPrice: 140.0,
    sellingPrice: 185.0,
    minStockThreshold: 15,
    initialStock: 28,
    code: 'DEMO-COLGATE-100ML',
    description: 'Maximum cavity protection fluoride toothpaste with calcium formula.',
  },
]

const DEMO_SUPPLIERS = [
  {
    name: 'Nairobi Wholesale Distributors',
    contactPerson: 'David Kamau',
    phone: '+254712345001',
    email: 'orders@nairobi-wholesale.demo',
    address: 'Commercial Street, Industrial Area, Nairobi',
    notes: 'Wholesale distributor for maize flour, wheat flour, rice, sugar, and dry grains.',
  },
  {
    name: 'FreshMart Foods Supply',
    contactPerson: 'Faith Wanjiku',
    phone: '+254722987002',
    email: 'supply@freshmart-foods.demo',
    address: 'Enterprise Road, Industrial Area, Nairobi',
    notes: 'Daily and weekly perishable distributor for milk, bread, eggs, and beverages.',
  },
  {
    name: 'CleanHome Consumer Goods',
    contactPerson: 'Peter Ochieng',
    phone: '+254733456003',
    email: 'sales@cleanhome-supplies.demo',
    address: 'Mombasa Road, Nairobi',
    notes: 'FMCG distributor for soaps, detergents, toothpastes, and cleaning essentials.',
  },
]

async function seedBusinessData(business: { id: string; name: string }, userId: string) {
  console.log(`\n>>> Seeding catalog for business: "${business.name}" (${business.id}) <<<`)

  // 1. Create / Reconcile Categories
  const categoryMap = new Map<string, string>()
  let categoriesCreated = 0
  let categoriesSkipped = 0

  for (const cat of DEMO_CATEGORIES) {
    const existingCat = await prisma.category.findUnique({
      where: {
        businessId_name: {
          businessId: business.id,
          name: cat.name,
        },
      },
    })

    if (!existingCat) {
      const created = await prisma.category.create({
        data: {
          businessId: business.id,
          name: cat.name,
          description: cat.description,
        },
      })
      categoryMap.set(cat.name, created.id)
      categoriesCreated++
    } else {
      categoryMap.set(cat.name, existingCat.id)
      categoriesSkipped++
    }
  }
  console.log(`Categories: ${categoriesCreated} created, ${categoriesSkipped} existing.`)

  // 2. Create / Reconcile 20 Products
  const productMap = new Map<string, any>()
  let productsCreated = 0
  let productsSkipped = 0

  for (const item of DEMO_PRODUCTS) {
    const categoryId = categoryMap.get(item.categoryName)
    if (!categoryId) {
      throw new Error(`Category "${item.categoryName}" missing for SKU ${item.sku}`)
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        businessId_sku: {
          businessId: business.id,
          sku: item.sku,
        },
      },
      include: {
        stockLevel: true,
        codes: true,
      },
    })

    if (!existingProduct) {
      const product = await prisma.product.create({
        data: {
          businessId: business.id,
          name: item.name,
          sku: item.sku,
          brand: item.brand,
          description: item.description,
          categoryId,
          unit: item.unit,
          costPrice: new Prisma.Decimal(item.costPrice),
          sellingPrice: new Prisma.Decimal(item.sellingPrice),
          minStockThreshold: item.minStockThreshold,
          isActive: true,
        },
      })
      productMap.set(item.sku, product)
      productsCreated++
    } else {
      productMap.set(item.sku, existingProduct)
      productsSkipped++
    }
  }
  console.log(`Products: ${productsCreated} created, ${productsSkipped} existing.`)

  // 3. Create / Reconcile Product Codes
  let codesCreated = 0
  let codesSkipped = 0

  for (const item of DEMO_PRODUCTS) {
    const product = productMap.get(item.sku)
    if (!product) continue

    const existingCode = await prisma.productCode.findUnique({
      where: {
        businessId_code: {
          businessId: business.id,
          code: item.code,
        },
      },
    })

    if (!existingCode) {
      await prisma.productCode.create({
        data: {
          businessId: business.id,
          productId: product.id,
          code: item.code,
          type: ProductCodeType.CODE_128,
        },
      })
      codesCreated++
    } else {
      codesSkipped++
    }
  }
  console.log(`Product Codes: ${codesCreated} created, ${codesSkipped} existing.`)

  // 4. Initialize Realistic Stock Levels through Inventory Service
  let stockRecorded = 0
  let stockPreserved = 0

  for (const item of DEMO_PRODUCTS) {
    const product = productMap.get(item.sku)
    if (!product) continue

    const existingMovement = await prisma.stockMovement.findFirst({
      where: {
        businessId: business.id,
        productId: product.id,
        type: StockMovementType.OPENING_STOCK,
      },
    })

    if (!existingMovement) {
      await inventoryService.recordOpeningStock(business.id, product.id, userId, {
        quantity: item.initialStock,
        notes: `Initial store opening balance for demo (${item.name})`,
      })
      stockRecorded++
    } else {
      stockPreserved++
    }
  }
  console.log(`Stock Initialization: ${stockRecorded} recorded via ledger, ${stockPreserved} preserved.`)

  // 5. Create / Reconcile Demo Suppliers
  const supplierMap = new Map<string, any>()
  let suppliersCreated = 0
  let suppliersSkipped = 0

  for (const sup of DEMO_SUPPLIERS) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        businessId: business.id,
        name: sup.name,
      },
    })

    if (!existingSupplier) {
      const created = await prisma.supplier.create({
        data: {
          businessId: business.id,
          name: sup.name,
          contactPerson: sup.contactPerson,
          phone: sup.phone,
          email: sup.email,
          address: sup.address,
          notes: sup.notes,
          isActive: true,
        },
      })
      supplierMap.set(sup.name, created)
      suppliersCreated++
    } else {
      supplierMap.set(sup.name, existingSupplier)
      suppliersSkipped++
    }
  }
  console.log(`Suppliers: ${suppliersCreated} created, ${suppliersSkipped} existing.`)

  // 6. Create Purchase Order Demo Data
  const existingPOs = await prisma.purchaseOrder.findMany({
    where: { businessId: business.id },
  })

  let posCreated = 0
  if (existingPOs.length === 0) {
    // 6a. PO 1: DRAFT PO with Nairobi Wholesale Distributors
    const nairobiWholesale = supplierMap.get('Nairobi Wholesale Distributors')
    const pembe = productMap.get('FLOUR-001')
    const jogoo = productMap.get('FLOUR-002')
    const mwea = productMap.get('RICE-001')

    if (nairobiWholesale && pembe && jogoo && mwea) {
      await purchaseOrderService.createPurchaseOrder(business.id, userId, {
        supplierId: nairobiWholesale.id,
        orderDate: new Date().toISOString(),
        expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        discount: 0,
        taxAmount: 0,
        notes: 'Monthly bulk dry grains replenishment (Draft awaiting review)',
        items: [
          { productId: pembe.id, quantityOrdered: 30, unitCost: 195.0, notes: 'Bales of Pembe 2kg' },
          { productId: jogoo.id, quantityOrdered: 20, unitCost: 190.0, notes: 'Bales of Jogoo 2kg' },
          { productId: mwea.id, quantityOrdered: 15, unitCost: 340.0, notes: 'Mwea Grade 1' },
        ],
      })
      posCreated++
      console.log('Created PO 1 (DRAFT) with Nairobi Wholesale Distributors.')
    }

    // 6b. PO 2: ORDERED PO with CleanHome Consumer Goods
    const cleanHome = supplierMap.get('CleanHome Consumer Goods')
    const ariel = productMap.get('CLEAN-001')
    const soap = productMap.get('SOAP-001')
    const colgate = productMap.get('DENTAL-001')

    if (cleanHome && ariel && soap && colgate) {
      const po2Draft = await purchaseOrderService.createPurchaseOrder(business.id, userId, {
        supplierId: cleanHome.id,
        orderDate: new Date(Date.now() - 86400000).toISOString(),
        expectedDeliveryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        discount: 0,
        taxAmount: 0,
        notes: 'Weekly personal care and laundry detergent restock (Order Placed)',
        items: [
          { productId: ariel.id, quantityOrdered: 25, unitCost: 260.0 },
          { productId: soap.id, quantityOrdered: 50, unitCost: 72.0 },
          { productId: colgate.id, quantityOrdered: 30, unitCost: 140.0 },
        ],
      })
      await purchaseOrderService.placeOrder(business.id, po2Draft.id)
      posCreated++
      console.log('Created PO 2 (ORDERED - Placed & Awaiting Delivery) with CleanHome Consumer Goods.')
    }

    // 6c. PO 3: PARTIALLY_RECEIVED PO with FreshMart Foods Supply
    const freshMart = supplierMap.get('FreshMart Foods Supply')
    const freshMilk = productMap.get('MILK-002')
    const eggs = productMap.get('EGGS-001')
    const bread = productMap.get('BREAD-001')

    if (freshMart && freshMilk && eggs && bread) {
      const po3Draft = await purchaseOrderService.createPurchaseOrder(business.id, userId, {
        supplierId: freshMart.id,
        orderDate: new Date(Date.now() - 2 * 86400000).toISOString(),
        expectedDeliveryDate: new Date().toISOString(),
        discount: 0,
        taxAmount: 0,
        notes: 'Daily perishables shipment (Morning partial delivery received)',
        items: [
          { productId: freshMilk.id, quantityOrdered: 30, unitCost: 105.0 },
          { productId: eggs.id, quantityOrdered: 100, unitCost: 15.0 },
          { productId: bread.id, quantityOrdered: 25, unitCost: 52.0 },
        ],
      })

      const po3Placed = await purchaseOrderService.placeOrder(business.id, po3Draft.id)

      const freshMilkItem = po3Placed.items.find((i) => i.productId === freshMilk.id)
      const eggsItem = po3Placed.items.find((i) => i.productId === eggs.id)

      if (freshMilkItem && eggsItem) {
        await purchaseOrderService.receiveDelivery(business.id, userId, po3Placed.id, {
          notes: 'Received initial morning van drop: 15 milk bottles and 50 eggs. Bread pending baker afternoon route.',
          items: [
            { purchaseOrderItemId: freshMilkItem.id, quantityReceived: 15 },
            { purchaseOrderItemId: eggsItem.id, quantityReceived: 50 },
          ],
        })
      }
      posCreated++
      console.log('Created PO 3 (PARTIALLY_RECEIVED with recorded GRN delivery & Stock Ledger increment) with FreshMart Foods Supply.')
    }
  } else {
    console.log(`Purchase orders already exist (${existingPOs.length} found). Skipping PO generation.`)
  }
}

export async function seedDemoData() {
  console.log('=================================================================')
  console.log('SmartStock Demo Data Seeding — 20 Realistic Kenyan Shop Products')
  console.log('=================================================================\n')

  // 1. Locate primary user
  const user = await prisma.user.findFirst({
    where: { email: 'walikhalil480@gmail.com' },
  })

  if (!user) {
    throw new Error(
      'Primary user account walikhalil480@gmail.com not found. Please register or create user first.'
    )
  }
  console.log(`Found target user account: ${user.name} (${user.email})`)

  // 2. Locate or create "SmartStock Demo Mini-Mart" business
  let demoBusiness = await prisma.business.findFirst({
    where: {
      name: 'SmartStock Demo Mini-Mart',
      memberships: { some: { userId: user.id } },
    },
  })

  if (!demoBusiness) {
    console.log('Creating dedicated demo business: "SmartStock Demo Mini-Mart"...')
    const slug = generateSlug('SmartStock Demo Mini-Mart')
    demoBusiness = await prisma.business.create({
      data: {
        name: 'SmartStock Demo Mini-Mart',
        slug,
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        memberships: {
          create: {
            userId: user.id,
            role: Role.OWNER,
          },
        },
      },
    })
    console.log(`Created business: ${demoBusiness.name} (ID: ${demoBusiness.id})`)
  }

  // Seed "SmartStock Demo Mini-Mart"
  await seedBusinessData(demoBusiness, user.id)

  // Also seed "Khalil Academy" so whichever business is selected in the browser, all 20 products are available!
  const khalilAcademy = await prisma.business.findFirst({
    where: {
      name: 'Khalil Academy',
      memberships: { some: { userId: user.id } },
    },
  })

  if (khalilAcademy) {
    await seedBusinessData(khalilAcademy, user.id)
  }

  console.log('\n=================================================================')
  console.log('DEMO DATA SEEDING COMPLETE FOR ALL BUSINESSES!')
  console.log(`Primary Demo Store: SmartStock Demo Mini-Mart (${demoBusiness.id})`)
  if (khalilAcademy) {
    console.log(`Secondary Store:   Khalil Academy (${khalilAcademy.id})`)
  }
  console.log(`Products:          ${DEMO_PRODUCTS.length} distinct items ready in catalog`)
  console.log('=================================================================\n')
}

// Direct execution guard
if (process.argv[1]?.endsWith('seedDemoData.ts')) {
  seedDemoData()
    .catch((err) => {
      console.error('Seeding failed:', err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
