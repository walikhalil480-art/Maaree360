import { prisma } from '../db/prisma.js'
import { reportService } from '../services/report.service.js'

async function verify() {
  const biz = await prisma.business.findFirst()
  if (!biz) {
    console.log('No business found in database')
    return
  }

  console.log('--- VERIFYING REPORTS FOR BUSINESS ---')
  console.log(`Business: ${biz.name} (${biz.id}) - Currency: ${biz.currency}`)

  // 1. Financial summary
  const summary = await reportService.getFinancialSummary(biz.id, { period: 'this_month' })
  console.log('\n1. Financial Summary Metrics:')
  console.log(`- Gross Sales: KES ${summary.metrics.grossSales}`)
  console.log(`- Discounts: KES ${summary.metrics.discounts}`)
  console.log(`- Refunds: KES ${summary.metrics.refunds}`)
  console.log(`- Net Revenue: KES ${summary.metrics.netRevenue}`)
  console.log(`- COGS: KES ${summary.metrics.cogs}`)
  console.log(`- Gross Profit: KES ${summary.metrics.grossProfit} (${summary.metrics.grossMarginPercent}%)`)
  console.log(`- Operating Expenses: KES ${summary.metrics.operatingExpenses}`)
  console.log(`- Operating Profit: KES ${summary.metrics.operatingProfit} (${summary.metrics.operatingMarginPercent}%)`)
  console.log(`- Completed Sales: ${summary.metrics.transactionCount}`)

  // 2. Revenue Trends
  const trends = await reportService.getRevenueTrends(biz.id, { period: 'this_month' })
  console.log('\n2. Revenue Trends:')
  console.log(`- Time-series data points: ${trends.timeSeries.length}`)
  console.log(`- Payment methods breakdown:`)
  for (const pm of trends.paymentMethods) {
    console.log(`  * ${pm.method}: KES ${pm.totalAmount} (${pm.count} txns, ${pm.percentage}%)`)
  }

  // 3. Product Profitability
  const profitability = await reportService.getProductProfitability(biz.id, {
    period: 'this_month',
    limit: 5,
  })
  console.log('\n3. Top 5 Profitable Products:')
  for (const p of profitability.items) {
    console.log(
      `  * ${p.productName} (${p.sku}): Units Sold=${p.netUnitsSold}, Rev=KES ${p.netRevenue}, Profit=KES ${p.grossProfit} (${p.grossMarginPercent}%)`
    )
  }

  // 4. Inventory Intelligence
  const inv = await reportService.getInventoryIntelligence(biz.id, { lookbackDays: 60, limit: 5 })
  console.log('\n4. Inventory Intelligence:')
  console.log(`- Total Catalog Products: ${inv.summary.totalCatalogProducts}`)
  console.log(`- Stock Valuation: KES ${inv.summary.totalStockValuation}`)
  console.log(`- Units in Stock: ${inv.summary.totalUnitsInStock}`)
  console.log(`- Fast-Moving: ${inv.summary.fastMovingCount}`)
  console.log(`- Slow-Moving: ${inv.summary.slowMovingCount}`)
  console.log(`- Potentially Dead Stock: ${inv.summary.deadStockCount} (Tied Capital: KES ${inv.summary.deadStockValuation})`)
  console.log(`- Out of Stock: ${inv.summary.outOfStockCount}`)
  console.log(`- Annualized Turnover Ratio: ${inv.summary.annualizedTurnoverRatio}x`)

  // 5. CSV Export check
  const csvSummary = await reportService.generateCsvExport(biz.id, {
    type: 'summary',
    format: 'csv',
    period: 'this_month',
    lookbackDays: 60,
  })
  console.log('\n5. CSV Summary Header Check:')
  console.log(csvSummary.slice(0, 200))

  console.log('\n--- VERIFICATION COMPLETED SUCCESSFULLY ---')
}

verify()
  .catch((e) => {
    console.error('Verification failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
