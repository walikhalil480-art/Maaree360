import { Router } from 'express'
import { reportController } from '../controllers/report.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  reportSummaryQuerySchema,
  revenueTrendQuerySchema,
  profitabilityQuerySchema,
  inventoryIntelligenceQuerySchema,
  reportExportQuerySchema,
} from '../schemas/report.schemas.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. Executive Financial & Sales Summary
router.get(
  '/summary',
  requirePermission('reports.sales.view'),
  validateRequest({ query: reportSummaryQuerySchema }),
  reportController.getSummary
)

// 2. Revenue & Sales Trends
router.get(
  '/revenue-trends',
  requirePermission('reports.sales.view'),
  validateRequest({ query: revenueTrendQuerySchema }),
  reportController.getRevenueTrends
)

// 3. Product Profitability & Margins (Requires finance.profit.view)
router.get(
  '/profitability',
  requirePermission('finance.profit.view'),
  validateRequest({ query: profitabilityQuerySchema }),
  reportController.getProductProfitability
)

// 4. Inventory Intelligence & Dead Stock (Requires reports.inventory.view)
router.get(
  '/inventory-intelligence',
  requirePermission('reports.inventory.view'),
  validateRequest({ query: inventoryIntelligenceQuerySchema }),
  reportController.getInventoryIntelligence
)

// 5. CSV Exports (Requires reports.export)
router.get(
  '/export/csv',
  requirePermission('reports.export'),
  validateRequest({ query: reportExportQuerySchema }),
  reportController.exportCsv
)

// 6. PDF Financial Summaries (Requires reports.export)
router.get(
  '/export/pdf',
  requirePermission('reports.export'),
  validateRequest({ query: reportSummaryQuerySchema }),
  reportController.exportPdf
)

export default router
