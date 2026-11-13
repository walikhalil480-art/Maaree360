/**
 * SmartStock API client helper with cookie credentials and automatic CSRF header injection.
 */

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
  return match ? decodeURIComponent(match[3]) : null
}

export class ApiError extends Error {
  public code?: string
  public status: number
  public details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Inject CSRF token for mutating requests if available
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    (options.method || 'GET').toUpperCase()
  )

  if (isMutating) {
    const csrfToken = getCookie('XSRF-TOKEN')
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken)
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Always send and receive HTTP-only cookies
  })

  // Parse JSON response
  let data: any
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = { message: await response.text() }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.message || `Request failed with status ${response.status}`
    const code = data?.error?.code
    const details = data?.error?.details
    throw new ApiError(message, response.status, code, details)
  }

  return data as T
}
