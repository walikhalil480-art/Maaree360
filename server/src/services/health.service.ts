import { checkDatabaseConnection, prisma } from '../db/prisma.js'
import { PrismaClient } from '@prisma/client'

export interface HealthStatus {
  status: 'ok'
  service: string
  environment: string
  currency: string
  timestamp: string
}

export interface ReadinessStatus {
  status: 'ready' | 'unhealthy'
  database: 'connected' | 'disconnected'
  timestamp: string
}

export class HealthService {
  constructor(private readonly dbClient: PrismaClient = prisma) {}

  getLiveness(serviceName: string, environment: string, currency: string): HealthStatus {
    return {
      status: 'ok',
      service: serviceName,
      environment,
      currency,
      timestamp: new Date().toISOString(),
    }
  }

  async getReadiness(): Promise<{ isReady: boolean; status: ReadinessStatus }> {
    const isDbConnected = await checkDatabaseConnection(this.dbClient)

    if (isDbConnected) {
      return {
        isReady: true,
        status: {
          status: 'ready',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      }
    }

    return {
      isReady: false,
      status: {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

export const healthService = new HealthService()
