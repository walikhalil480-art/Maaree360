import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Checks if the PostgreSQL database is reachable and accepting queries.
 * Returns true if connection succeeds, false otherwise.
 */
export async function checkDatabaseConnection(client: PrismaClient = prisma): Promise<boolean> {
  try {
    await client.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/**
 * Executes a callback within a database transaction scoped with tenant session context:
 * `SET LOCAL app.current_business_id = '<businessId>'`
 * Provides defence-in-depth at the database connection / transaction level (Section 5).
 */
export async function withTenantContext<T>(
  businessId: string,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Validate UUID format to prevent SQL injection in raw session config
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (uuidRegex.test(businessId)) {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_business_id = '${businessId}'`)
    }
    return callback(tx)
  })
}

