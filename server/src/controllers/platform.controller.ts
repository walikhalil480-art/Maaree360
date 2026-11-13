import { Request, Response, NextFunction } from 'express'
import { platformOverviewService } from '../services/platformOverview.service.js'
import { platformBusinessService } from '../services/platformBusiness.service.js'
import { platformSubscriptionService } from '../services/platformSubscription.service.js'
import { platformUserService } from '../services/platformUser.service.js'
import { platformHealthService } from '../services/platformHealth.service.js'
import { platformAuditService } from '../services/platformAudit.service.js'
import { platformSupportService } from '../services/platformSupport.service.js'
import { platformSettingsService } from '../services/platformSettings.service.js'
import { platformAnnouncementService } from '../services/platformAnnouncement.service.js'
import { platformIntegrationService } from '../services/platformIntegration.service.js'
import { platformBackupService } from '../services/platformBackup.service.js'

function getActor(req: Request) {
  return {
    id: req.platformAdmin!.id,
    email: req.user!.email,
    role: req.platformAdmin!.role,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
  }
}

export class PlatformController {
  // --- Overview ---
  getOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await platformOverviewService.getOverviewMetrics()
      res.status(200).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // --- Businesses ---
  listBusinesses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await platformBusinessService.listBusinesses(req.query as any)
      res.status(200).json({ success: true, ...data })
    } catch (error) {
      next(error)
    }
  }

  getBusinessById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const business = await platformBusinessService.getBusinessById(req.params.id)
      res.status(200).json({ success: true, business })
    } catch (error) {
      next(error)
    }
  }

  createBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const business = await platformBusinessService.createBusiness(req.body, getActor(req))
      res.status(201).json({ success: true, business })
    } catch (error) {
      next(error)
    }
  }

  updateBusinessStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const business = await platformBusinessService.updateBusinessStatus(
        req.params.id,
        req.body.status,
        req.body.reason,
        getActor(req)
      )
      res.status(200).json({ success: true, business })
    } catch (error) {
      next(error)
    }
  }

  // --- Subscriptions & Plans ---
  listPlans = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans = await platformSubscriptionService.listPlans()
      res.status(200).json({ success: true, plans })
    } catch (error) {
      next(error)
    }
  }

  createPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plan = await platformSubscriptionService.createPlan(req.body, getActor(req))
      res.status(201).json({ success: true, plan })
    } catch (error) {
      next(error)
    }
  }

  updatePlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plan = await platformSubscriptionService.updatePlan(req.params.id, req.body, getActor(req))
      res.status(200).json({ success: true, plan })
    } catch (error) {
      next(error)
    }
  }

  assignSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subscription = await platformSubscriptionService.assignSubscriptionToBusiness(
        req.params.id,
        req.body,
        getActor(req)
      )
      res.status(200).json({ success: true, subscription })
    } catch (error) {
      next(error)
    }
  }

  // --- Platform Users ---
  listAdmins = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admins = await platformUserService.listAdmins()
      res.status(200).json({ success: true, admins })
    } catch (error) {
      next(error)
    }
  }

  createAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = await platformUserService.createAdmin(req.body, getActor(req))
      res.status(201).json({ success: true, admin })
    } catch (error) {
      next(error)
    }
  }

  updateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = await platformUserService.updateAdmin(req.params.id, req.body, getActor(req))
      res.status(200).json({ success: true, admin })
    } catch (error) {
      next(error)
    }
  }

  revokeAdminSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await platformUserService.revokeSessions(req.params.id, getActor(req))
      res.status(200).json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  // --- System Health ---
  getDetailedHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await platformHealthService.getDetailedHealth()
      res.status(200).json({ success: true, health })
    } catch (error) {
      next(error)
    }
  }

  // --- Audit Logs ---
  queryAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await platformAuditService.queryLogs(req.query as any)
      res.status(200).json({ success: true, ...data })
    } catch (error) {
      next(error)
    }
  }

  // --- Support Access ---
  createSupportSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await platformSupportService.createSupportSession(req.body, getActor(req))
      res.status(201).json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  listSupportSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await platformSupportService.listSupportSessions(req.query as any)
      res.status(200).json({ success: true, sessions })
    } catch (error) {
      next(error)
    }
  }

  revokeSupportSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await platformSupportService.revokeSupportSession(req.params.id, getActor(req))
      res.status(200).json({ success: true, session })
    } catch (error) {
      next(error)
    }
  }

  // --- Settings ---
  getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await platformSettingsService.getSettings()
      res.status(200).json({ success: true, settings })
    } catch (error) {
      next(error)
    }
  }

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await platformSettingsService.updateBulkSettings(req.body, getActor(req))
      res.status(200).json({ success: true, settings })
    } catch (error) {
      next(error)
    }
  }

  // --- Announcements ---
  listAnnouncements = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const announcements = await platformAnnouncementService.listAnnouncements()
      res.status(200).json({ success: true, announcements })
    } catch (error) {
      next(error)
    }
  }

  createAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const announcement = await platformAnnouncementService.createAnnouncement(req.body, getActor(req))
      res.status(201).json({ success: true, announcement })
    } catch (error) {
      next(error)
    }
  }

  deleteAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await platformAnnouncementService.deleteAnnouncement(req.params.id, getActor(req))
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  // --- Tenant Users Directory ---
  listTenantUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await platformUserService.listTenantUsers(req.query as any)
      res.status(200).json({ success: true, ...data })
    } catch (error) {
      next(error)
    }
  }

  // --- Subsystems & Integrations ---
  getIntegrations = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const integrations = platformIntegrationService.getIntegrations()
      res.status(200).json({ success: true, integrations })
    } catch (error) {
      next(error)
    }
  }

  // --- Disaster Recovery & Backups ---
  getBackups = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await platformBackupService.listSnapshots()
      res.status(200).json({ success: true, ...data })
    } catch (error) {
      next(error)
    }
  }
}

export const platformController = new PlatformController()
