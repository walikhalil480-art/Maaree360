import { rbacService } from '../services/rbac.service.js'
import { prisma } from '../db/prisma.js'

async function main() {
  console.log('🔄 Seeding RBAC permissions and system role templates...')
  await rbacService.seedSystemRoles()

  const permCount = await prisma.permission.count()
  const roleCount = await prisma.appRole.count()
  console.log(`✅ Seeded ${permCount} system permissions and ${roleCount} roles.`)

  console.log('🔄 Migrating existing business memberships to RBAC assignments...')
  const migrated = await rbacService.syncBusinessMembershipsToRbac()
  console.log(`✅ Successfully synced ${migrated} business membership assignments.`)

  const businesses = await prisma.business.findMany({ select: { id: true, name: true } })
  for (const b of businesses) {
    await rbacService.ensureBusinessRoles(b.id)
  }
  console.log(`✅ Ensured role sets for ${businesses.length} businesses.`)

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error seeding RBAC:', err)
  process.exit(1)
})
