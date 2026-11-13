import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { validateRequest } from '../middleware/validateRequest.js'
import { errorHandler } from '../middleware/errorHandler.js'

describe('validateRequest Middleware', () => {
  const userSchema = z.object({
    name: z.string().min(2, 'Name must have at least 2 characters'),
    email: z.string().email('Must be a valid email'),
  })

  function createTestApp() {
    const app = express()
    app.use(express.json())

    app.post(
      '/users',
      validateRequest({ body: userSchema }),
      (req, res) => {
        res.status(201).json({ success: true, user: req.body })
      }
    )

    app.use(errorHandler)
    return app
  }

  it('should accept valid requests and forward to handler', async () => {
    const app = createTestApp()

    const res = await request(app).post('/users').send({
      name: 'Grace Hopper',
      email: 'grace@example.com',
    })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      success: true,
      user: {
        name: 'Grace Hopper',
        email: 'grace@example.com',
      },
    })
  })

  it('should reject invalid requests with 400 Bad Request', async () => {
    const app = createTestApp()

    const res = await request(app).post('/users').send({
      name: 'G',
      email: 'invalid-email',
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details).toHaveLength(2)
  })
})
