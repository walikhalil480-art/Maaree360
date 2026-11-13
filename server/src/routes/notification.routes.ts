import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  listNotificationsQuerySchema,
  updateAlertSettingsSchema,
} from '../schemas/notification.schemas.js';
import { requireAuth, requireBusinessMember } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router({ mergeParams: true });

// Require authentication and active membership in the business
router.use(requireAuth);
router.use(requireBusinessMember());

// List notifications with filters & pagination
router.get('/', validateRequest({ query: listNotificationsQuerySchema }), notificationController.list);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all notifications as read
router.post('/mark-all-read', notificationController.markAllRead);

// Mark single notification as read
router.patch('/:notificationId/read', notificationController.markRead);

// Dismiss a notification
router.patch('/:notificationId/dismiss', notificationController.dismiss);

// Archive a notification
router.patch('/:notificationId/archive', notificationController.archive);

// Get alert settings
router.get('/settings', notificationController.getSettings);

// Update alert settings (OWNER and MANAGER only)
router.put(
  '/settings',
  requireBusinessMember([Role.OWNER, Role.MANAGER]),
  validateRequest({ body: updateAlertSettingsSchema }),
  notificationController.updateSettings
);

// Trigger on-demand reconciliation of alerts (OWNER and MANAGER only)
router.post(
  '/reconcile',
  requireBusinessMember([Role.OWNER, Role.MANAGER]),
  notificationController.reconcile
);

export default router;
