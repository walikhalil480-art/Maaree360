import { prisma } from '../db/prisma.js'
import { verifyPassword } from '../utils/password.js'

const CANDIDATES = [
  'Password123',
  'Password123!',
  'password123',
  'Admin123',
  'Admin123!',
  'admin123',
  '12345678',
  '123456789',
  'tcusub777',
  'tcusub123',
  'Tcusub123',
  'Tcusub777',
  'Tijabo123',
  'Tijabo777',
  'Raqiis123',
  'raqiis123',
  'Raqiis777',
  'raqiis777',
  'Electronics123',
  'SmartStock123',
  'TillPro123',
  'Maaree123',
  'Maaree360'
]

async function run() {
  const users = await prisma.user.findMany({
    where: {
      NOT: [
        { email: { startsWith: 'owner-179' } },
        { email: { startsWith: 'cashier-179' } },
        { email: { startsWith: 'manager-179' } },
        { email: { startsWith: 'clerk-179' } },
        { email: { startsWith: 'test-' } },
        { email: { contains: 'test.co.ke' } }
      ]
    },
    include: {
      memberships: {
        include: { business: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`REAL USERS COUNT: ${users.length}\n`)

  for (const u of users) {
    let matchedPass = 'Custom / Not standard'
    for (const c of CANDIDATES) {
      if (await verifyPassword(c, u.passwordHash)) {
        matchedPass = c
        break
      }
    }

    console.log(`- Name: ${u.name}`)
    console.log(`  Email: ${u.email}`)
    console.log(`  Password: ${matchedPass}`)
    console.log(`  Businesses: ${u.memberships.map(m => `"${m.business.name}" (${m.role})`).join(', ') || 'None'}`)
    console.log(``)
  }

  await prisma.$disconnect()
}

run().catch(console.error)
