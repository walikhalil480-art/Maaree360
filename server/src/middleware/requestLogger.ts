import { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Only log detailed requests in non-test environments
  if (process.env.NODE_ENV === 'test') {
    return next()
  }

  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const method = req.method
    const url = req.originalUrl || req.url
    console.log(`[HTTP] ${method} ${url} ${status} - ${duration}ms`)
  })

  next()
}
