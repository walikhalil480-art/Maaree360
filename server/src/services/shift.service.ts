import { prisma } from '../db/prisma.js'
import { Role, ShiftStatus, SaleStatus, PaymentMethod, Prisma } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { auditService } from './audit.service.js'
import {
  CreateRegisterInput,
  UpdateRegisterInput,
  OpenShiftInput,
  CloseShiftInput,
  ShiftQueryInput,
} from '../schemas/shift.schemas.js'

export class ShiftService {
  /**
   * 1. List registers with current open shift status.
   */
  async listRegisters(businessId: string) {
    const registers = await prisma.register.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      include: {
        shifts: {
          where: { status: ShiftStatus.OPEN },
          include: {
            cashier: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    return registers.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      isActive: r.isActive,
      createdAt: r.createdAt,
      currentShift: r.shifts[0]
        ? {
            id: r.shifts[0].id,
            cashierId: r.shifts[0].cashierId,
            cashierName: r.shifts[0].cashier.name,
            openedAt: r.shifts[0].openedAt,
            openingFloat: Number(r.shifts[0].openingFloat),
          }
        : null,
    }))
  }

  /**
   * 2. Create a register (Owner & Manager only).
   */
  async createRegister(
    businessId: string,
    actorId: string,
    actorRole: Role,
    input: CreateRegisterInput
  ) {
    if (actorRole === Role.CASHIER || actorRole === Role.STOCK_CLERK) {
      throw new AppError('You do not have permission to manage registers.', 403, 'FORBIDDEN')
    }

    const existing = await prisma.register.findUnique({
      where: { businessId_name: { businessId, name: input.name } },
    })

    if (existing) {
      throw new AppError(
        `A register named '${input.name}' already exists in this business.`,
        400,
        'DUPLICATE_REGISTER_NAME'
      )
    }

    const register = await prisma.$transaction(async (tx) => {
      const created = await tx.register.create({
        data: {
          businessId,
          name: input.name,
          code: input.code || null,
          description: input.description || null,
        },
      })

      await auditService.record(
        {
          businessId,
          actorId,
          action: 'REGISTER_CREATED',
          resourceType: 'REGISTER',
          resourceId: created.id,
          description: `Created register '${created.name}'`,
          metadata: { name: created.name, code: created.code },
        },
        tx
      )

      return created
    })

    return register
  }

  /**
   * 3. Update a register.
   */
  async updateRegister(
    businessId: string,
    actorId: string,
    actorRole: Role,
    registerId: string,
    input: UpdateRegisterInput
  ) {
    if (actorRole === Role.CASHIER || actorRole === Role.STOCK_CLERK) {
      throw new AppError('You do not have permission to update registers.', 403, 'FORBIDDEN')
    }

    const existing = await prisma.register.findFirst({
      where: { id: registerId, businessId },
    })

    if (!existing) {
      throw new AppError('Register not found.', 404, 'NOT_FOUND')
    }

    if (input.name && input.name !== existing.name) {
      const nameConflict = await prisma.register.findUnique({
        where: { businessId_name: { businessId, name: input.name } },
      })
      if (nameConflict) {
        throw new AppError(`A register named '${input.name}' already exists.`, 400, 'DUPLICATE_REGISTER')
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.register.update({
        where: { id: registerId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      })

      await auditService.record(
        {
          businessId,
          actorId,
          action: 'REGISTER_UPDATED',
          resourceType: 'REGISTER',
          resourceId: registerId,
          description: `Updated register '${res.name}'`,
          metadata: { previous: existing, updated: input },
        },
        tx
      )

      return res
    })

    return updated
  }

  /**
   * 4. Get active open shift for a cashier.
   */
  async getCurrentShift(businessId: string, cashierId: string) {
    const shift = await prisma.cashierShift.findFirst({
      where: {
        businessId,
        cashierId,
        status: ShiftStatus.OPEN,
      },
      include: {
        register: true,
        cashier: { select: { id: true, name: true, email: true } },
      },
    })

    if (!shift) return null

    const reconciliation = await this.calculateShiftExpectedCash(businessId, shift.id)

    return {
      shift: {
        id: shift.id,
        businessId: shift.businessId,
        status: shift.status,
        openedAt: shift.openedAt,
        openingFloat: Number(shift.openingFloat),
        notes: shift.notes,
        register: shift.register,
        cashier: shift.cashier,
      },
      reconciliation,
    }
  }

  /**
   * 5. Open a new cashier shift.
   */
  async openShift(businessId: string, cashierId: string, input: OpenShiftInput) {
    // 1. Verify register exists and is active
    const register = await prisma.register.findFirst({
      where: { id: input.registerId, businessId },
    })

    if (!register || !register.isActive) {
      throw new AppError(
        'The selected register does not exist or has been deactivated.',
        400,
        'REGISTER_UNAVAILABLE'
      )
    }

    // 2. Prevent cashier from having multiple open shifts
    const existingOpenShift = await prisma.cashierShift.findFirst({
      where: {
        businessId,
        cashierId,
        status: ShiftStatus.OPEN,
      },
      include: { register: { select: { name: true } } },
    })

    if (existingOpenShift) {
      throw new AppError(
        `You already have an active open shift on register '${existingOpenShift.register.name}'. Please close it before opening a new shift.`,
        400,
        'SHIFT_ALREADY_OPEN'
      )
    }

    // 3. Prevent conflicting open assignments to the register
    const existingRegisterShift = await prisma.cashierShift.findFirst({
      where: {
        businessId,
        registerId: input.registerId,
        status: ShiftStatus.OPEN,
      },
      include: { cashier: { select: { name: true } } },
    })

    if (existingRegisterShift) {
      throw new AppError(
        `Register '${register.name}' is already assigned to an active shift by cashier '${existingRegisterShift.cashier.name}'.`,
        400,
        'REGISTER_IN_USE'
      )
    }

    const shift = await prisma.$transaction(async (tx) => {
      const created = await tx.cashierShift.create({
        data: {
          businessId,
          cashierId,
          registerId: input.registerId,
          openingFloat: new Prisma.Decimal(input.openingFloat),
          status: ShiftStatus.OPEN,
          notes: input.notes?.trim() || null,
        },
        include: {
          register: true,
          cashier: { select: { id: true, name: true, email: true } },
        },
      })

      await auditService.record(
        {
          businessId,
          actorId: cashierId,
          action: 'SHIFT_OPENED',
          resourceType: 'SHIFT',
          resourceId: created.id,
          description: `Cashier ${created.cashier.name} opened shift on register '${register.name}' with float KES ${input.openingFloat}`,
          metadata: {
            shiftId: created.id,
            registerId: register.id,
            registerName: register.name,
            openingFloat: input.openingFloat,
          },
        },
        tx
      )

      return created
    })

    return shift
  }

  /**
   * 6. Calculate expected drawer cash based strictly on cash transactions and cash refunds.
   * Excludes card, mobile money (M-Pesa), bank transfer, etc.
   */
  async calculateShiftExpectedCash(businessId: string, shiftId: string) {
    const shift = await prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: { register: true, cashier: true },
    })

