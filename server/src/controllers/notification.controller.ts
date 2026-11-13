import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service.js';
import { alertSettingsService } from '../services/alertSettings.service.js';
import { alertEvaluationService } from '../services/alertEvaluation.service.js';
import {
  ListNotificationsQueryInput,
  UpdateAlertSettingsInput,
} from '../schemas/notification.schemas.js';
import { Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

export class NotificationController {
  /**
   * List notifications for the authenticated user and business.
   */
  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const userRole = (req as any).membership.role as Role;
      const query = req.query as unknown as ListNotificationsQueryInput;

      const result = await notificationService.listNotifications(
        businessId,
        userId,
        userRole,
        query
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread count for badge indicators.
   */
  public async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const userRole = (req as any).membership.role as Role;

      const result = await notificationService.getUnreadCount(businessId, userId, userRole);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark a single notification as read.
   */
  public async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, notificationId } = req.params;

      const updated = await notificationService.markAsRead(businessId, notificationId);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all eligible unread notifications as read.
   */
  public async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const userRole = (req as any).membership.role as Role;

      const result = await notificationService.markAllAsRead(businessId, userId, userRole);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dismiss a notification.
   */
  public async dismiss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, notificationId } = req.params;

      const updated = await notificationService.dismissNotification(businessId, notificationId);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Archive a notification.
   */
  public async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, notificationId } = req.params;

      const updated = await notificationService.archiveNotification(businessId, notificationId);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get alert settings for business.
   */
  public async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;

      const settings = await alertSettingsService.getSettings(businessId);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update alert settings (restricted to OWNER and MANAGER).
   */
  public async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const userRole = (req as any).membership.role as Role;
      const userId = req.user!.id;
      const body = req.body as UpdateAlertSettingsInput;

      if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
        throw new AppError(
          'Only business owners and managers can update notification settings.',
          403,
          'FORBIDDEN'
        );
      }

      const updated = await alertSettingsService.updateSettings(
        businessId,
        userId,
        body,
        req.ip,
        req.get('user-agent')
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reconcile all alerts for the business.
   */
  public async reconcile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;

      const result = await alertEvaluationService.reconcileAllAlerts(businessId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
