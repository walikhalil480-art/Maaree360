import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { AppError, errorHandler } from '../middleware/errorHandler.js'

describe('Centralized Error Handler', () => {
  it('should handle AppError with correct status code and code string', async () => {
    const app = express()
    app.get('/test-error', () => {
      throw new AppError('Resource not found', 404, 'NOT_FOUND', { resourceId: '123' })
    })
    app.use(errorHandler)

    const res = await request(app).get('/test-error')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: { resourceId: '123' },
      },
    })
  })

  it('should format ZodError with 400 Bad Request', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email address'),
    })

    const app = express()
    app.use(express.json())
    app.post('/test-zod', (req) => {
      schema.parse(req.body)
    })
    app.use(errorHandler)

    const res = await request(app).post('/test-zod').send({ email: 'bad-email' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details[0].field).toBe('email')
    expect(res.body.error.details[0].message).toBe('Invalid email address')
  })

  it('should mask internal error messages in production mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const app = express()
      app.get('/test-500', () => {
        throw new Error('Database password was leaked')
      })
      app.use(errorHandler)

      const res = await request(app).get('/test-500')

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR')
      expect(res.body.error.message).toBe('An unexpected internal error occurred')
      expect(res.body.error.stack).toBeUndefined()
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })
})
