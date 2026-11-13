import { prisma } from '../db/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { platformAuditService } from './platformAudit.service.js'

export class PlatformAnnouncementService {
  async listAnnouncements() {
    return await prisma.platformAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async createAnnouncement(
    data: {
      title: string
      content: string
      targetType?: string
      targetIds?: string[]
      priority?: string
      expiresAt?: string
    },
    actor: { id: string; email: string; role: any }
  ) {
    if (!data.title || !data.content) {
      throw new AppError('Title and content are required', 400, 'BAD_REQUEST')
    }

    const announcement = await prisma.platformAnnouncement.create({
      data: {
        title: data.title,
        content: data.content,
        targetType: data.targetType || 'ALL',
        targetIds: data.targetIds || [],
        priority: data.priority || 'INFO',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'announcement.create',
      resourceType: 'PlatformAnnouncement',
      resourceId: announcement.id,
      metadata: {
        title: announcement.title,
        priority: announcement.priority,
        targetType: announcement.targetType,
      },
    })

    return announcement
  }

  async deleteAnnouncement(
    id: string,
    actor: { id: string; email: string; role: any }
  ) {
    const existing = await prisma.platformAnnouncement.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new AppError('Announcement not found', 404, 'NOT_FOUND')
    }

    await prisma.platformAnnouncement.delete({
      where: { id },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'announcement.delete',
      resourceType: 'PlatformAnnouncement',
      resourceId: id,
      metadata: { title: existing.title },
    })

    return { success: true }
  }
}

export const platformAnnouncementService = new PlatformAnnouncementService()
