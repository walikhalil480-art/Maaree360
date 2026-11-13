import { prisma } from '../db/prisma.js';
import { Role } from '@prisma/client';
import { UpdateAlertSettingsInput } from '../schemas/notification.schemas.js';

export const DEFAULT_ALERT_SETTINGS = {
  lowStockAlertsEnabled: true,
  lowStockThresholdDefault: 5,
  reorderRemindersEnabled: true,
  unusualSalesAlertsEnabled: true,
  salesSurgeThresholdPercent: 50,
  salesDropThresholdPercent: 50,
  salesLookbackDays: 30,
  minSalesSampleSize: 5,
  emailAlertsEnabled: false,
  smsAlertsEnabled: false,
  recipientRoles: [Role.OWNER, Role.MANAGER],
};

export class AlertSettingsService {
  /**
   * Retrieves alert settings for the specified business, returning defaults if not yet customized.
   */
  public async getSettings(businessId: string) {
    const settings = await prisma.alertSetting.findUnique({
      where: { businessId },
    });

    if (settings) {
      return settings;
    }

    // Upsert default settings for new business
    try {
      return await prisma.alertSetting.upsert({
        where: { businessId },
        create: {
          businessId,
          ...DEFAULT_ALERT_SETTINGS,
        },
        update: {},
      });
    } catch {
      return {
        id: `default-settings-${businessId}`,
        businessId,
        alertEmail: null,
        alertPhoneNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...DEFAULT_ALERT_SETTINGS,
      };
    }
  }

  /**
   * Updates alert settings for the business and logs an audit record.
   */
  public async updateSettings(
    businessId: string,
    actorId: string,
    input: UpdateAlertSettingsInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const updated = await prisma.alertSetting.upsert({
      where: { businessId },
      create: {
        businessId,
        lowStockAlertsEnabled: input.lowStockAlertsEnabled ?? DEFAULT_ALERT_SETTINGS.lowStockAlertsEnabled,
        lowStockThresholdDefault:
          input.lowStockThresholdDefault ?? DEFAULT_ALERT_SETTINGS.lowStockThresholdDefault,
        reorderRemindersEnabled:
          input.reorderRemindersEnabled ?? DEFAULT_ALERT_SETTINGS.reorderRemindersEnabled,
        unusualSalesAlertsEnabled:
          input.unusualSalesAlertsEnabled ?? DEFAULT_ALERT_SETTINGS.unusualSalesAlertsEnabled,
        salesSurgeThresholdPercent:
          input.salesSurgeThresholdPercent ?? DEFAULT_ALERT_SETTINGS.salesSurgeThresholdPercent,
        salesDropThresholdPercent:
          input.salesDropThresholdPercent ?? DEFAULT_ALERT_SETTINGS.salesDropThresholdPercent,
        salesLookbackDays: input.salesLookbackDays ?? DEFAULT_ALERT_SETTINGS.salesLookbackDays,
        minSalesSampleSize: input.minSalesSampleSize ?? DEFAULT_ALERT_SETTINGS.minSalesSampleSize,
        emailAlertsEnabled: input.emailAlertsEnabled ?? DEFAULT_ALERT_SETTINGS.emailAlertsEnabled,
        smsAlertsEnabled: input.smsAlertsEnabled ?? DEFAULT_ALERT_SETTINGS.smsAlertsEnabled,
        recipientRoles: input.recipientRoles ?? DEFAULT_ALERT_SETTINGS.recipientRoles,
      },
      update: {
        ...input,
      },
    });

    // Create Audit Log entry
    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'ALERT_SETTINGS_UPDATED',
        resourceType: 'ALERT_SETTING',
        resourceId: updated.id,
        description: 'Business notification and alert policies updated',
        metadata: input as any,
        ipAddress,
        userAgent,
      },
    });

    return updated;
  }
}

export const alertSettingsService = new AlertSettingsService();
