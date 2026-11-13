import { prisma } from '../db/prisma.js';
import { NotificationType, NotificationSeverity, SaleStatus } from '@prisma/client';
import { notificationService } from './notification.service.js';
import { alertSettingsService } from './alertSettings.service.js';
import { restockService } from './restock.service.js';

export class AlertEvaluationService {
  /**
   * Evaluates a single product's stock against its minimum threshold.
   * Creates low stock alert if below threshold, or resolves ongoing alert if recovered.
   */
  public async evaluateProductStock(businessId: string, productId: string) {
    try {
      const settings = await alertSettingsService.getSettings(businessId);
      if (!settings.lowStockAlertsEnabled) return;

      const product = await prisma.product.findFirst({
        where: { id: productId, businessId },
        include: { stockLevel: true },
      });

      if (!product || !product.isActive) return;

      const threshold =
        product.minStockThreshold > 0
          ? product.minStockThreshold
          : settings.lowStockThresholdDefault;

      const currentStock = Number(product.stockLevel?.quantity || 0);
      const conditionKey = `LOW_STOCK:${product.id}`;

      if (currentStock <= threshold) {
        const isStockout = currentStock <= 0;
        const severity = isStockout ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING;
        const title = isStockout ? `Out of Stock: ${product.name}` : `Low Stock Alert: ${product.name}`;
        const message = isStockout
          ? `${product.name} (SKU: ${product.sku}) is completely out of stock (0 ${product.unit}). Immediate replenishment is recommended.`
          : `${product.name} (SKU: ${product.sku}) reached ${currentStock} ${product.unit}, which is at or below the minimum threshold of ${threshold} ${product.unit}.`;

        await notificationService.createNotification({
          businessId,
          type: NotificationType.LOW_STOCK,
          severity,
          title,
          message,
          resourceType: 'PRODUCT',
          resourceId: product.id,
          actionUrl: '/inventory',
          conditionKey,
          metadata: {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unit: product.unit,
            currentStock,
            threshold,
          },
        });
      } else {
        // Stock has risen above threshold; resolve ongoing low stock condition
        await notificationService.resolveCondition(businessId, conditionKey);
      }
    } catch (err) {
      console.error(`[AlertEvaluationService] Error evaluating stock for ${productId}:`, err);
    }
  }

  /**
   * Evaluates restocking needs using the dynamic ROP service from Installment 14.
   */
  public async evaluateReorderReminders(businessId: string) {
    try {
      const settings = await alertSettingsService.getSettings(businessId);
      if (!settings.reorderRemindersEnabled) return;

      const restockData = await restockService.getRecommendations(businessId);

      for (const rec of restockData.recommendations) {
        if (
          (rec.urgency === 'CRITICAL' || rec.urgency === 'WARNING') &&
          rec.suggestedQuantity > 0
        ) {
          const conditionKey = `REORDER:${rec.productId}`;
          const severity =
            rec.urgency === 'CRITICAL' ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING;

          const title = `Reorder Reminder: ${rec.productName}`;
          const message = `Replenishment suggested: ${rec.productName} (SKU: ${rec.sku}) has ${rec.currentStock} units in stock. Reorder Point is ${rec.reorderPoint} (Safety Stock: ${rec.safetyStock}, demand: ${rec.dailyDemand.toFixed(1)} u/day). Suggested order: ${rec.suggestedQuantity} units from ${rec.primarySupplier?.name || 'supplier'}.`;

          await notificationService.createNotification({
            businessId,
            type: NotificationType.REORDER_REMINDER,
            severity,
            title,
            message,
            resourceType: 'PURCHASE_ORDER',
            resourceId: rec.productId,
            actionUrl: '/purchases',
            conditionKey,
            metadata: {
              productId: rec.productId,
              productName: rec.productName,
              sku: rec.sku,
              currentStock: rec.currentStock,
              onOrderQuantity: rec.onOrderQuantity,
              suggestedQuantity: rec.suggestedQuantity,
              reorderPoint: rec.reorderPoint,
              estimatedCost: rec.estimatedCost,
              supplierName: rec.primarySupplier?.name ?? null,
            },
          });
        }
      }
    } catch (err) {
      console.error('[AlertEvaluationService] Error evaluating reorders:', err);
    }
  }

