import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const khalil = await prisma.business.findFirst({ where: { name: 'Khalil Academy' } })
  const city = await prisma.business.findFirst({ where: { name: 'City General Shop' } })
  const shabeele = await prisma.business.findFirst({ where: { name: 'Shabeele Whole Sellers' } })
  const raqiis = await prisma.business.findFirst({ where: { name: 'RAQIIS ELECTRONICS' } })

  if (!khalil || !city || !shabeele || !raqiis) {
    throw new Error('One of the 4 required businesses was not found')
  }

  console.log('Updating Khalil Academy customer records to distinct educational client identities...')
  const khalilCustomers = await prisma.customer.findMany({ where: { businessId: khalil.id } })
  const academyProfiles = [
    { name: 'Fatima Nur (Student Parent)', phone: '+254711122334', email: 'fatima.nur@gmail.com', notes: 'Grade 7 Parent' },
    { name: 'Hassan Ali (Guardian)', phone: '+254722334455', email: 'hassan.ali@gmail.com', notes: 'Boarding Student Guardian' },
    { name: 'Maryan Warsame (Alumni)', phone: '+254733445566', email: 'maryan.w@gmail.com', notes: 'Alumni Association Lead' },
    { name: 'Dahir Mohamed (Parent Rep)', phone: '+254744556677', email: 'dahir.m@gmail.com', notes: 'PTA Committee Member' },
  ]

  for (let i = 0; i < khalilCustomers.length && i < academyProfiles.length; i++) {
    await prisma.customer.update({
      where: { id: khalilCustomers[i].id },
      data: academyProfiles[i],
    })
    console.log(`Updated Khalil customer ${khalilCustomers[i].id} -> ${academyProfiles[i].name}`)
  }

  console.log('\nChecking Shabeele Whole Sellers customers...')
  const shabeeleCustomers = await prisma.customer.findMany({ where: { businessId: shabeele.id } })
  if (shabeeleCustomers.length === 0) {
    const shabeeleProfiles = [
      { name: 'Omar Faruk (Mogadishu Wholesale Hub)', phone: '+254799001122', email: 'omar.faruk@shabeeleclient.com', notes: 'Tier 1 Wholesale Account' },
      { name: 'Halima Osman (Supermarket Retailer)', phone: '+254799334455', email: 'halima.osman@supermarket.so', notes: 'Weekly Bulk Grocery Buyer' },
      { name: 'Aden Guled (Bulk Goods Buyer)', phone: '+254799556677', email: 'aden.guled@supplynet.com', notes: 'Commercial Dry Goods Client' },
    ]
    for (const p of shabeeleProfiles) {
      await prisma.customer.create({
        data: {
          businessId: shabeele.id,
          ...p,
          isActive: true,
        },
      })
      console.log(`Created Shabeele customer -> ${p.name}`)
    }
  }

  console.log('\nChecking RAQIIS ELECTRONICS customers...')
  const raqiisCustomers = await prisma.customer.findMany({ where: { businessId: raqiis.id } })
  if (raqiisCustomers.length === 0) {
    const raqiisProfiles = [
      { name: 'Ahmed Nuur (Wholesale Tech Client)', phone: '+254766112233', email: 'ahmed.nuur@raqiistech.com', notes: 'Distributor Account' },
      { name: 'Warsame Tech Solutions (Corporate Buyer)', phone: '+254766334455', email: 'procurement@warsametech.com', notes: 'Enterprise Hardware Client' },
      { name: 'Jama Ismail (Retail Buyer)', phone: '+254766556677', email: 'jama.ismail@gmail.com', notes: 'Direct Customer' },
    ]
    for (const p of raqiisProfiles) {
      await prisma.customer.create({
        data: {
          businessId: raqiis.id,
          ...p,
          isActive: true,
        },
      })
      console.log(`Created RAQIIS customer -> ${p.name}`)
    }
  }

  console.log('\nCustomer distinct isolation completed successfully!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
