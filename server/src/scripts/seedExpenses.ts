import { prisma } from '../db/prisma.js'
import { ExpenseCategory, Prisma } from '@prisma/client'

const REALISTIC_EXPENSES = [
  {
    category: ExpenseCategory.RENT,
    description: 'Monthly store premise rent (Ground Floor Stall 4B)',
    amount: 25000,
    referenceNumber: 'RENT-OCT-2026',
    notes: 'Paid to Biashara Commercial Plaza Ltd via bank transfer',
    daysAgo: 14,
  },
  {
    category: ExpenseCategory.EMPLOYEE_WAGES,
    description: 'Shop assistant & stock keeper monthly wages',
    amount: 18000,
    referenceNumber: 'WAGE-OCT-P1',
    notes: 'Paid via M-Pesa bulk disbursement',
    daysAgo: 12,
  },
  {
    category: ExpenseCategory.ELECTRICITY_AND_WATER,
    description: 'KPLC Pre-paid Electricity Tokens (500 units)',
    amount: 4500,
    referenceNumber: 'KPLC-9921827',
    notes: 'Store meter #1428570392, includes VAT and fuel energy charge',
    daysAgo: 9,
  },
  {
    category: ExpenseCategory.TRANSPORT_AND_DELIVERY,
    description: 'Boda & pickup transport from Nyamakima wholesale depot',
    amount: 3200,
    referenceNumber: 'BODA-DEL-104',
    notes: 'Flour and cooking oil heavy transit fare',
    daysAgo: 7,
  },
  {
    category: ExpenseCategory.INTERNET_AND_PHONE,
    description: 'Safaricom 5G Business WiFi & till SMS airtime package',
    amount: 3000,
    referenceNumber: 'SAF-INV-44189',
    notes: 'Fast connection for POS terminal and barcode scanner sync',
    daysAgo: 6,
  },
  {
    category: ExpenseCategory.PACKAGING_AND_SUPPLIES,
    description: 'Khaki brown shopping bags & 10x 80mm thermal receipt rolls',
    amount: 2400,
    referenceNumber: 'SUP-PKG-082',
    notes: 'Purchased from General Packaging Wholesalers, River Road',
    daysAgo: 4,
  },
  {
    category: ExpenseCategory.REPAIRS_AND_MAINTENANCE,
    description: 'Shelf reinforcement and replacement of 2x LED fluorescent tubes',
    amount: 1800,
    referenceNumber: 'REP-FIX-22',
    notes: 'Carpenter Mwangi repair receipt',
    daysAgo: 3,
  },
  {
    category: ExpenseCategory.MARKETING,
    description: 'Street-facing branded board touch-up & 200 A5 printed price flyers',
    amount: 1500,
    referenceNumber: 'MKT-FLY-10',
    notes: 'Printed at Downtown Cyber for local neighborhood promotion',
    daysAgo: 2,
  },
  {
    category: ExpenseCategory.OTHER,
    description: 'Nairobi City County Single Business Permit annual prorated fee',
    amount: 2000,
    referenceNumber: 'NCC-SBP-2026',
    notes: 'Local trade licensing compliance',
    daysAgo: 1,
  },
]

async function seedExpenses() {
  console.log('Seeding realistic demo expenses...')

  // Find all businesses in the database
  const businesses = await prisma.business.findMany({
    include: {
      memberships: {
        include: {
          user: true,
        },
      },
    },
  })

  if (businesses.length === 0) {
    console.warn('No businesses found in database. Please run seedDemoData.ts first.')
    return
  }

  for (const biz of businesses) {
    console.log(`\nProcessing business: ${biz.name} (${biz.id})`)
    const ownerMember = biz.memberships.find((m) => m.role === 'OWNER') || biz.memberships[0]
    if (!ownerMember) {
      console.warn(`No valid user membership found for business ${biz.name}. Skipping.`)
      continue
    }

    const userId = ownerMember.userId

    // Check if expenses already exist for this business
    const existingCount = await prisma.expense.count({
      where: { businessId: biz.id },
    })

    if (existingCount > 0) {
      console.log(`Business ${biz.name} already has ${existingCount} expenses. Skipping seed.`)
      continue
    }

    const now = new Date()

    for (const exp of REALISTIC_EXPENSES) {
      const expDate = new Date(now.getTime() - exp.daysAgo * 24 * 60 * 60 * 1000)

      await prisma.expense.create({
        data: {
          businessId: biz.id,
          createdById: userId,
          category: exp.category,
          description: exp.description,
          amount: new Prisma.Decimal(exp.amount),
          expenseDate: expDate,
          referenceNumber: exp.referenceNumber,
          notes: exp.notes,
        },
      })
      console.log(`  + [${exp.category}] KES ${exp.amount.toLocaleString()} - ${exp.description}`)
    }

    console.log(`Seeded ${REALISTIC_EXPENSES.length} expenses for ${biz.name}.`)
  }

  console.log('\nExpense seeding completed successfully!')
}

seedExpenses()
  .catch((err) => {
    console.error('Error seeding expenses:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
