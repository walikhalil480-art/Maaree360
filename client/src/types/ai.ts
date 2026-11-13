export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    provider?: 'gemini' | 'openai' | 'none';
    model?: string | null;
    factsVsEstimatesNotice?: string;
    suggestedQuestions?: string[];
    roleRestricted?: boolean;
  };
  createdAt: string;
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface ForecastData {
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

export interface AiProviderStatus {
  configured: boolean;
  provider: 'gemini' | 'openai' | 'none';
  model: string | null;
  suggestedQuestions: string[];
}
