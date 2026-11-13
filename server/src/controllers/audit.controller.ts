import { Request, Response, NextFunction } from 'express'
import { auditService } from '../services/audit.service.js'
import { AuditLogQueryInput } from '../schemas/audit.schemas.js'

export class AuditController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as AuditLogQueryInput
      const data = await auditService.list(businessId, query)
      res.json({ success: true, data: data.items, pagination: data.pagination })
    } catch (error) {
      next(error)
    }
  }
}

export const auditController = new AuditController()
