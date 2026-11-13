import crypto from 'node:crypto'

/**
 * Generates a cryptographically secure random hexadecimal token.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Generates a URL-friendly, sanitized slug from a name string.
 */
export function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const suffix = crypto.randomBytes(3).toString('hex')
  return `${base || 'business'}-${suffix}`
}
