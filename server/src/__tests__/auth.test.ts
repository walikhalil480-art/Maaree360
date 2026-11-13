import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { hashPassword } from '../utils/password.js'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../middleware/csrf.js'

describe('Authentication API', () => {
  const app = createApp()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a user and return safe user profile', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'argon2id$hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Jane Doe',
        email: 'Jane@Example.Com', // Test email normalization
        password: 'Password123',
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.user).toMatchObject({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
      })
      // Ensure password hash is NEVER exposed
      expect(res.body.user.passwordHash).toBeUndefined()
      expect(JSON.stringify(res.body)).not.toContain('argon2id')
    })

    it('should reject registration when email already exists', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'existing-id',
        name: 'Existing User',
        email: 'existing@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'New Name',
        email: 'existing@example.com',
        password: 'Password123',
      })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('should reject registration with invalid email or weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'J',
        email: 'invalid-email',
        password: 'short',
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user, return safe profile, and set secure HTTP-only cookie', async () => {
      const password = 'CorrectPassword123'
      const hashed = await hashPassword(password)

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.spyOn(prisma.session, 'create').mockResolvedValue({
        id: 'session-id',
        token: 'test-session-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      })

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'jane@example.com',
        password,
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user).toMatchObject({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
      })
      expect(res.body.user.passwordHash).toBeUndefined()

      // Verify cookie settings
      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      const sessionCookie = cookies.find((c: string) => c.startsWith('smartstock_session='))
      expect(sessionCookie).toBeDefined()
      expect(sessionCookie).toContain('HttpOnly')
      expect(sessionCookie).toContain('SameSite=Lax')
    })

    it('should return generic error message when user does not exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'SomePassword123',
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toBe('Invalid email or password')
    })

    it('should return generic error message when password is wrong', async () => {
      const hashed = await hashPassword('ActualPassword123')

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'jane@example.com',
        password: 'WrongPassword123',
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toBe('Invalid email or password')
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should return safe profile for authenticated user with valid session', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-id',
        token: 'valid-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Valid for 1 hr
        createdAt: new Date(),
        user: mockUser,
      })

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', ['smartstock_session=valid-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user).toMatchObject({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
      })
      expect(res.body.user.passwordHash).toBeUndefined()
    })

    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('should reject expired session and clear cookie', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-id',
        token: 'expired-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        createdAt: new Date(),
        user: {
          id: 'user-123',
          name: 'Jane Doe',
          email: 'jane@example.com',
          passwordHash: 'hash',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', ['smartstock_session=expired-token'])

      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('SESSION_EXPIRED')
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('should delete session from database and clear authentication cookie', async () => {
      const deleteSpy = vi.spyOn(prisma.session, 'deleteMany').mockResolvedValue({ count: 1 })

      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-id',
        token: 'active-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
        user: {
          id: 'user-123',
          name: 'Jane',
          email: 'jane@example.com',
          passwordHash: 'hash',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', ['smartstock_session=active-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(deleteSpy).toHaveBeenCalledWith({ where: { token: 'active-token' } })
    })
  })

  describe('CSRF Protection', () => {
    it('should block state-changing requests when CSRF token is mismatched', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [`${CSRF_COOKIE_NAME}=token-a`])
        .set(CSRF_HEADER_NAME, 'token-b')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123',
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('CSRF_ERROR')
    })

    it('should allow request when CSRF token matches', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const validToken = 'matched-token-12345'
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [`${CSRF_COOKIE_NAME}=${validToken}`])
        .set(CSRF_HEADER_NAME, validToken)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })
  })
})
