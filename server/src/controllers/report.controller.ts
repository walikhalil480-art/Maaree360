import { Request, Response, NextFunction } from 'express'
import { reportService } from '../services/report.service.js'
import {
  ReportSummaryQuery,
  RevenueTrendQuery,
  ProfitabilityQuery,
  InventoryIntelligenceQuery,
  ReportExportQuery,
} from '../schemas/report.schemas.js'

export class ReportController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as ReportSummaryQuery
      const data = await reportService.getFinancialSummary(businessId, query)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async getRevenueTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as RevenueTrendQuery
      const data = await reportService.getRevenueTrends(businessId, query)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async getProductProfitability(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as ProfitabilityQuery
      const data = await reportService.getProductProfitability(businessId, query)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async getInventoryIntelligence(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as InventoryIntelligenceQuery
      const data = await reportService.getInventoryIntelligence(businessId, query)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as ReportExportQuery
      const csv = await reportService.generateCsvExport(businessId, query)

      const filename = `tillpro-${query.type || 'report'}-${new Date().toISOString().split('T')[0]}.csv`
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csv)
    } catch (error) {
      next(error)
    }
  }

  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as ReportSummaryQuery

      const filename = `tillpro-financial-report-${new Date().toISOString().split('T')[0]}.pdf`
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

      await reportService.generatePdfReport(businessId, query, res)
    } catch (error) {
      next(error)
    }
  }
}

export const reportController = new ReportController()
