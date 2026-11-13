import { prisma } from '../db/prisma.js';
import { SaleStatus } from '@prisma/client';

export type InsightType =
  | 'DEAD_STOCK'
  | 'DEMAND_SURGE'
  | 'DECLINING_SALES'
  | 'STOCKOUT_RISK'
  | 'TOP_PROFIT_DRIVER'
  | 'LOW_MARGIN_WARNING';

export type InsightSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface BusinessInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  evidence: string;
  recommendedAction: string;
  productId?: string;
  productName?: string;
  sku?: string;
  metricValue?: number;
  metricLabel?: string;
  createdAt: string;
}

export interface InsightsResult {
  businessId: string;
  generatedAt: string;
  summary: {
    totalInsights: number;
    highSeverityCount: number;
    deadStockCapitalTiedUp: number;
    imminentStockoutsCount: number;
  };
  insights: BusinessInsight[];
}

export class InsightsService {
  /**
   * Generates deterministic actionable business insights based on real store records.
   */
  public async getInsights(businessId: string): Promise<InsightsResult> {
    const now = new Date();
    const past7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const past30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const past60DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Fetch active products with stock
    const products = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        stockLevel: true,
      },
    });

    // 2. Fetch completed sales from past 60 days
    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: past60DaysStart },
      },
      select: {
        createdAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            unitPrice: true,
            unitCost: true,
            lineTotal: true,
          },
        },
      },
    });

    // Aggregate product metrics
    const units60d = new Map<string, number>();
    const units30d = new Map<string, number>();
    const units7d = new Map<string, number>();
    const grossProfit30d = new Map<string, number>();
    const revenue30d = new Map<string, number>();

    for (const sale of sales) {
      const is7d = sale.createdAt >= past7DaysStart;
      const is30d = sale.createdAt >= past30DaysStart;

      for (const item of sale.items) {
        const qty = Number(item.quantity);
        const cost = Number(item.unitCost || 0);
        const price = Number(item.unitPrice);
        const profit = (price - cost) * qty;
        const total = Number(item.lineTotal);

        units60d.set(item.productId, (units60d.get(item.productId) || 0) + qty);

        if (is30d) {
          units30d.set(item.productId, (units30d.get(item.productId) || 0) + qty);
          grossProfit30d.set(item.productId, (grossProfit30d.get(item.productId) || 0) + profit);
          revenue30d.set(item.productId, (revenue30d.get(item.productId) || 0) + total);
        }

        if (is7d) {
          units7d.set(item.productId, (units7d.get(item.productId) || 0) + qty);
        }
      }
    }

    const insights: BusinessInsight[] = [];
    let deadStockCapitalTiedUp = 0;
    let imminentStockoutsCount = 0;

    // Evaluate each product
    for (const prod of products) {
      const currentStock = Number(prod.stockLevel?.quantity || 0);
      const costPrice = Number(prod.costPrice);
      const sellingPrice = Number(prod.sellingPrice);
      const sold60 = units60d.get(prod.id) || 0;
      const sold30 = units30d.get(prod.id) || 0;
      const sold7 = units7d.get(prod.id) || 0;

      const dailyRate30d = sold30 / 30;
      const dailyRate7d = sold7 / 7;

      // 1. DEAD STOCK (>60 days with 0 sales and stock > 0)
      const isOlderThan60d = prod.createdAt <= past60DaysStart;
      if (currentStock > 0 && sold60 === 0 && (isOlderThan60d || sales.length > 0)) {
        const tiedUp = currentStock * costPrice;
        deadStockCapitalTiedUp += tiedUp;

        insights.push({
          id: `dead-stock-${prod.id}`,
          type: 'DEAD_STOCK',
          severity: tiedUp > 5000 ? 'HIGH' : 'MEDIUM',
          title: `Dead Stock Alert: ${prod.name}`,
          description: `No units of ${prod.name} have been sold in the past 60 days, while ${currentStock} units remain in inventory.`,
          evidence: `${currentStock} units idle (KES ${Math.round(tiedUp).toLocaleString()} capital tied up)`,
          recommendedAction:
            'Consider introducing a clearance promotional discount, bundle with complementary fast-movers, or negotiate a supplier exchange.',
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          metricValue: Math.round(tiedUp),
          metricLabel: 'Capital Tied Up (KES)',
          createdAt: now.toISOString(),
        });
      }

      // 2. DEMAND SURGE (7d daily rate >= 1.5x 30d daily rate with min 5 units in 7d)
      if (sold7 >= 5 && dailyRate30d > 0 && dailyRate7d >= dailyRate30d * 1.5) {
        const surgePercent = Math.round(((dailyRate7d - dailyRate30d) / dailyRate30d) * 100);
        insights.push({
          id: `surge-${prod.id}`,
          type: 'DEMAND_SURGE',
          severity: 'MEDIUM',
          title: `Demand Surge: ${prod.name}`,
          description: `${prod.name} sales velocity jumped by ${surgePercent}% over the last 7 days compared to its 30-day baseline.`,
          evidence: `${dailyRate7d.toFixed(1)} units/day recently vs ${dailyRate30d.toFixed(1)} units/day historical baseline`,
          recommendedAction:
            'Check current shelf quantities and prepare an early replenishment purchase order before stock runs out.',
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          metricValue: surgePercent,
          metricLabel: 'Demand Surge (%)',
          createdAt: now.toISOString(),
        });
      }

      // 3. DECLINING SALES (7d rate dropped by >50% vs 30d rate, and stock > 10)
      if (sold30 >= 10 && dailyRate30d >= 0.5 && dailyRate7d < dailyRate30d * 0.5 && currentStock > 10) {
        const dropPercent = Math.round(((dailyRate30d - dailyRate7d) / dailyRate30d) * 100);
        insights.push({
          id: `declining-${prod.id}`,
          type: 'DECLINING_SALES',
          severity: 'LOW',
          title: `Sales Slowdown: ${prod.name}`,
          description: `Sales for ${prod.name} slowed by ${dropPercent}% over the past week while holding ${currentStock} units in stock.`,
          evidence: `Recent ${dailyRate7d.toFixed(1)} units/day vs earlier ${dailyRate30d.toFixed(1)} units/day`,
          recommendedAction:
            'Verify product placement and shelf visibility in-store, check expiry dates, and assess competitor retail pricing.',
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          metricValue: dropPercent,
          metricLabel: 'Sales Drop (%)',
          createdAt: now.toISOString(),
        });
      }

      // 4. STOCKOUT RISK (Remaining stock <= 3 days of velocity, or stockout with active demand)
      if (dailyRate30d > 0) {
        const daysLeft = currentStock / dailyRate30d;
        if (daysLeft <= 3) {
          imminentStockoutsCount++;
          const isOut = currentStock === 0;
          insights.push({
            id: `stockout-${prod.id}`,
            type: 'STOCKOUT_RISK',
            severity: 'HIGH',
            title: isOut ? `Stockout Detected: ${prod.name}` : `Imminent Stockout Risk: ${prod.name}`,
            description: isOut
              ? `${prod.name} is completely out of stock with active customer demand (~${dailyRate30d.toFixed(1)} units/day).`
              : `At current sales velocity, existing stock of ${prod.name} (${currentStock} units) will deplete in approximately ${daysLeft.toFixed(1)} days.`,
            evidence: isOut ? '0 units in stock' : `${currentStock} units left (~${daysLeft.toFixed(1)} days of coverage)`,
            recommendedAction:
              'Place a replenishment purchase order immediately or contact supplier for urgent delivery.',
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            metricValue: Math.round(daysLeft * 10) / 10,
            metricLabel: 'Days Coverage',
            createdAt: now.toISOString(),
          });
        }
      }

      // 5. LOW MARGIN WARNING (Margin < 10% or selling price <= cost price)
      if (sellingPrice > 0) {
        const marginPercent = ((sellingPrice - costPrice) / sellingPrice) * 100;
        if (marginPercent < 10) {
          insights.push({
            id: `margin-${prod.id}`,
            type: 'LOW_MARGIN_WARNING',
            severity: marginPercent <= 0 ? 'HIGH' : 'MEDIUM',
            title: `Low Margin Alert: ${prod.name}`,
            description: `Gross profit margin for ${prod.name} is ${marginPercent.toFixed(1)}% (Selling Price: KES ${sellingPrice}, Cost: KES ${costPrice}).`,
            evidence: `Margin is ${marginPercent.toFixed(1)}% (less than target 10% threshold)`,
            recommendedAction:
              'Review retail pricing or negotiate lower procurement volume discounts with the supplier.',
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            metricValue: Math.round(marginPercent * 10) / 10,
            metricLabel: 'Gross Margin (%)',
            createdAt: now.toISOString(),
          });
        }
      }
    }

    // 6. TOP PROFIT DRIVERS (Top 3 products by 30-day gross profit)
    const sortedProfits = Array.from(grossProfit30d.entries())
      .map(([pId, profit]) => ({
        product: products.find((p) => p.id === pId),
        profit,
      }))
      .filter((item) => item.product && item.profit > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);

    for (const item of sortedProfits) {
      if (item.product) {
        insights.push({
          id: `top-profit-${item.product.id}`,
          type: 'TOP_PROFIT_DRIVER',
          severity: 'INFO',
          title: `Top Profit Driver: ${item.product.name}`,
          description: `${item.product.name} contributed KES ${Math.round(item.profit).toLocaleString()} in gross profit over the past 30 days.`,
          evidence: `KES ${Math.round(item.profit).toLocaleString()} gross profit in 30 days`,
          recommendedAction:
            'Maintain continuous shelf availability and avoid stockouts to safeguard store profitability.',
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          metricValue: Math.round(item.profit),
          metricLabel: '30-Day Gross Profit (KES)',
          createdAt: now.toISOString(),
        });
      }
    }

    // Sort insights: HIGH severity first, then MEDIUM, then LOW, then INFO
    const severityWeight: Record<InsightSeverity, number> = {
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };
    insights.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

    return {
      businessId,
      generatedAt: now.toISOString(),
      summary: {
        totalInsights: insights.length,
        highSeverityCount: insights.filter((i) => i.severity === 'HIGH').length,
        deadStockCapitalTiedUp: Math.round(deadStockCapitalTiedUp * 100) / 100,
        imminentStockoutsCount,
      },
      insights,
    };
  }
}

export const insightsService = new InsightsService();
