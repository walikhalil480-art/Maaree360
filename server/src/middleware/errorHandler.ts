import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  public statusCode: number
  public code: string
  public details?: unknown

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production'

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  // Handle Multer upload errors
  if ((err as any).name === 'MulterError') {
    const code = (err as any).code
    const message =
      code === 'LIMIT_FILE_SIZE'
        ? 'File size exceeds maximum allowed limit of 5MB'
        : err.message || 'File upload failed'
    res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message,
      },
    })
    return
  }

  // Handle known operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
    return
  }

  // Handle unexpected or database errors safely
  const statusCode = (err as AppError).statusCode || 500
  const safeMessage = isProduction ? 'An unexpected internal error occurred' : err.message

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: safeMessage,
      ...(!isProduction && err.stack ? { stack: err.stack } : {}),
    },
  })
}
