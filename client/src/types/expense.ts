export type ExpenseCategory =
  | 'RENT'
  | 'ELECTRICITY_AND_WATER'
  | 'EMPLOYEE_WAGES'
  | 'TRANSPORT_AND_DELIVERY'
  | 'INTERNET_AND_PHONE'
  | 'PACKAGING_AND_SUPPLIES'
  | 'REPAIRS_AND_MAINTENANCE'
  | 'MARKETING'
  | 'OTHER'

export interface ExpenseCategoryDetail {
  value: ExpenseCategory
  label: string
  description: string
  badgeVariant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDetail[] = [
  {
    value: 'RENT',
    label: 'Rent',
    description: 'Store, warehouse, or retail space rent',
    badgeVariant: 'info',
  },
  {
    value: 'ELECTRICITY_AND_WATER',
    label: 'Electricity and water',
    description: 'Power grid, tokens, municipal water',
    badgeVariant: 'warning',
  },
  {
    value: 'EMPLOYEE_WAGES',
    label: 'Employee wages',
    description: 'Staff salaries, casual wages, daily allowances',
    badgeVariant: 'info',
  },
  {
    value: 'TRANSPORT_AND_DELIVERY',
    label: 'Transport and delivery',
    description: 'Boda/matatu transit, fuel, freight delivery',
    badgeVariant: 'success',
  },
  {
    value: 'INTERNET_AND_PHONE',
    label: 'Internet and phone',
    description: 'WiFi router, till airtime, SMS packages',
    badgeVariant: 'info',
  },
  {
    value: 'PACKAGING_AND_SUPPLIES',
    label: 'Packaging and supplies',
    description: 'Paper carrier bags, receipt rolls, tape',
    badgeVariant: 'neutral',
  },
  {
    value: 'REPAIRS_AND_MAINTENANCE',
    label: 'Repairs and maintenance',
    description: 'Shelving, equipment, POS, electrical fixes',
    badgeVariant: 'warning',
  },
  {
    value: 'MARKETING',
    label: 'Marketing',
    description: 'Signboard branding, flyers, neighborhood promos',
    badgeVariant: 'info',
  },
  {
    value: 'OTHER',
    label: 'Other expenses',
    description: 'City permits, trade licenses, miscellaneous',
    badgeVariant: 'neutral',
  },
]

export interface Expense {
  id: string
  businessId: string
  category: ExpenseCategory
  description: string
  amount: number
  expenseDate: string
  referenceNumber?: string | null
  notes?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
}

export interface ExpenseListResponse {
  success: boolean
  expenses: Expense[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    totalAmount: number
    count: number
  }
}

export interface CategoryBreakdownItem {
  category: ExpenseCategory
  label: string
  description: string
  totalAmount: number
  count: number
  percentage: number
}

export interface ProfitSummary {
  period: string
  dateRange: {
    startDate: string | null
    endDate: string | null
  }
  sales: {
    grossRevenue: number
    totalRefunds: number
    netRevenue: number
    completedTransactionsCount: number
    refundCount: number
  }
  cogs: {
    totalCostOfGoodsSold: number
    method: string
  }
  grossProfit: {
    amount: number
    marginPercentage: number
  }
  expenses: {
    totalOperatingExpenses: number
    expenseCount: number
    categoryBreakdown: CategoryBreakdownItem[]
  }
  operatingProfit: {
    amount: number
    marginPercentage: number
    status: 'PROFITABLE' | 'OPERATING_AT_LOSS'
  }
}

export interface ProfitSummaryResponse {
  success: boolean
  summary: ProfitSummary
}
