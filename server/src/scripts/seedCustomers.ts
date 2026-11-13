import { prisma } from '../db/prisma.js'
import { Role, SaleStatus, PaymentStatus, PaymentMethod, ReturnRestockAction, StockMovementType, Prisma } from '@prisma/client'

const DEMO_CUSTOMERS = [
  {
    name: 'Mama Brian (Sarah Wanjiku)',
    phone: '+254712345678',
    email: 'sarah.wanjiku@gmail.com',
    address: 'Biashara Street, Shop 14',
    taxPin: 'A004561234M',
    notes: 'Regular morning buyer, prefers M-Pesa receipts',
  },
  {
    name: 'John Otieno',
    phone: '+254722889900',
    email: 'j.otieno@outlook.com',
    address: 'Argwings Kodhek Rd, Kilimani',
    taxPin: 'A009876543Z',
    notes: 'Wholesale buyer for local neighborhood cafeteria',
  },
  {
    name: 'Amina Abdi',
    phone: '+254733112233',
    email: 'amina.abdi@gmail.com',
    address: 'South C, Nairobi',
    taxPin: null,
    notes: 'Prefers evening deliveries',
  },
  {
    name: 'Peter Kamau',
    phone: '+254701445566',
    email: null,
    address: 'Ngara Market Stalls, Nairobi',
    taxPin: null,
    notes: 'Cash customer, regular baking flour buyer',
  },
]

async function seedCustomersForBusiness(businessId: string, userId: string) {
  console.log(`Seeding customers for business ${businessId}...`)

  const customerMap = new Map<string, any>()

  for (const cData of DEMO_CUSTOMERS) {
    let customer = await prisma.customer.findFirst({
      where: { businessId, phone: cData.phone },
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId,
          name: cData.name,
          phone: cData.phone,
          email: cData.email,
          address: cData.address,
          taxPin: cData.taxPin,
          notes: cData.notes,
          isActive: true,
        },
      })
      console.log(`Created customer: ${customer.name}`)
    } else {
      console.log(`Customer ${customer.name} already exists.`)
    }

    customerMap.set(cData.phone, customer)
  }

  // Create a realistic sample sale linked to Mama Brian if not yet created
  const mamaBrian = customerMap.get('+254712345678')
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    take: 3,
  })

  if (mamaBrian && products.length >= 2) {
    const existingSale = await prisma.sale.findFirst({
      where: { businessId, customerId: mamaBrian.id },
    })

    if (!existingSale) {
      const prod1 = products[0]
      const prod2 = products[1]

      const item1Qty = new Prisma.Decimal(2)
      const item2Qty = new Prisma.Decimal(1)
      const item1Line = item1Qty.mul(prod1.sellingPrice)
      const item2Line = item2Qty.mul(prod2.sellingPrice)
      const total = item1Line.plus(item2Line)

      // Receipt number
      const count = await prisma.sale.count({ where: { businessId } })
      const receiptNumber = `REC-${String(count + 1).padStart(4, '0')}`

      const sale = await prisma.sale.create({
        data: {
          businessId,
          receiptNumber,
          cashierId: userId,
          customerId: mamaBrian.id,
          customerName: mamaBrian.name,
          customerPhone: mamaBrian.phone,
          status: SaleStatus.COMPLETED,
          subtotal: total,
          discount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(0),
          total,
          currency: 'KES',
          paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
          notes: 'Customer purchased flour and cooking oil; returned 1 flour packet with seal defect.',
          completedAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
          createdAt: new Date(Date.now() - 3600000 * 4),
          items: {
            create: [
              {
                productId: prod1.id,
                productName: prod1.name,
                productSku: prod1.sku,
                unit: prod1.unit,
                quantity: item1Qty,
                unitPrice: prod1.sellingPrice,
                unitCost: prod1.costPrice,
                discount: new Prisma.Decimal(0),
                taxAmount: new Prisma.Decimal(0),
                lineTotal: item1Line,
                quantityReturned: new Prisma.Decimal(1), // 1 packet returned
              },
              {
                productId: prod2.id,
                productName: prod2.name,
                productSku: prod2.sku,
                unit: prod2.unit,
                quantity: item2Qty,
                unitPrice: prod2.sellingPrice,
                unitCost: prod2.costPrice,
                discount: new Prisma.Decimal(0),
                taxAmount: new Prisma.Decimal(0),
                lineTotal: item2Line,
                quantityReturned: new Prisma.Decimal(0),
              },
            ],
          },
          payments: {
            create: [
              {
                businessId,
                method: PaymentMethod.MOBILE_MONEY,
                amount: total,
                amountTendered: total,
                changeDue: new Prisma.Decimal(0),
                reference: 'QJD789X123',
                notes: 'Paid via M-Pesa Buy Goods till',
              },
            ],
          },
        },
        include: { items: true },
      })

      console.log(`Created linked sale ${sale.receiptNumber} for ${mamaBrian.name}`)

      // Create matching SaleReturn record
      const returnedItem = sale.items.find((i) => i.productId === prod1.id)!
      const returnNumber = `RET-0001`
      const refundAmount = prod1.sellingPrice

      await prisma.saleReturn.create({
        data: {
          businessId,
          saleId: sale.id,
          customerId: mamaBrian.id,
          returnNumber,
          refundMethod: PaymentMethod.MOBILE_MONEY,
          refundAmount,
          refundReference: 'REV-MMP-001',
          reason: 'Defective packaging seal on one packet; customer refunded via M-Pesa.',
          notes: 'Processed at customer care counter.',
          processedById: userId,
          createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
          items: {
            create: [
              {
                saleItemId: returnedItem.id,
                productId: prod1.id,
                quantityReturned: new Prisma.Decimal(1),
                unitRefundPrice: prod1.sellingPrice,
                refundSubtotal: refundAmount,
                restockAction: ReturnRestockAction.WRITE_OFF, // Defective item written off
                notes: 'Damaged seal returned to supplier crate',
              },
            ],
          },
        },
      })

      console.log(`Created return ${returnNumber} for sale ${sale.receiptNumber}`)
    }
  }
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'walikhalil480@gmail.com' },
  })

  if (!user) {
    console.error('Target user not found')
    return
  }

  const businesses = await prisma.business.findMany({
    where: { memberships: { some: { userId: user.id } } },
  })

  for (const b of businesses) {
    await seedCustomersForBusiness(b.id, user.id)
  }

  console.log('Customer and return demo seeding finished successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
