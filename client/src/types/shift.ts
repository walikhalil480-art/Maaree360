import type { StaffUser } from './team'

export interface Register {
  id: string
  businessId: string
  name: string
  code: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  activeShift?: {
    id: string
    cashierId: string
    cashier: StaffUser
    openedAt: string
  } | null
}

export type ShiftStatus = 'OPEN' | 'CLOSED'

export interface CashierShift {
  id: string
  businessId: string
  registerId: string
  cashierId: string
  openedAt: string
  closedAt?: string | null
  status: ShiftStatus
  openingFloat: number
  expectedCash?: number | null
  actualCash?: number | null
  cashVariance?: number | null
  notes?: string | null
  closedById?: string | null
  register: {
    id: string
    name: string
    code: string
  }
  cashier: StaffUser
  closedBy?: StaffUser | null
}

export interface ShiftReconciliation {
  shiftId: string
  status: ShiftStatus
  openingFloat: number
  openedAt: string
  closedAt?: string | null
  register: {
    id: string
    name: string
    code: string
  }
  cashier: StaffUser
  salesCount: number
  cashPayments: number
  nonCashPayments: number
  cashRefunds: number
  nonCashRefunds: number
  expectedCash: number
  actualCash?: number | null
  cashVariance?: number | null
}

export interface OpenShiftInput {
  registerId: string
  openingFloat: number
  notes?: string
}

export interface CloseShiftInput {
  actualCash: number
  notes?: string
}
