export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'

export interface MetricComparison {
  previous: number
  delta: number
  percent: number
}

export interface FinancialSummaryMetrics {
  grossSales: number
  discounts: number
  refunds: number
  netRevenue: number
  cogs: number
  grossProfit: number
  grossMarginPercent: number
  operatingExpenses: number
  operatingProfit: number
  operatingMarginPercent: number
  transactionCount: number
  averageSaleValue: number
  totalUnitsSold: number
  hasEstimatedCosts: boolean
}

export interface FinancialSummaryData {
  currency: string
  period: ReportPeriod
  periodLabel: string
  startDate: string
  endDate: string
  periodDays: number
  precedingStartDate: string
  precedingEndDate: string
  metrics: FinancialSummaryMetrics
  comparisons: {
    grossSales: MetricComparison
    netRevenue: MetricComparison
    grossProfit: MetricComparison
    operatingExpenses: MetricComparison
    operatingProfit: MetricComparison
    transactionCount: MetricComparison
    averageSaleValue: MetricComparison
  }
}

export interface TimeSeriesPoint {
  date: string
  label: string
  grossSales: number
  discounts: number
  refunds: number
  netRevenue: number
  cogs: number
  grossProfit: number
  transactionCount: number
  unitsSold: number
}

export interface PaymentMethodBreakdown {
  method: string
  count: number
  totalAmount: number
  percentage: number
}

export interface RevenueTrendsData {
  currency: string
  period: ReportPeriod
  periodLabel: string
  interval: string
  timeSeries: TimeSeriesPoint[]
  paymentMethods: PaymentMethodBreakdown[]
  totals: {
    grossSales: number
    discounts: number
    refunds: number
    netRevenue: number
    cogs: number
    grossProfit: number
    transactionCount: number
    averageSaleValue: number
    totalUnitsSold: number
  }
}

export interface ProductProfitabilityItem {
  productId: string
  productName: string
  sku: string
  imageUrl?: string | null
  categoryName: string
  unitsSold: number
  unitsReturned: number
  netUnitsSold: number
  grossSales: number
  discounts: number
  refunds: number
  netRevenue: number
  costSum: number
  cogs: number
  grossProfit: number
  grossMarginPercent: number
  snapshotUnitCost: number
  currentCostPrice: number
  hasEstimatedCost: boolean
}

export interface ProductProfitabilityData {
  currency: string
  period: ReportPeriod
  periodLabel: string
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  totals: {
    unitsSold: number
    grossSales: number
    discounts: number
    netRevenue: number
    cogs: number
    grossProfit: number
    grossMarginPercent: number
  }
  items: ProductProfitabilityItem[]
}

export type InventoryClassification =
  | 'ALL'
  | 'FAST_MOVING'
  | 'SLOW_MOVING'
  | 'POTENTIALLY_DEAD_STOCK'
  | 'OUT_OF_STOCK'

export interface InventoryIntelligenceItem {
  productId: string
  productName: string
  sku: string
  imageUrl?: string | null
  categoryName: string
  unit: string
  currentStock: number
  costPrice: number
  sellingPrice: number
  stockValuation: number
  unitsSoldInPeriod: number
  cogsInPeriod: number
  salesVelocity: number
  daysOfInventoryOnHand: number | null
  lastSaleDate: string | null
  daysSinceLastSale: number | null
  hasEverSold: boolean
  classification: 'FAST_MOVING' | 'SLOW_MOVING' | 'POTENTIALLY_DEAD_STOCK' | 'OUT_OF_STOCK'
  annualizedTurnoverRatio: number
}

export interface InventoryIntelligenceSummary {
  totalCatalogProducts: number
  totalStockValuation: number
  totalUnitsInStock: number
  outOfStockCount: number
  fastMovingCount: number
  slowMovingCount: number
  deadStockCount: number
  deadStockValuation: number
  annualizedTurnoverRatio: number
  turnoverFormulaExplanation: string
}

export interface InventoryIntelligenceData {
  currency: string
  lookbackDays: number
  lookbackStartDate: string
  summary: InventoryIntelligenceSummary
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  items: InventoryIntelligenceItem[]
}
