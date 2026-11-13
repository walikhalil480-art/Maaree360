import { prisma } from '../db/prisma.js'
import { platformAuditService } from './platformAudit.service.js'

export const DEFAULT_PLATFORM_SETTINGS = {
  platformName: 'MAAREE 360',
  supportEmail: 'support@maaree360.com',
  maintenanceMode: false,
  allowSelfRegistration: true,
  defaultCurrency: 'KES',
  sessionTtlDays: 7,
  features: {
    mpesaIntegration: true,
    hardwareIntegration: true,
    aiAssistant: true,
    smsAlerts: false,
    multiBranch: true,
    offlinePos: true,
  },
}

export class PlatformSettingsService {
  async getSettings() {
    const records = await prisma.platformSetting.findMany()
    const settingsMap: Record<string, any> = { ...DEFAULT_PLATFORM_SETTINGS }

    for (const r of records) {
      settingsMap[r.key] = r.value
    }

    return settingsMap
  }

  async updateSetting(
    key: string,
    value: any,
    actor: { id: string; email: string; role: any }
  ) {
    const previous = await prisma.platformSetting.findUnique({
      where: { key },
    })

    const updated = await prisma.platformSetting.upsert({
      where: { key },
      update: {
        value,
        updatedBy: actor.email,
      },
      create: {
        key,
        value,
        updatedBy: actor.email,
      },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'setting.update',
      resourceType: 'PlatformSetting',
      resourceId: updated.id,
      metadata: {
        key,
        previousValue: previous?.value,
        newValue: value,
      },
    })

    return updated
  }

  async updateBulkSettings(
    newSettings: Record<string, any>,
    actor: { id: string; email: string; role: any }
  ) {
    for (const [key, value] of Object.entries(newSettings)) {
      await this.updateSetting(key, value, actor)
    }

    return await this.getSettings()
  }
}

export const platformSettingsService = new PlatformSettingsService()
