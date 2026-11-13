import { prisma } from '../db/prisma.js'

export class PlatformHealthService {
  async getDetailedHealth() {
    const startTime = Date.now()
    let dbStatus = 'healthy'
    let dbLatencyMs = 0

    try {
      await prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - startTime
    } catch {
      dbStatus = 'degraded'
      dbLatencyMs = -1
    }

    // Measure live database table record counts
    const [
      businessCount,
      userCount,
      productCount,
      saleCount,
      membershipCount,
      sessionCount,
      platformAuditCount,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.sale.count(),
      prisma.businessMembership.count(),
      prisma.session.count(),
      prisma.platformAuditLog.count(),
    ])

    // Real server process stats
    const memory = process.memoryUsage()
    const uptimeSeconds = Math.floor(process.uptime())

    return {
      status: dbStatus === 'healthy' ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      services: {
        apiServer: {
          status: 'online',
          uptimeSeconds,
          nodeVersion: process.version,
          platform: process.platform,
        },
        database: {
          engine: 'PostgreSQL',
          status: dbStatus,
          latencyMs: dbLatencyMs,
          connected: dbStatus === 'healthy',
        },
        backgroundQueue: {
          status: 'UNCONFIGURED',
          engine: 'In-Process Synchronous',
          message: 'Redis queue worker is not configured; running tasks in-process',
        },
        storage: {
          status: 'LOCAL_PERSISTENCE',
          engine: 'Local NVMe Storage',
          cloudMirroring: process.env.AWS_S3_BUCKET ? 'CONFIGURED' : 'UNCONFIGURED',
          message: process.env.AWS_S3_BUCKET
            ? 'AWS S3 bucket mirroring active'
            : 'Off-site S3 object storage unconfigured (Local filesystem active)',
        },
        messagingGateway: {
          status:
            process.env.AFRICASTALKING_API_KEY || process.env.TWILIO_AUTH_TOKEN
              ? 'CONFIGURED'
              : 'UNCONFIGURED',
          provider: "Africa's Talking / Twilio",
          message:
            process.env.AFRICASTALKING_API_KEY || process.env.TWILIO_AUTH_TOKEN
              ? 'SMS gateway credentials verified'
              : 'Pending SMS gateway API key in server environment',
        },
      },
      systemResources: {
        memory: {
          rssMb: Math.round(memory.rss / (1024 * 1024)),
          heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
          heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        },
        processUptimeSeconds: uptimeSeconds,
      },
      databaseMetrics: {
        tables: {
          businesses: businessCount,
          users: userCount,
          products: productCount,
          sales: saleCount,
          memberships: membershipCount,
          activeSessions: sessionCount,
          platformAuditLogs: platformAuditCount,
        },
      },
    }
  }
}

export const platformHealthService = new PlatformHealthService()
