import { prisma } from '../db/prisma.js'
import { verifyPassword } from '../utils/password.js'

const CANDIDATE_PASSWORDS = [
  'Password123',
  'Password123!',
  'password123',
  'Admin123',
  'Admin123!',
  'admin123',
  '12345678',
  'smartstock',
  'tillpro',
  'SmartStock123',
  'TillPro123',
  'Maaree123',
  'Maaree360',
  'secret',
  'test1234',
  'Trader123'
]

async function run() {
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          business: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`\n========================================`)
  console.log(`TOTAL REGISTERED USERS: ${users.length}`)
  console.log(`========================================\n`)

  for (const u of users) {
    let matchedPass = 'Not in standard demo list (Custom password)'
    for (const cand of CANDIDATE_PASSWORDS) {
      const match = await verifyPassword(cand, u.passwordHash)
      if (match) {
        matchedPass = cand
        break
      }
    }

    console.log(`USER: ${u.name}`)
    console.log(`EMAIL: ${u.email}`)
    console.log(`PASSWORD: ${matchedPass}`)
    console.log(`PHONE: ${u.phone || 'None'}`)
    console.log(`CREATED: ${u.createdAt.toLocaleDateString()}`)
    console.log(`ROLES & BUSINESSES:`)
    if (u.memberships.length === 0) {
      console.log(`  (No store memberships assigned yet)`)
    } else {
      for (const m of u.memberships) {
        console.log(`  - Business: "${m.business.name}" | Role: ${m.role}`)
      }
    }
    console.log(`----------------------------------------\n`)
  }

  await prisma.$disconnect()
}

run().catch(console.error)
