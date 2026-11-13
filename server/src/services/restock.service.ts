import { prisma } from '../db/prisma.js';
import { PurchaseOrderStatus, SaleStatus } from '@prisma/client';

export type RestockUrgency = 'CRITICAL' | 'WARNING' | 'HEALTHY';

export interface ActivePoItemSummary {
  purchaseOrderId: string;
  orderNumber: string;
  status: string;
  pendingQuantity: number;
  expectedDate?: string | null;
}

export interface RestockRecommendation {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  onOrderQuantity: number;
  effectiveStock: number;
  minStockThreshold: number;
  dailyDemand: number;
  leadTimeDays: number;
  isEstimatedLeadTime: boolean;
  safetyStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  estimatedCost: number;
  daysOfStockRemaining: number | null;
  urgency: RestockUrgency;
  primarySupplier?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  activePurchaseOrders: ActivePoItemSummary[];
}

export interface RestockSummary {
  businessId: string;
  totalProductsAssessed: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  totalSuggestedUnits: number;
  totalEstimatedRestockCost: number;
  recommendations: RestockRecommendation[];
  disclaimer: string;
}

export class RestockService {
  /**
   * Generates restocking recommendations using dynamic ROP = (Demand * LeadTime) + SafetyStock.
   */
  public async getRecommendations(
    businessId: string,
    filters?: {
      urgency?: 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'ALL';
      supplierId?: string;
      categoryId?: string;
    }
  ): Promise<RestockSummary> {
    const now = new Date();
    const past30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch products with stock and category
    const products = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      },
      include: {
        category: true,
        stockLevel: true,
      },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch sales from the past 30 days to compute daily demand and variance
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
            quantity: true,
          },
        },
      },
    });

    // Group sales units by product and day
    const productDailySales = new Map<string, Map<string, number>>();
    for (const sale of sales) {
      const dayKey = sale.createdAt.toISOString().slice(0, 10);
      for (const item of sale.items) {
        let pMap = productDailySales.get(item.productId);
        if (!pMap) {
          pMap = new Map();
          productDailySales.set(item.productId, pMap);
        }
        const currentDayQty = pMap.get(dayKey) || 0;
        pMap.set(dayKey, currentDayQty + Number(item.quantity));
      }
    }

    // 3. Fetch active purchase orders (ORDERED, PARTIALLY_RECEIVED) for incoming stock
    const activePurchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        businessId,
        status: {
          in: [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.PARTIALLY_RECEIVED],
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        expectedDeliveryDate: true,
        items: {
          select: {
            productId: true,
            quantityOrdered: true,
            quantityReceived: true,
          },
        },
      },
    });

    // Map active PO incoming items
    const productActivePos = new Map<string, ActivePoItemSummary[]>();
    for (const po of activePurchaseOrders) {
      for (const item of po.items) {
        const pending = Math.max(0, Number(item.quantityOrdered) - Number(item.quantityReceived));
        if (pending > 0) {
          const list = productActivePos.get(item.productId) || [];
          list.push({
            purchaseOrderId: po.id,
            orderNumber: po.orderNumber,
            status: po.status,
            pendingQuantity: pending,
            expectedDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.toISOString().slice(0, 10) : null,
          });
          productActivePos.set(item.productId, list);
        }
      }
    }

    // 4. Fetch supplier delivery history to compute average lead times
    const receivedOrders = await prisma.purchaseOrder.findMany({
      where: {
        businessId,
        status: {
          in: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.PARTIALLY_RECEIVED],
        },
        receivedAt: { not: null },
      },
      select: {
        supplierId: true,
        createdAt: true,
        receivedAt: true,
        items: {
          select: {
            productId: true,
          },
        },
      },
      take: 100,
    });

    // Calculate lead time per supplier (in days)
    const supplierLeadTimes = new Map<string, number[]>();
    const productSupplierMap = new Map<string, string>();

    for (const po of receivedOrders) {
      if (po.receivedAt) {
        const durationDays = Math.max(
          1,
          Math.round((po.receivedAt.getTime() - po.createdAt.getTime()) / (24 * 60 * 60 * 1000))
        );
        const existing = supplierLeadTimes.get(po.supplierId) || [];
        existing.push(durationDays);
        supplierLeadTimes.set(po.supplierId, existing);

        for (const item of po.items) {
          if (!productSupplierMap.has(item.productId)) {
            productSupplierMap.set(item.productId, po.supplierId);
          }
        }
      }
    }

    // Load supplier details
    const suppliers = await prisma.supplier.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true, phone: true, email: true },
    });
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));

    // 5. Compute recommendations for each product
    const allRecs: RestockRecommendation[] = [];

    for (const prod of products) {
      const currentStock = Number(prod.stockLevel?.quantity || 0);
      const minThreshold = prod.minStockThreshold;
      const costPrice = Number(prod.costPrice);
      const sellingPrice = Number(prod.sellingPrice);

      // On-order pending quantity
      const poItems = productActivePos.get(prod.id) || [];
      const onOrderQuantity = poItems.reduce((sum, po) => sum + po.pendingQuantity, 0);
      const effectiveStock = currentStock + onOrderQuantity;

      // Demand calculation (over 30 days)
      const daySales = productDailySales.get(prod.id) || new Map<string, number>();
      let totalUnits30d = 0;
      for (const qty of daySales.values()) {
        totalUnits30d += qty;
      }
      const dailyDemand = Math.round((totalUnits30d / 30) * 100) / 100;

      // Demand standard deviation
      let varianceSum = 0;
      for (let i = 0; i < 30; i++) {
        // approximate standard deviation across 30 calendar days
        const val = i < daySales.size ? Array.from(daySales.values())[i] || 0 : 0;
        const diff = val - dailyDemand;
        varianceSum += diff * diff;
      }
      const demandStdDev = Math.sqrt(varianceSum / 30);

      // Lead time determination
      const supplierId = productSupplierMap.get(prod.id);
      let leadTimeDays = 7;
      let isEstimatedLeadTime = true;

      if (supplierId && supplierLeadTimes.has(supplierId)) {
        const leadTimes = supplierLeadTimes.get(supplierId)!;
        if (leadTimes.length > 0) {
          leadTimeDays = Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);
          isEstimatedLeadTime = false;
        }
      }

      // Safety stock formula: max(minThreshold, ceil(1.65 * stdDev * sqrt(L)))
      const safetyStockCalc = Math.ceil(1.65 * demandStdDev * Math.sqrt(leadTimeDays));
      const safetyStock = Math.max(minThreshold, safetyStockCalc);

      // Reorder Point: ROP = (Demand * LeadTime) + SafetyStock
      const reorderPoint = Math.ceil(dailyDemand * leadTimeDays + safetyStock);

      // Reorder quantity calculation: buffer for a 14-day replenishment cycle
      let suggestedQuantity = 0;
      if (effectiveStock <= reorderPoint) {
        if (dailyDemand > 0) {
          suggestedQuantity = Math.max(0, Math.ceil(reorderPoint + dailyDemand * 14 - effectiveStock));
        } else {
          // If no sales recorded, maintain minimum threshold
          suggestedQuantity = Math.max(0, minThreshold - effectiveStock);
        }
      }

      const estimatedCost = Math.round(suggestedQuantity * costPrice * 100) / 100;

      // Days of stock remaining
      let daysOfStockRemaining: number | null = null;
      if (dailyDemand > 0) {
        daysOfStockRemaining = Math.max(0, Math.round((currentStock / dailyDemand) * 10) / 10);
      } else if (currentStock === 0) {
        daysOfStockRemaining = 0;
      }

      // Urgency determination
      let urgency: RestockUrgency = 'HEALTHY';
      if (currentStock === 0 || (daysOfStockRemaining !== null && daysOfStockRemaining <= 2)) {
        urgency = 'CRITICAL';
      } else if (effectiveStock <= reorderPoint) {
        urgency = 'WARNING';
      }

      const primarySupplier = supplierId ? supplierById.get(supplierId) || null : null;

      // Filter by supplier if requested
      if (filters?.supplierId && primarySupplier?.id !== filters.supplierId) {
        continue;
      }

      // Filter by urgency if requested
      if (filters?.urgency && filters.urgency !== 'ALL' && urgency !== filters.urgency) {
        continue;
      }

      allRecs.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        categoryName: prod.category?.name || null,
        costPrice,
        sellingPrice,
        currentStock,
        onOrderQuantity,
        effectiveStock,
        minStockThreshold: minThreshold,
        dailyDemand,
        leadTimeDays,
        isEstimatedLeadTime,
        safetyStock,
        reorderPoint,
        suggestedQuantity,
        estimatedCost,
        daysOfStockRemaining,
        urgency,
        primarySupplier: primarySupplier
          ? {
              id: primarySupplier.id,
              name: primarySupplier.name,
              phone: primarySupplier.phone,
              email: primarySupplier.email,
            }
          : null,
        activePurchaseOrders: poItems,
      });
    }

    // Sort by urgency (CRITICAL first, then WARNING, then HEALTHY) and then suggested cost descending
    const urgencyWeight = { CRITICAL: 3, WARNING: 2, HEALTHY: 1 };
    allRecs.sort((a, b) => {
      const diff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      if (diff !== 0) return diff;
      return b.estimatedCost - a.estimatedCost;
    });

    const criticalCount = allRecs.filter((r) => r.urgency === 'CRITICAL').length;
    const warningCount = allRecs.filter((r) => r.urgency === 'WARNING').length;
    const healthyCount = allRecs.filter((r) => r.urgency === 'HEALTHY').length;
    const totalSuggestedUnits = allRecs.reduce((sum, r) => sum + r.suggestedQuantity, 0);
    const totalEstimatedRestockCost =
      Math.round(allRecs.reduce((sum, r) => sum + r.estimatedCost, 0) * 100) / 100;

    return {
      businessId,
      totalProductsAssessed: allRecs.length,
      criticalCount,
      warningCount,
      healthyCount,
      totalSuggestedUnits,
      totalEstimatedRestockCost,
      recommendations: allRecs,
      disclaimer:
        'Restock recommendations are purely advisory based on statistical velocity and supplier lead times. No purchase orders or stock movements are created automatically. Always review and approve before creating purchase orders.',
    };
  }
}

export const restockService = new RestockService();
