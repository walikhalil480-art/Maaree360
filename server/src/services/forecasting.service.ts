import { prisma } from '../db/prisma.js';
import { SaleStatus } from '@prisma/client';

export interface DailyForecastPoint {
  date: string;
  dayOfWeek: string;
  projectedRevenue: number;
  projectedUnits: number;
  lowerBound: number;
  upperBound: number;
}

export interface ProductForecastSummary {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  dailyVelocity: number;
  projectedUnits: number;
  projectedRevenue: number;
  daysOfStockRemaining: number | null;
  stockoutRisk: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ForecastResult {
  businessId: string;
  horizonDays: number;
  hasSufficientData: boolean;
  dataQualityNote: string;
  historicalPeriodRevenue: number;
  historicalDailyAvg: number;
  projectedRevenue: number;
  projectedGrowthRate: number;
  dailyForecast: DailyForecastPoint[];
  topProductsForecast: ProductForecastSummary[];
  productForecast?: ProductForecastSummary;
}

export class ForecastingService {
  /**
   * Helper to format a date in Nairobi timezone YYYY-MM-DD
   */
  private formatNairobiDate(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  /**
   * Helper to get Day of Week name in Nairobi
   */
  private getDayOfWeekName(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      weekday: 'short',
    }).format(date);
  }

  /**
   * Computes sales forecast for 7 or 30 days horizon.
   */
  public async getForecast(
    businessId: string,
    horizonDays: number = 30,
    targetProductId?: string
  ): Promise<ForecastResult> {
    const horizon = horizonDays === 7 ? 7 : 30;

    // Analyze historical sales from the past 60 days
    const now = new Date();
    const historyDays = Math.max(60, horizon * 2);
    const historyStartDate = new Date(now.getTime() - historyDays * 24 * 60 * 60 * 1000);

    // Fetch historical completed sales
    const completedSales = await prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: historyStartDate },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group sales by Nairobi calendar day
    const dailyMap = new Map<string, { revenue: number; units: number; dateObj: Date }>();
    const productSalesMap = new Map<
      string,
      { totalUnits: number; totalRevenue: number; dailyUnits: Map<string, number> }
    >();

    for (const sale of completedSales) {
      const dayStr = this.formatNairobiDate(sale.createdAt);
      const existing = dailyMap.get(dayStr) || { revenue: 0, units: 0, dateObj: sale.createdAt };
      existing.revenue += Number(sale.total);

      for (const item of sale.items) {
        existing.units += Number(item.quantity);

        let pStats = productSalesMap.get(item.productId);
        if (!pStats) {
          pStats = { totalUnits: 0, totalRevenue: 0, dailyUnits: new Map() };
          productSalesMap.set(item.productId, pStats);
        }
        pStats.totalUnits += Number(item.quantity);
        pStats.totalRevenue += Number(item.lineTotal);
        const pDayUnits = pStats.dailyUnits.get(dayStr) || 0;
        pStats.dailyUnits.set(dayStr, pDayUnits + Number(item.quantity));
      }

      dailyMap.set(dayStr, existing);
    }

    const distinctDaysCount = dailyMap.size;
    const hasSufficientData = distinctDaysCount >= 7;
    const dataQualityNote = hasSufficientData
      ? `Forecast is modeled using ${distinctDaysCount} days of historical sales and day-of-week seasonality.`
      : `Limited historical sales data (${distinctDaysCount} active sales days recorded, requires at least 7). Projections use conservative baseline averages.`;

    // Calculate historical baseline for the past equivalent period (past 7 or 30 days)
    const recentWindowStart = new Date(now.getTime() - horizon * 24 * 60 * 60 * 1000);
    const recentSales = completedSales.filter((s) => s.createdAt >= recentWindowStart);
    const historicalPeriodRevenue = recentSales.reduce((sum, s) => sum + Number(s.total), 0);
    const historicalDailyAvg =
      horizon > 0 ? Math.round((historicalPeriodRevenue / horizon) * 100) / 100 : 0;

    // Day of week seasonality index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dowRevenueSums = [0, 0, 0, 0, 0, 0, 0];
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    const dowUnitSums = [0, 0, 0, 0, 0, 0, 0];

    for (const [_, dayData] of dailyMap.entries()) {
      const dow = dayData.dateObj.getDay();
      dowRevenueSums[dow] += dayData.revenue;
      dowUnitSums[dow] += dayData.units;
      dowCounts[dow] += 1;
    }

    const overallDailyRevenueAvg =
      distinctDaysCount > 0
        ? Array.from(dailyMap.values()).reduce((sum, d) => sum + d.revenue, 0) / distinctDaysCount
        : 0;

    const overallDailyUnitsAvg =
      distinctDaysCount > 0
        ? Array.from(dailyMap.values()).reduce((sum, d) => sum + d.units, 0) / distinctDaysCount
        : 0;

    const dowSeasonality = [1, 1, 1, 1, 1, 1, 1];
    for (let i = 0; i < 7; i++) {
      if (dowCounts[i] > 0 && overallDailyRevenueAvg > 0) {
        const avgForDow = dowRevenueSums[i] / dowCounts[i];
        // clamp seasonal index between 0.3 and 2.5
        dowSeasonality[i] = Math.max(0.3, Math.min(2.5, avgForDow / overallDailyRevenueAvg));
      }
    }

    // Linear trend (slope m, intercept c)
    const sortedDays = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let slope = 0;
    let intercept = overallDailyRevenueAvg;

