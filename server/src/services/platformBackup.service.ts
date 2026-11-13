import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { platformAuditService } from './platformAudit.service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKUPS_DIR = path.resolve(__dirname, '../../backups')

export interface BackupSnapshot {
  id: string
  filename: string
  sizeBytes: number
  sizeMb: number
  createdAt: string
  storageType: string
  cloudReplication: string
}

export class PlatformBackupService {
  private ensureDirectory() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      try {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true })
      } catch (err) {
        console.error('[PlatformBackupService] Failed to create backups dir:', err)
      }
    }
  }

  async listSnapshots() {
    this.ensureDirectory()

    const snapshots: BackupSnapshot[] = []

    if (fs.existsSync(BACKUPS_DIR)) {
      const files = fs.readdirSync(BACKUPS_DIR)
      for (const file of files) {
        if (file.endsWith('.dump') || file.endsWith('.sql') || file.endsWith('.tar')) {
          try {
            const stats = fs.statSync(path.join(BACKUPS_DIR, file))
            snapshots.push({
              id: file,
              filename: file,
              sizeBytes: stats.size,
              sizeMb: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
              createdAt: stats.birthtime.toISOString(),
              storageType: 'Local NVMe',
              cloudReplication: 'UNCONFIGURED',
            })
          } catch {
            // Ignore unreadable file
          }
        }
      }
    }

    // Sort by most recent
    snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      snapshots,
      totalCount: snapshots.length,
      storageEngine: 'PostgreSQL 16+',
      backupDirectory: './backups',
      cloudReplication: process.env.AWS_S3_BUCKET ? 'CONFIGURED' : 'UNCONFIGURED',
    }
  }
}

export const platformBackupService = new PlatformBackupService()