  /**
   * Detects unusual sales activity (surges or sharp drops) using statistical baselines.
   */
  public async evaluateUnusualSales(businessId: string) {
    try {
      const settings = await alertSettingsService.getSettings(businessId);
      if (!settings.unusualSalesAlertsEnabled) return;

      const now = new Date();
      const past30DaysStart = new Date(now.getTime() - settings.salesLookbackDays * 24 * 60 * 60 * 1000);
      const past7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().slice(0, 10);

      // Fetch completed sales within lookback period
      const sales = await prisma.sale.findMany({
        where: {
          businessId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: past30DaysStart },
        },
        select: {
          createdAt: true,
          items: {
            select: {
              productId: true,
              productName: true,
              productSku: true,
              quantity: true,
            },
          },
        },
      });

      // Require sufficient historical sales count before generating statistical alerts
      if (sales.length < 5) return;

      // Group sales units
      const units30d = new Map<string, { name: string; sku: string; units: number }>();
      const units7d = new Map<string, number>();

      for (const sale of sales) {
        const is7d = sale.createdAt >= past7DaysStart;
        for (const item of sale.items) {
          const qty = Number(item.quantity);
          const current30 = units30d.get(item.productId) || {
            name: item.productName,
            sku: item.productSku,
            units: 0,
          };
          current30.units += qty;
          units30d.set(item.productId, current30);

          if (is7d) {
            units7d.set(item.productId, (units7d.get(item.productId) || 0) + qty);
          }
        }
      }

      for (const [productId, stats] of units30d.entries()) {
        const sold30 = stats.units;
        const sold7 = units7d.get(productId) || 0;

        // Enforce minimum sample size
        if (sold30 < settings.minSalesSampleSize) continue;

        const baselineVelocity = sold30 / settings.salesLookbackDays;
        const recentVelocity = sold7 / 7;

        // 1. Demand Surge Check
        if (sold7 >= 3 && baselineVelocity > 0) {
          const surgeRatio = recentVelocity / baselineVelocity;
          const surgePercent = Math.round((surgeRatio - 1) * 100);

          if (surgePercent >= settings.salesSurgeThresholdPercent) {
            await notificationService.createNotification({
              businessId,
              type: NotificationType.UNUSUAL_SALES,
              severity: NotificationSeverity.WARNING,
              title: `Unusual Activity Detected: Demand Surge for ${stats.name}`,
              message: `Statistical indicator for review: ${stats.name} recorded a ${surgePercent}% surge in daily sales rate over the last 7 days (${recentVelocity.toFixed(1)} u/day vs. ${settings.salesLookbackDays}-day baseline of ${baselineVelocity.toFixed(1)} u/day). Please check stock availability.`,
              resourceType: 'PRODUCT',
              resourceId: productId,
              actionUrl: '/products',
              conditionKey: `UNUSUAL_SALES:SURGE:${productId}:${todayStr}`,
              metadata: {
                productId,
                productName: stats.name,
                surgePercent,
                recentVelocity,
                baselineVelocity,
              },
            });
          }
        }

        // 2. Sales Drop Check
        if (sold30 >= 10 && baselineVelocity >= 0.5 && recentVelocity < baselineVelocity * 0.5) {
          const dropPercent = Math.round(((baselineVelocity - recentVelocity) / baselineVelocity) * 100);

          if (dropPercent >= settings.salesDropThresholdPercent) {
            await notificationService.createNotification({
              businessId,
              type: NotificationType.UNUSUAL_SALES,
              severity: NotificationSeverity.INFO,
              title: `Unusual Activity Detected: Sales Slowdown for ${stats.name}`,
              message: `Statistical indicator for review: ${stats.name} daily velocity declined by ${dropPercent}% over the past 7 days compared to historical baseline (${recentVelocity.toFixed(1)} u/day vs. ${baselineVelocity.toFixed(1)} u/day). Consider inspecting retail visibility.`,
              resourceType: 'PRODUCT',
              resourceId: productId,
              actionUrl: '/products',
              conditionKey: `UNUSUAL_SALES:DROP:${productId}:${todayStr}`,
              metadata: {
                productId,
                productName: stats.name,
                dropPercent,
                recentVelocity,
                baselineVelocity,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('[AlertEvaluationService] Error evaluating unusual sales:', err);
    }
  }

  /**
   * Reconciles all alert conditions for the entire shop catalog.
   */
  public async reconcileAllAlerts(businessId: string) {
    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    });

    for (const prod of products) {
      await this.evaluateProductStock(businessId, prod.id);
    }

    await this.evaluateReorderReminders(businessId);
    await this.evaluateUnusualSales(businessId);

    return {
      success: true,
      productsEvaluated: products.length,
      reconciledAt: new Date().toISOString(),
    };
  }
}

export const alertEvaluationService = new AlertEvaluationService();
