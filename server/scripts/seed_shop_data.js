import { PrismaClient, StockMovementType, Role, SaleStatus, PaymentStatus, PaymentMethod } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const shabeele = await prisma.business.findFirst({ where: { name: 'Shabeele Whole Sellers' } })
  const raqiis = await prisma.business.findFirst({ where: { name: 'RAQIIS ELECTRONICS' } })
  const shabeeleOwner = await prisma.user.findUnique({ where: { email: 'owner@shabeele.com' } })
  const raqiisOwner = await prisma.user.findUnique({ where: { email: 'tcusub777@gmail.com' } })

  if (!shabeele || !raqiis || !shabeeleOwner || !raqiisOwner) {
    throw new Error('Shabeele or RAQIIS business or owner not found')
  }

  // 1. Seed Shabeele Whole Sellers Categories, Suppliers, Products, Stock
  console.log('Seeding Shabeele Whole Sellers data...')
  
  // Categories
  const catWholesaleGrains = await prisma.category.upsert({
    where: { businessId_name: { businessId: shabeele.id, name: 'Grains & Cereals (Bulk)' } },
    update: {},
    create: { businessId: shabeele.id, name: 'Grains & Cereals (Bulk)', description: '50kg sacks and bulk cartons' },
  })
  const catCookingOil = await prisma.category.upsert({
    where: { businessId_name: { businessId: shabeele.id, name: 'Edible Oils & Fats' } },
    update: {},
    create: { businessId: shabeele.id, name: 'Edible Oils & Fats', description: '20L jerrycans and carton packs' },
  })
  const catWholesaleSugar = await prisma.category.upsert({
    where: { businessId_name: { businessId: shabeele.id, name: 'Sugar & Sweeteners' } },
    update: {},
    create: { businessId: shabeele.id, name: 'Sugar & Sweeteners', description: 'Refined cane sugar in bulk' },
  })

  // Suppliers
  const supShabeele1 = await prisma.supplier.create({
    data: {
      businessId: shabeele.id,
      name: 'Mombasa Grain Millers Ltd',
      contactPerson: 'Kariuki Mwangi',
      phone: '+254711889900',
      email: 'sales@mombasagrain.co.ke',
      address: 'Port Reitz, Mombasa',
      isActive: true,
    },
  })
  const supShabeele2 = await prisma.supplier.create({
    data: {
      businessId: shabeele.id,
      name: 'Bidco Africa Wholesale Dist',
      contactPerson: 'Anand Patel',
      phone: '+254722556677',
      email: 'orders@bidcoafrica.com',
      address: 'Thika Industrial Area',
      isActive: true,
    },
  })

  // Products for Shabeele
  const shabeeleProducts = [
    {
      name: 'Basmati Rice 50kg Sack (Grade A)',
      sku: 'SHB-RICE-50KG',
      categoryId: catWholesaleGrains.id,
      unit: 'sack',
      costPrice: 5200,
      sellingPrice: 5900,
      minStockThreshold: 10,
      initialQty: 80,
    },
    {
      name: 'Refined Pure Cane Sugar 50kg Sack',
      sku: 'SHB-SUGAR-50KG',
      categoryId: catWholesaleSugar.id,
      unit: 'sack',
      costPrice: 6100,
      sellingPrice: 6800,
      minStockThreshold: 15,
      initialQty: 120,
    },
    {
      name: 'Golden Fry Cooking Oil 20L Jerrycan',
      sku: 'SHB-OIL-20L',
      categoryId: catCookingOil.id,
      unit: 'jerrycan',
      costPrice: 3800,
      sellingPrice: 4250,
      minStockThreshold: 12,
      initialQty: 65,
    },
    {
      name: 'Wheat Baker Flour 50kg Sack',
      sku: 'SHB-FLOUR-50KG',
      categoryId: catWholesaleGrains.id,
      unit: 'sack',
      costPrice: 2400,
      sellingPrice: 2800,
      minStockThreshold: 10,
      initialQty: 50,
    },
  ]

  for (const prod of shabeeleProducts) {
    const existing = await prisma.product.findUnique({
      where: { businessId_sku: { businessId: shabeele.id, sku: prod.sku } }
    })
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          businessId: shabeele.id,
          name: prod.name,
          sku: prod.sku,
          categoryId: prod.categoryId,
          unit: prod.unit,
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          minStockThreshold: prod.minStockThreshold,
          isActive: true,
          stockLevel: {
            create: {
              businessId: shabeele.id,
              quantity: prod.initialQty,
            },
          },
          stockMovements: {
            create: {
              businessId: shabeele.id,
              type: StockMovementType.OPENING_STOCK,
              quantityChange: prod.initialQty,
              previousQuantity: 0,
              resultingQuantity: prod.initialQty,
              reason: 'Initial wholesale warehouse stock count',
              userId: shabeeleOwner.id,
            },
          },
        },
      })
      console.log(`Created Shabeele product: ${created.name} (${created.sku})`)
    }
  }

  // 2. Seed RAQIIS ELECTRONICS Categories, Suppliers, Products, Stock
  console.log('\nSeeding RAQIIS ELECTRONICS data...')

  const catPhones = await prisma.category.upsert({
    where: { businessId_name: { businessId: raqiis.id, name: 'Smartphones & Tablets' } },
    update: {},
    create: { businessId: raqiis.id, name: 'Smartphones & Tablets', description: 'Android & iOS devices' },
  })
  const catSolar = await prisma.category.upsert({
    where: { businessId_name: { businessId: raqiis.id, name: 'Solar & Power Systems' } },
    update: {},
    create: { businessId: raqiis.id, name: 'Solar & Power Systems', description: 'Inverters, batteries, and charge controllers' },
  })
  const catTVs = await prisma.category.upsert({
    where: { businessId_name: { businessId: raqiis.id, name: 'Smart TVs & Home Audio' } },
    update: {},
    create: { businessId: raqiis.id, name: 'Smart TVs & Home Audio', description: 'LED Smart TVs and speakers' },
  })

  // Suppliers for RAQIIS
  const supRaqiis1 = await prisma.supplier.create({
    data: {
      businessId: raqiis.id,
      name: 'Dubai Tech Distribution FZE',
      contactPerson: 'Tariq Al-Maktoum',
      phone: '+97142233445',
      email: 'sales@dubaitechfze.ae',
      address: 'Deira Wholesale Hub, Dubai',
      isActive: true,
    },
  })
  const supRaqiis2 = await prisma.supplier.create({
    data: {
      businessId: raqiis.id,
      name: 'East Africa Solar Solutions Ltd',
      contactPerson: 'Farah Abdirahman',
      phone: '+254700332211',
      email: 'info@easolar.co.ke',
      address: 'Commercial Street, Nairobi',
      isActive: true,
    },
  })

  // Products for RAQIIS
  const raqiisProducts = [
    {
      name: 'Samsung Galaxy A15 128GB LTE',
      sku: 'RAQ-SAM-A15-128',
      categoryId: catPhones.id,
      unit: 'piece',
      costPrice: 17500,
      sellingPrice: 20500,
      minStockThreshold: 5,
      initialQty: 25,
    },
    {
      name: 'Growatt 5kVA Hybrid Solar Inverter 48V',
      sku: 'RAQ-SOLAR-5KVA',
      categoryId: catSolar.id,
      unit: 'unit',
      costPrice: 85000,
      sellingPrice: 98000,
      minStockThreshold: 2,
      initialQty: 8,
    },
    {
      name: 'Hisense 43-Inch 4K UHD Smart Frameless TV',
      sku: 'RAQ-TV-HIS-43',
      categoryId: catTVs.id,
      unit: 'piece',
      costPrice: 29000,
      sellingPrice: 34500,
      minStockThreshold: 3,
      initialQty: 14,
    },
    {
      name: 'Lithium LiFePO4 Battery Pack 48V 100Ah',
      sku: 'RAQ-BATT-48V100',
      categoryId: catSolar.id,
      unit: 'unit',
      costPrice: 145000,
      sellingPrice: 168000,
      minStockThreshold: 2,
      initialQty: 6,
    },
  ]

  for (const prod of raqiisProducts) {
    const existing = await prisma.product.findUnique({
      where: { businessId_sku: { businessId: raqiis.id, sku: prod.sku } }
    })
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          businessId: raqiis.id,
          name: prod.name,
          sku: prod.sku,
          categoryId: prod.categoryId,
          unit: prod.unit,
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          minStockThreshold: prod.minStockThreshold,
          isActive: true,
          stockLevel: {
            create: {
              businessId: raqiis.id,
              quantity: prod.initialQty,
            },
          },
          stockMovements: {
            create: {
              businessId: raqiis.id,
              type: StockMovementType.OPENING_STOCK,
              quantityChange: prod.initialQty,
              previousQuantity: 0,
              resultingQuantity: prod.initialQty,
              reason: 'Initial retail electronics showroom stock',
              userId: raqiisOwner.id,
            },
          },
        },
      })
      console.log(`Created RAQIIS product: ${created.name} (${created.sku})`)
    }
  }

  console.log('\nAll shop datasets initialized with strict multi-tenant isolation!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
