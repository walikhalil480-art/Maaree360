import { describe, it, expect } from 'vitest'
import { validateEnv } from '../config/env.js'

describe('Environment Configuration Validation', () => {
  const validBaseEnv = {
    NODE_ENV: 'development',
    PORT: '5000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb?schema=public',
    FRONTEND_URL: 'http://localhost:5173',
    DEFAULT_CURRENCY: 'KES',
  }

  it('should successfully parse valid environment variables', () => {
    const parsed = validateEnv(validBaseEnv)
    expect(parsed.NODE_ENV).toBe('development')
    expect(parsed.PORT).toBe(5000)
    expect(parsed.DATABASE_URL).toBe(validBaseEnv.DATABASE_URL)
    expect(parsed.FRONTEND_URL).toBe('http://localhost:5173')
    expect(parsed.DEFAULT_CURRENCY).toBe('KES')
  })

  it('should default PORT to 5000 and DEFAULT_CURRENCY to KES if omitted', () => {
    const parsed = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
    })
    expect(parsed.PORT).toBe(5000)
    expect(parsed.DEFAULT_CURRENCY).toBe('KES')
    expect(parsed.NODE_ENV).toBe('development')
  })

  it('should fallback to CLIENT_URL when FRONTEND_URL is not set', () => {
    const parsed = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
      CLIENT_URL: 'http://localhost:3000',
    })
    expect(parsed.FRONTEND_URL).toBe('http://localhost:3000')
  })

  it('should throw when DATABASE_URL is missing or empty', () => {
    expect(() => validateEnv({ DATABASE_URL: '' })).toThrow(/Environment validation failed/)
  })

  it('should throw when FRONTEND_URL is not a valid URL', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        FRONTEND_URL: 'not-a-valid-url',
      })
    ).toThrow(/Environment validation failed: FRONTEND_URL: Invalid url/)
  })

  it('should throw when PORT is out of range or not an integer', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        PORT: '999999',
      })
    ).toThrow(/Environment validation failed: PORT/)
  })
})
