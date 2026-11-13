import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as prismaModule from '../db/prisma.js'

describe('Health Endpoints', () => {
  const app = createApp()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/v1/health', () => {
    it('should return 200 OK with service details', async () => {
      const res = await request(app).get('/api/v1/health')

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        status: 'ok',
        service: 'TillPro Backend API',
        currency: 'KES',
      })
      expect(res.body.timestamp).toBeDefined()
      // Ensure no sensitive connection strings or credentials are leaked
      expect(JSON.stringify(res.body)).not.toContain('postgresql://')
      expect(JSON.stringify(res.body)).not.toContain('password')
    })

    it('should maintain backward compatibility at GET /api/health', async () => {
      const res = await request(app).get('/api/health')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })
  })

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 and ready status when database is reachable', async () => {
      vi.spyOn(prismaModule, 'checkDatabaseConnection').mockResolvedValue(true)

      const res = await request(app).get('/api/v1/health/ready')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        status: 'ready',
        database: 'connected',
        timestamp: expect.any(String),
      })
      expect(JSON.stringify(res.body)).not.toContain('postgresql://')
    })

    it('should return 503 and unhealthy status when database is unreachable', async () => {
      vi.spyOn(prismaModule, 'checkDatabaseConnection').mockResolvedValue(false)

      const res = await request(app).get('/api/v1/health/ready')

      expect(res.status).toBe(503)
      expect(res.body).toEqual({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: expect.any(String),
      })
      expect(JSON.stringify(res.body)).not.toContain('postgresql://')
    })
  })
})