    if (sortedDays.length >= 7) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      const n = sortedDays.length;

      sortedDays.forEach(([_, data], index) => {
        sumX += index;
        sumY += data.revenue;
        sumXY += index * data.revenue;
        sumXX += index * index;
      });

      const denominator = n * sumXX - sumX * sumX;
      if (denominator !== 0) {
        slope = (n * sumXY - sumX * sumY) / denominator;
        intercept = (sumY - slope * sumX) / n;
      }
    }

    // Calculate residuals standard deviation for confidence bounds
    let sumSquaredResiduals = 0;
    sortedDays.forEach(([_, data], index) => {
      const expected = Math.max(0, intercept + slope * index);
      const diff = data.revenue - expected;
      sumSquaredResiduals += diff * diff;
    });

    const residualStdDev =
      sortedDays.length > 1
        ? Math.sqrt(sumSquaredResiduals / (sortedDays.length - 1))
        : overallDailyRevenueAvg * 0.25;

    // Generate daily forecast points into future
    const dailyForecast: DailyForecastPoint[] = [];
    let projectedRevenueTotal = 0;
    const startIndex = sortedDays.length;

    for (let i = 1; i <= horizon; i++) {
      const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dow = futureDate.getDay();
      const seasonFactor = dowSeasonality[dow];

      // Base trend estimation with seasonality
      const trendBase = Math.max(0, intercept + slope * (startIndex + i));
      const projectedRev = Math.max(
        0,
        Math.round((hasSufficientData ? trendBase * seasonFactor : historicalDailyAvg * seasonFactor) * 100) / 100
      );

      const estimatedUnits =
        overallDailyRevenueAvg > 0
          ? Math.max(0, Math.round((projectedRev / (overallDailyRevenueAvg / Math.max(1, overallDailyUnitsAvg)))))
          : Math.round(overallDailyUnitsAvg);

      // 95% Confidence Interval
      const margin = 1.96 * residualStdDev * Math.sqrt(1 + i / horizon);
      const lower = Math.max(0, Math.round((projectedRev - margin) * 100) / 100);
      const upper = Math.round((projectedRev + margin) * 100) / 100;

      projectedRevenueTotal += projectedRev;

      dailyForecast.push({
        date: this.formatNairobiDate(futureDate),
        dayOfWeek: this.getDayOfWeekName(futureDate),
        projectedRevenue: projectedRev,
        projectedUnits: estimatedUnits,
        lowerBound: lower,
        upperBound: upper,
      });
    }

    projectedRevenueTotal = Math.round(projectedRevenueTotal * 100) / 100;

    const projectedGrowthRate =
      historicalPeriodRevenue > 0
        ? Math.round(((projectedRevenueTotal - historicalPeriodRevenue) / historicalPeriodRevenue) * 1000) / 10
        : 0;

    // Load active products to evaluate product-level velocity and stockout risk
    const products = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        stockLevel: true,
      },
    });

    const productSummaries: ProductForecastSummary[] = [];

    for (const prod of products) {
      const pStats = productSalesMap.get(prod.id);
      const currentStock = Number(prod.stockLevel?.quantity || 0);

      // Calculate velocity over past 30 days
      const past30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let unitsSold30d = 0;
      let revenueSold30d = 0;

      for (const sale of completedSales) {
        if (sale.createdAt >= past30DaysStart) {
          for (const item of sale.items) {
            if (item.productId === prod.id) {
              unitsSold30d += Number(item.quantity);
              revenueSold30d += Number(item.lineTotal);
            }
          }
        }
      }

      const dailyVelocity = Math.round((unitsSold30d / 30) * 100) / 100;
      const projectedUnits = Math.round(dailyVelocity * horizon);
      const projectedRevenue = Math.round(projectedUnits * Number(prod.sellingPrice) * 100) / 100;

      let daysOfStockRemaining: number | null = null;
      let stockoutRisk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

      if (dailyVelocity > 0) {
        daysOfStockRemaining = Math.max(0, Math.round((currentStock / dailyVelocity) * 10) / 10);
        if (daysOfStockRemaining <= 3) {
          stockoutRisk = 'HIGH';
        } else if (daysOfStockRemaining <= 7) {
          stockoutRisk = 'MEDIUM';
        } else {
          stockoutRisk = 'LOW';
        }
      } else if (currentStock === 0) {
        daysOfStockRemaining = 0;
        stockoutRisk = 'HIGH';
      }

      productSummaries.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        currentStock,
        dailyVelocity,
        projectedUnits,
        projectedRevenue,
        daysOfStockRemaining,
        stockoutRisk,
      });
    }

    // Sort by projected revenue descending for top products
    const sortedProductSummaries = [...productSummaries].sort(
      (a, b) => b.projectedRevenue - a.projectedRevenue
    );
    const topProductsForecast = sortedProductSummaries.slice(0, 10);

    const productForecast = targetProductId
      ? productSummaries.find((p) => p.productId === targetProductId)
      : undefined;

    return {
      businessId,
      horizonDays: horizon,
      hasSufficientData,
      dataQualityNote,
      historicalPeriodRevenue: Math.round(historicalPeriodRevenue * 100) / 100,
      historicalDailyAvg,
      projectedRevenue: projectedRevenueTotal,
      projectedGrowthRate,
      dailyForecast,
      topProductsForecast,
      productForecast,
    };
  }
}

export const forecastingService = new ForecastingService();
