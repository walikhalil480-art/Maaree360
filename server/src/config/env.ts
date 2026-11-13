import dotenv from 'dotenv'
import { z } from 'zod'

// Load .env if present
dotenv.config()

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL is required',
    })
    .min(1, 'DATABASE_URL cannot be empty'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DEFAULT_CURRENCY: z.string().min(1).default('KES'),
  SESSION_SECRET: z.string().min(16).default('smartstock-default-insecure-dev-session-secret-32-chars'),
  COOKIE_NAME: z.string().default('smartstock_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  // Payment Providers (Installment 16)
  MPESA_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_SHORTCODE: z.string().default('174379'),
  MPESA_CALLBACK_URL: z.string().optional(),
  CARD_PROVIDER: z.enum(['mock', 'stripe', 'pesapal']).default('mock'),
  CARD_WEBHOOK_SECRET: z.string().optional(),
  // Email & SMTP Provider
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_FROM: z.string().default('MAAREE 360 <no-reply@maaree360.com>'),
})

export type EnvConfig = z.infer<typeof envSchema>

/**
 * Validates a dictionary of environment variables against the schema.
 * Throws a clean descriptive error if validation fails.
 */
export function validateEnv(raw: Record<string, string | undefined> = process.env): EnvConfig {
  // Allow CLIENT_URL as a backwards-compatible alias for FRONTEND_URL if FRONTEND_URL is not provided
  const input = {
    ...raw,
    FRONTEND_URL: raw.FRONTEND_URL || raw.CLIENT_URL || 'http://localhost:5173',
  }

  const result = envSchema.safeParse(input)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Environment validation failed: ${issues}`)
  }

  return result.data
}

let cachedEnv: EnvConfig | null = null

function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv
  try {
    cachedEnv = validateEnv(process.env)
    return cachedEnv
  } catch (error) {
    console.error('Fatal configuration error:', (error as Error).message)
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1)
    }
    throw error
  }
}

export const env = getEnv()
