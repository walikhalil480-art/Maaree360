import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env.js'
import { healthService, HealthService } from '../services/health.service.js'

export class HealthController {
  constructor(private readonly service: HealthService = healthService) {}

  getLiveness = (_req: Request, res: Response, _next: NextFunction): void => {
    const status = this.service.getLiveness(
      'TillPro Backend API',
      env.NODE_ENV,
      env.DEFAULT_CURRENCY
    )
    res.status(200).json(status)
  }

  getReadiness = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { isReady, status } = await this.service.getReadiness()
      const httpCode = isReady ? 200 : 503
      res.status(httpCode).json(status)
    } catch (error) {
      next(error)
    }
  }
}

export const healthController = new HealthController()