    if (!shift) {
      throw new AppError('Shift not found.', 404, 'NOT_FOUND')
    }

    const shiftStart = shift.openedAt
    const shiftEnd = shift.closedAt || new Date()

    // Query sales associated with this shift or completed by this cashier during the shift window
    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        OR: [
          { shiftId: shift.id },
          {
            cashierId: shift.cashierId,
            createdAt: { gte: shiftStart, lte: shiftEnd },
          },
        ],
      },
      include: {
        payments: true,
      },
    })

    let cashPayments = 0
    let nonCashPayments = 0
    let totalSalesVolume = 0

    for (const sale of sales) {
      for (const p of sale.payments) {
        const amt = Number(p.amount)
        if (p.method === PaymentMethod.CASH) {
          cashPayments += amt
        } else {
          nonCashPayments += amt
        }
        totalSalesVolume += amt
      }
    }

    // Query CASH refunds processed by this cashier during the shift window
    const returns = await prisma.saleReturn.findMany({
      where: {
        businessId,
        processedById: shift.cashierId,
        refundMethod: PaymentMethod.CASH,
        createdAt: { gte: shiftStart, lte: shiftEnd },
      },
      select: {
        refundAmount: true,
      },
    })

    const cashRefunds = returns.reduce((acc, r) => acc + Number(r.refundAmount), 0)
    const openingFloat = Number(shift.openingFloat)
    const expectedCash = Math.max(0, openingFloat + cashPayments - cashRefunds)

    return {
      currency: 'KES',
      openingFloat: Math.round(openingFloat * 100) / 100,
      cashPayments: Math.round(cashPayments * 100) / 100,
      cashRefunds: Math.round(cashRefunds * 100) / 100,
      nonCashPayments: Math.round(nonCashPayments * 100) / 100,
      totalSalesVolume: Math.round(totalSalesVolume * 100) / 100,
      expectedCash: Math.round(expectedCash * 100) / 100,
      salesCount: sales.length,
    }
  }

  /**
   * 7. Close a cashier shift with cash reconciliation and variance calculation.
   */
  async closeShift(
    businessId: string,
    actorId: string,
    actorRole: Role,
    shiftId: string,
    input: CloseShiftInput
  ) {
    const shift = await prisma.cashierShift.findFirst({
      where: { id: shiftId, businessId },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        register: true,
      },
    })

    if (!shift) {
      throw new AppError('Shift not found in this business.', 404, 'NOT_FOUND')
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new AppError(
        'This shift has already been closed and cannot be re-closed.',
        400,
        'SHIFT_ALREADY_CLOSED'
      )
    }

    const isOwnShift = actorId === shift.cashierId
    const isManagerOrOwner = actorRole === Role.OWNER || actorRole === Role.MANAGER

    if (!isOwnShift && !isManagerOrOwner) {
      throw new AppError(
        'You do not have permission to close another cashier\'s shift.',
        403,
        'FORBIDDEN'
      )
    }

    // Calculate expected cash from verified cash transactions
    const recon = await this.calculateShiftExpectedCash(businessId, shift.id)
    const actualCash = Math.round(input.actualCash * 100) / 100
    const expectedCash = recon.expectedCash
    const cashVariance = Math.round((actualCash - expectedCash) * 100) / 100

    const isOverride = !isOwnShift && isManagerOrOwner

    const closed = await prisma.$transaction(async (tx) => {
      // 1. Update shift
      const res = await tx.cashierShift.update({
        where: { id: shift.id },
        data: {
          status: ShiftStatus.CLOSED,
          closedAt: new Date(),
          closedById: actorId,
          expectedCash: new Prisma.Decimal(expectedCash),
          actualCash: new Prisma.Decimal(actualCash),
          cashVariance: new Prisma.Decimal(cashVariance),
          notes: input.notes?.trim() || shift.notes,
        },
        include: {
          cashier: { select: { id: true, name: true, email: true } },
          register: true,
          closedBy: { select: { id: true, name: true, email: true } },
        },
      })

      // 2. Associate sales completed in this window to this shift if shiftId was null
      await tx.sale.updateMany({
        where: {
          businessId,
          cashierId: shift.cashierId,
          shiftId: null,
          createdAt: { gte: shift.openedAt, lte: res.closedAt! },
        },
        data: {
          shiftId: shift.id,
          registerId: shift.registerId,
        },
      })

      // 3. Record audit log
      await auditService.record(
        {
          businessId,
          actorId,
          action: isOverride ? 'SHIFT_OVERRIDDEN' : 'SHIFT_CLOSED',
          resourceType: 'SHIFT',
          resourceId: shift.id,
          description: isOverride
            ? `Manager override: Closed shift for ${shift.cashier.name}. Expected: KES ${expectedCash}, Actual: KES ${actualCash}, Variance: KES ${cashVariance}`
            : `Cashier ${shift.cashier.name} closed shift. Expected: KES ${expectedCash}, Actual: KES ${actualCash}, Variance: KES ${cashVariance}`,
          metadata: {
            shiftId: shift.id,
            registerName: shift.register.name,
            openingFloat: Number(shift.openingFloat),
            cashPayments: recon.cashPayments,
            cashRefunds: recon.cashRefunds,
            expectedCash,
            actualCash,
            cashVariance,
            isOverride,
          },
        },
        tx
      )

      return res
    })

    return {
      shift: closed,
      reconciliation: {
        ...recon,
        actualCash,
        cashVariance,
      },
    }
  }

  /**
   * 8. List shift history.
   */
  async listShifts(businessId: string, query: ShiftQueryInput) {
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    const where: Prisma.CashierShiftWhereInput = {
      businessId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.registerId ? { registerId: query.registerId } : {}),
      ...(query.cashierId ? { cashierId: query.cashierId } : {}),
    }

    if (query.startDate || query.endDate) {
      where.openedAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      }
    }

    const [total, items] = await Promise.all([
      prisma.cashierShift.count({ where }),
      prisma.cashierShift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          cashier: { select: { id: true, name: true, email: true } },
          register: { select: { id: true, name: true, code: true } },
          closedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    return {
      items: items.map((s) => ({
        id: s.id,
        status: s.status,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingFloat: Number(s.openingFloat),
        expectedCash: s.expectedCash !== null ? Number(s.expectedCash) : null,
        actualCash: s.actualCash !== null ? Number(s.actualCash) : null,
        cashVariance: s.cashVariance !== null ? Number(s.cashVariance) : null,
        notes: s.notes,
        cashier: s.cashier,
        register: s.register,
        closedBy: s.closedBy,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * 9. Get single shift details with associated transactions.
   */
  async getShiftById(businessId: string, shiftId: string) {
    const shift = await prisma.cashierShift.findFirst({
      where: { id: shiftId, businessId },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        register: true,
        closedBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!shift) {
      throw new AppError('Shift not found in this business.', 404, 'NOT_FOUND')
    }

    const recon = await this.calculateShiftExpectedCash(businessId, shift.id)

    return {
      shift: {
        id: shift.id,
        status: shift.status,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openingFloat: Number(shift.openingFloat),
        expectedCash: shift.expectedCash !== null ? Number(shift.expectedCash) : recon.expectedCash,
        actualCash: shift.actualCash !== null ? Number(shift.actualCash) : null,
        cashVariance:
          shift.cashVariance !== null
            ? Number(shift.cashVariance)
            : shift.actualCash !== null
              ? Number(shift.actualCash) - recon.expectedCash
              : null,
        notes: shift.notes,
        cashier: shift.cashier,
        register: shift.register,
        closedBy: shift.closedBy,
      },
      reconciliation: recon,
    }
  }
}

export const shiftService = new ShiftService()
