import { Router } from 'express'
import { productController } from '../controllers/product.controller.js'
import { productCodeController } from '../controllers/productCode.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../schemas/product.schemas.js'
import { addProductCodeSchema } from '../schemas/productCode.schemas.js'
import { productImageUpload } from '../middleware/upload.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// List products
router.get(
  '/',
  requirePermission('products.view'),
  validateRequest({ query: productQuerySchema }),
  productController.list
)

// Product modifications restricted via granular RBAC
router.post(
  '/',
  requirePermission('products.create'),
  validateRequest({ body: createProductSchema }),
  productController.create
)

// Upload image file
router.post(
  '/upload-image',
  requirePermission('products.create'),
  productImageUpload.single('image'),
  productController.uploadImage
)

// Update product image directly
router.patch(
  '/:productId/image',
  requirePermission('products.edit'),
  productImageUpload.single('image'),
  productController.updateImage
)

// Get single product details
router.get(
  '/:productId',
  requirePermission('products.view'),
  productController.getById
)

router.patch(
  '/:productId',
  requirePermission('products.edit'),
  validateRequest({ body: updateProductSchema }),
  productController.update
)

router.patch(
  '/:productId/archive',
  requirePermission('products.delete'),
  productController.archive
)

router.patch(
  '/:productId/reactivate',
  requirePermission('products.delete'),
  productController.reactivate
)

// Product Codes Management
router.get(
  '/:productId/codes',
  requirePermission('products.view'),
  productCodeController.list
)

router.post(
  '/:productId/codes',
  requirePermission('products.barcodes.manage'),
  validateRequest({ body: addProductCodeSchema }),
  productCodeController.add
)

router.delete(
  '/:productId/codes/:codeId',
  requirePermission('products.barcodes.manage'),
  productCodeController.remove
)

export default router
