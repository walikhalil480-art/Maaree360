import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { AppError } from './errorHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve path to client/public/products/uploads or configurable container mount
export const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../../client/public/products/uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Ensure dir exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`
    const rawExt = path.extname(file.originalname).toLowerCase()
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp']
    const safeExt = allowedExts.includes(rawExt) ? rawExt : '.jpg'
    cb(null, `prod-${uniqueSuffix}${safeExt}`)
  },
})

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new AppError(
        'Unsupported file type. Please upload a JPG, PNG, or WebP image.',
        400,
        'INVALID_FILE_TYPE'
      )
    )
  }
}

export const productImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter,
})
