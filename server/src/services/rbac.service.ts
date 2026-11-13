import { prisma } from '../db/prisma.js'
import { PermissionRiskLevel } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { auditService } from './audit.service.js'

export interface PermissionDef {
  key: string
  module: string
  action: string
  displayName: string
  description: string
  riskLevel: PermissionRiskLevel
}

export const SYSTEM_PERMISSIONS: PermissionDef[] = [
  // POS & Checkout Module
  {
    key: 'pos.access',
    module: 'pos',
    action: 'access',
    displayName: 'Access POS Register',
    description: 'Allows opening the POS cash register and searching products for checkout',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'pos.sell',
    module: 'pos',
    action: 'sell',
    displayName: 'Process POS Sales',
    description: 'Allows adding items to cart, completing checkout, and accepting payments',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'pos.discount.apply',
    module: 'pos',
    action: 'discount.apply',
    displayName: 'Apply Standard Discounts',
    description: 'Allows applying line or cart discounts up to cashier threshold (e.g. <= 5%)',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'pos.discount.override',
    module: 'pos',
    action: 'discount.override',
    displayName: 'High Discount Override',
    description: 'Allows applying or authorizing discounts exceeding cashier threshold',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'pos.price.override',
    module: 'pos',
    action: 'price.override',
    displayName: 'Unit Price Override',
    description: 'Allows manually editing the unit selling price of an item during checkout',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'pos.void_item',
    module: 'pos',
    action: 'void_item',
    displayName: 'Void Cart Item',
    description: 'Allows removing an item from an active cart before checkout',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'pos.cancel_sale',
    module: 'pos',
    action: 'cancel_sale',
    displayName: 'Cancel Active Sale',
    description: 'Allows voiding or cancelling a sale in progress or completed sale transaction',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'pos.refund',
    module: 'pos',
    action: 'refund',
    displayName: 'Process Returns & Refunds',
    description: 'Allows processing sales returns, credit notes, and customer cash refunds',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'pos.reprint_receipt',
    module: 'pos',
    action: 'reprint_receipt',
    displayName: 'Reprint Past Receipt',
    description: 'Allows reprinting receipt slips for previously completed transactions',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'pos.open_drawer',
    module: 'pos',
    action: 'open_drawer',
    displayName: 'Open Cash Drawer (No Sale)',
    description: 'Allows triggering the cash drawer without an active sale transaction',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'pos.cash_in_out',
    module: 'pos',
    action: 'cash_in_out',
    displayName: 'Record Float / Cash In-Out',
    description: 'Allows recording petty cash deposits or cash removals from the active register',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },

  // Inventory Module
  {
    key: 'inventory.view',
    module: 'inventory',
    action: 'view',
    displayName: 'View Stock Balances',
    description: 'Allows viewing current on-hand quantities across products',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'inventory.cost.view',
    module: 'inventory',
    action: 'cost.view',
    displayName: 'View Unit Cost Valuation',
    description: 'Allows viewing purchase cost prices and total inventory asset valuation',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'inventory.adjust',
    module: 'inventory',
    action: 'adjust',
    displayName: 'Adjust Inventory (Routine)',
    description: 'Allows recording physical count discrepancies and stock adjustments',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'inventory.write_off',
    module: 'inventory',
    action: 'write_off',
    displayName: 'Stock Write-Off & Damage',
    description: 'Allows marking stock as damaged, expired, lost, or written off',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'inventory.transfer',
    module: 'inventory',
    action: 'transfer',
    displayName: 'Inter-Branch Stock Transfer',
    description: 'Allows dispatching, in-transit tracking, and receiving stock transfers',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'inventory.reorder',
    module: 'inventory',
    action: 'reorder',
    displayName: 'Manage Reorder Points',
    description: 'Allows setting min/max stock thresholds and configuring low-stock alerts',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },

  // Products & Catalog Module
  {
    key: 'products.view',
    module: 'products',
    action: 'view',
    displayName: 'View Products Catalog',
    description: 'Allows searching and viewing catalog products and details',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'products.create',
    module: 'products',
    action: 'create',
    displayName: 'Create New Products',
    description: 'Allows creating new products, SKUs, and categories in the store catalog',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'products.edit',
    module: 'products',
    action: 'edit',
    displayName: 'Edit Product Details',
    description: 'Allows editing product names, descriptions, categories, and images',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'products.price.change',
    module: 'products',
    action: 'price.change',
    displayName: 'Change Selling Prices',
    description: 'Allows updating retail selling prices on products in the catalog',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'products.cost.edit',
    module: 'products',
    action: 'cost.edit',
    displayName: 'Edit Supplier Cost Price',
    description: 'Allows updating supplier unit purchasing cost on products',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'products.delete',
    module: 'products',
    action: 'delete',
    displayName: 'Archive / Delete Products',
    description: 'Allows archiving or soft-deleting products from active catalog',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'products.barcodes.manage',
    module: 'products',
    action: 'barcodes.manage',
    displayName: 'Manage Barcodes & QR Codes',
    description: 'Allows adding, resolving, and deleting barcode and QR code aliases for products',
    riskLevel: PermissionRiskLevel.LOW,
  },

  // Purchasing & Suppliers Module
  {
    key: 'purchases.view',
    module: 'purchases',
    action: 'view',
    displayName: 'View Purchase Orders',
    description: 'Allows viewing purchase orders, statuses, and supplier history',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'purchases.create',
    module: 'purchases',
    action: 'create',
    displayName: 'Create Draft Purchase Orders',
    description: 'Allows creating and editing draft purchase orders to vendors',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'purchases.approve',
    module: 'purchases',
    action: 'approve',
    displayName: 'Approve & Place Purchase Orders',
    description: 'Allows placing orders with suppliers and committing financial purchase obligations',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'purchases.receive',
    module: 'purchases',
    action: 'receive',
    displayName: 'Receive Goods Delivery',
    description: 'Allows accepting supplier delivery receipts and updating warehouse stock',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'purchases.cancel',
    module: 'purchases',
    action: 'cancel',
    displayName: 'Cancel Purchase Orders',
    description: 'Allows cancelling or voiding placed purchase orders',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'suppliers.view',
    module: 'suppliers',
    action: 'view',
    displayName: 'View Suppliers Directory',
    description: 'Allows viewing supplier profiles and contact terms',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'suppliers.manage',
    module: 'suppliers',
    action: 'manage',
    displayName: 'Manage Suppliers',
    description: 'Allows creating, editing, and archiving supplier records',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },

  // Operating Expenses & Financials Module
  {
    key: 'finance.expenses.view',
    module: 'finance',
    action: 'expenses.view',
    displayName: 'View Operating Expenses',
    description: 'Allows viewing store operating expenses and petty cash records',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'finance.expenses.create',
    module: 'finance',
    action: 'expenses.create',
    displayName: 'Record Operating Expense',
    description: 'Allows logging operating expenses and petty cash payments',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'finance.expenses.approve',
    module: 'finance',
    action: 'expenses.approve',
    displayName: 'Approve Operating Expenses',
    description: 'Allows approving high-value expenses or deleting/editing logged expenses',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'finance.profit.view',
    module: 'finance',
    action: 'profit.view',
    displayName: 'View Profitability & Margins',
    description: 'Allows viewing store gross margin, operating expenses, and net profit',
    riskLevel: PermissionRiskLevel.HIGH,
  },

  // Reports & Business Intelligence Module
  {
    key: 'reports.sales.view',
    module: 'reports',
    action: 'sales.view',
    displayName: 'View Sales & Revenue Reports',
    description: 'Allows viewing hourly, daily, and monthly sales trends',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'reports.inventory.view',
    module: 'reports',
    action: 'inventory.view',
    displayName: 'View Inventory Intelligence',
    description: 'Allows viewing stock turn rates, inventory valuation, and dead stock analysis',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'reports.financial.view',
    module: 'reports',
    action: 'financial.view',
    displayName: 'View Executive Financial Reports',
    description: 'Allows viewing comprehensive P&L, balance sheets, and tax reports',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'reports.export',
    module: 'reports',
    action: 'export',
    displayName: 'Export Data (CSV / PDF)',
    description: 'Allows downloading datasets as CSV and streaming PDF management accounting reports',
    riskLevel: PermissionRiskLevel.HIGH,
  },

  // Team, Staff & Roles Module
  {
    key: 'team.view',
    module: 'team',
    action: 'view',
    displayName: 'View Staff Directory',
    description: 'Allows viewing team members, assigned roles, and cashier shift statuses',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'team.invite',
    module: 'team',
    action: 'invite',
    displayName: 'Invite Staff Members',
    description: 'Allows sending invitations to new team members via email or phone',
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    key: 'team.roles.manage',
    module: 'team',
    action: 'roles.manage',
    displayName: 'Manage Roles & Permissions',
    description: 'Allows creating, configuring, and modifying custom roles and permission bundles',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'team.assign',
    module: 'team',
    action: 'assign',
    displayName: 'Assign Staff Roles & Branches',
    description: 'Allows changing a team member role or assigning branch scopes',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'team.suspend',
    module: 'team',
    action: 'suspend',
    displayName: 'Suspend / Deactivate Staff',
    description: 'Allows temporarily suspending or revoking a staff member account',
    riskLevel: PermissionRiskLevel.HIGH,
  },

  // Store Configuration & System Module
  {
    key: 'settings.view',
    module: 'system',
    action: 'settings.view',
    displayName: 'View Store Settings',
    description: 'Allows viewing store profile, currency, and regional format settings',
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    key: 'settings.edit',
    module: 'system',
    action: 'settings.edit',
    displayName: 'Modify Store Settings',
    description: 'Allows updating business name, tax PIN, timezone, and receipt footers',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'branches.manage',
    module: 'system',
    action: 'branches.manage',
    displayName: 'Manage Store Branches',
    description: 'Allows creating and managing physical store branches and warehouse locations',
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    key: 'audit.view',
    module: 'system',
    action: 'audit.view',
    displayName: 'Inspect Security Audit Logs',
    description: 'Allows viewing system audit logs, user security actions, and tamper trails',
    riskLevel: PermissionRiskLevel.HIGH,
  },
]

export const SYSTEM_ROLE_TEMPLATES: Record<
  string,
  { name: string; description: string; permissions: string[] }
> = {
  OWNER: {
    name: 'Business Owner',
    description: 'Full superuser privileges across all modules, stores, and financial records',
    permissions: ['*'], // Wildcard - matches everything
  },
  MANAGER: {
    name: 'Store Manager',
    description: 'Full operational control over store sales, inventory, purchasing, team, and reports',
    permissions: [
      'pos.access',
      'pos.sell',
      'pos.discount.apply',
      'pos.discount.override',
      'pos.price.override',
      'pos.void_item',
      'pos.cancel_sale',
      'pos.refund',
      'pos.reprint_receipt',
      'pos.open_drawer',
      'pos.cash_in_out',
      'inventory.view',
      'inventory.cost.view',
      'inventory.adjust',
      'inventory.write_off',
      'inventory.transfer',
      'inventory.reorder',
      'products.view',
      'products.create',
      'products.edit',
      'products.price.change',
      'products.cost.edit',
      'products.delete',
      'products.barcodes.manage',
      'purchases.view',
      'purchases.create',
      'purchases.approve',
      'purchases.receive',
      'purchases.cancel',
      'suppliers.view',
      'suppliers.manage',
      'finance.expenses.view',
      'finance.expenses.create',
      'finance.expenses.approve',
      'finance.profit.view',
      'reports.sales.view',
      'reports.inventory.view',
      'reports.financial.view',
      'reports.export',
      'team.view',
      'team.invite',
      'team.assign',
      'team.suspend',
      'settings.view',
      'settings.edit',
      'branches.manage',
      'audit.view',
    ],
  },
  STORE_MANAGER: {
    name: 'Store Manager',
    description: 'Full operational control over store sales, inventory, purchasing, team, and reports',
    permissions: [
      'pos.access',
      'pos.sell',
      'pos.discount.apply',
      'pos.discount.override',
      'pos.price.override',
      'pos.void_item',
      'pos.cancel_sale',
      'pos.refund',
      'pos.reprint_receipt',
      'pos.open_drawer',
      'pos.cash_in_out',
      'inventory.view',
      'inventory.cost.view',
      'inventory.adjust',
      'inventory.write_off',
      'inventory.transfer',
      'inventory.reorder',
      'products.view',
      'products.create',
      'products.edit',
      'products.price.change',
      'products.cost.edit',
      'products.delete',
      'products.barcodes.manage',
      'purchases.view',
      'purchases.create',
      'purchases.approve',
      'purchases.receive',
      'purchases.cancel',
      'suppliers.view',
      'suppliers.manage',
      'finance.expenses.view',
      'finance.expenses.create',
      'finance.expenses.approve',
      'finance.profit.view',
      'reports.sales.view',
      'reports.inventory.view',
      'reports.financial.view',
      'reports.export',
      'team.view',
      'team.invite',
      'team.assign',
      'team.suspend',
      'settings.view',
      'settings.edit',
      'branches.manage',
      'audit.view',
    ],
  },
  SUPERVISOR: {
    name: 'Shift Supervisor',
    description: 'POS supervisor with override authority, routine inventory, and goods receipt',
    permissions: [
      'pos.access',
      'pos.sell',
      'pos.discount.apply',
      'pos.discount.override',
      'pos.void_item',
      'pos.cancel_sale',
      'pos.refund',
      'pos.reprint_receipt',
      'pos.open_drawer',
      'pos.cash_in_out',
      'inventory.view',
      'inventory.adjust',
      'inventory.transfer',
      'inventory.reorder',
      'products.view',
      'products.barcodes.manage',
      'purchases.view',
      'purchases.receive',
      'suppliers.view',
      'finance.expenses.view',
      'finance.expenses.create',
      'reports.sales.view',
      'reports.inventory.view',
      'team.view',
      'settings.view',
    ],
  },
  CASHIER: {
    name: 'Cashier',
    description: 'Checkout counter operations, scanning, standard sales, and receipt printing',
    permissions: [
      'pos.access',
      'pos.sell',
      'pos.void_item',
      'pos.discount.apply',
      'pos.reprint_receipt',
      'pos.cash_in_out',
      'products.view',
      'reports.sales.view',
    ],
  },
  STOCK_CLERK: {
    name: 'Stock Clerk',
    description: 'Warehouse and shelf management, inventory counts, and delivery receiving',
    permissions: [
      'inventory.view',
      'inventory.adjust',
      'inventory.transfer',
      'products.view',
      'products.barcodes.manage',
      'purchases.view',
      'purchases.receive',
      'suppliers.view',
    ],
  },
  ACCOUNTANT: {
    name: 'Auditor & Accountant',
    description: 'Financial accounting, expense verification, reporting, and audit log inspection',
    permissions: [
      'finance.expenses.view',
      'finance.expenses.create',
      'finance.profit.view',
      'reports.sales.view',
      'reports.inventory.view',
      'reports.financial.view',
      'reports.export',
      'inventory.view',
      'inventory.cost.view',
      'purchases.view',
      'audit.view',
    ],
  },
}

export class RbacService {
  /**
   * Initializes or updates all system permissions in the database.
   */
  async seedPermissions(): Promise<void> {
    for (const perm of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: perm.key },
        create: {
          key: perm.key,
          module: perm.module,
          action: perm.action,
          displayName: perm.displayName,
          description: perm.description,
          riskLevel: perm.riskLevel,
        },
        update: {
          module: perm.module,
          action: perm.action,
          displayName: perm.displayName,
          description: perm.description,
          riskLevel: perm.riskLevel,
        },
      })
    }
  }

  /**
   * Seeds system default roles and connects their default permissions.
   */
  async seedSystemRoles(): Promise<void> {
    await this.seedPermissions()

    const allPermissions = await prisma.permission.findMany()
    const permMap = new Map(allPermissions.map((p) => [p.key, p.id]))

    for (const [code, template] of Object.entries(SYSTEM_ROLE_TEMPLATES)) {
      // Create or update the global system role template (businessId: null)
      let role = await prisma.appRole.findFirst({
        where: { businessId: null, code },
      })

      if (!role) {
        role = await prisma.appRole.create({
          data: {
            businessId: null,
            name: template.name,
            code,
            description: template.description,
            isSystem: true,
            isActive: true,
          },
        })
      } else {
        await prisma.appRole.update({
          where: { id: role.id },
          data: {
            name: template.name,
            description: template.description,
            isSystem: true,
          },
        })
      }

      // Connect permissions
      const targetKeys = template.permissions.includes('*')
        ? allPermissions.map((p) => p.key)
        : template.permissions

      for (const key of targetKeys) {
        const permId = permMap.get(key)
        if (permId) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permId,
              },
            },
            create: {
              roleId: role.id,
              permissionId: permId,
            },
            update: {},
          })
        }
      }
    }
  }

  /**
   * Ensures that a business has its standard system role templates seeded and ready.
   */
  async ensureBusinessRoles(businessId: string): Promise<void> {
    const allPermissions = await prisma.permission.findMany()
    const permMap = new Map(allPermissions.map((p) => [p.key, p.id]))

    for (const [code, template] of Object.entries(SYSTEM_ROLE_TEMPLATES)) {
      let role = await prisma.appRole.findUnique({
        where: {
          businessId_code: {
            businessId,
            code,
          },
        },
      })

      if (!role) {
        role = await prisma.appRole.create({
          data: {
            businessId,
            name: template.name,
            code,
            description: template.description,
            isSystem: true,
            isActive: true,
          },
        })

        const targetKeys = template.permissions.includes('*')
          ? allPermissions.map((p) => p.key)
          : template.permissions

        const rolePermissionsData = targetKeys
          .map((k) => permMap.get(k))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({
            roleId: role!.id,
            permissionId,
          }))

        if (rolePermissionsData.length > 0) {
          await prisma.rolePermission.createMany({
            data: rolePermissionsData,
            skipDuplicates: true,
          })
        }
      }
    }
  }

  /**
   * Migrates existing BusinessMembership records to UserRoleAssignment.
   */
  async syncBusinessMembershipsToRbac(businessId?: string): Promise<number> {
    await this.seedSystemRoles()

    const where = businessId ? { businessId } : {}
    const memberships = await prisma.businessMembership.findMany({
      where,
      include: { business: true },
    })

    let migrated = 0

    for (const mem of memberships) {
      await this.ensureBusinessRoles(mem.businessId)

      // Find role matching the membership role enum
      const roleCode = mem.role.toString()
      const role = await prisma.appRole.findUnique({
        where: {
          businessId_code: {
            businessId: mem.businessId,
            code: roleCode,
          },
        },
      })

      if (role) {
        const existing = await prisma.userRoleAssignment.findFirst({
          where: {
            userId: mem.userId,
            businessId: mem.businessId,
            roleId: role.id,
            branchId: null,
          },
        })

        if (!existing) {
          await prisma.userRoleAssignment.create({
            data: {
              userId: mem.userId,
              businessId: mem.businessId,
              roleId: role.id,
              branchId: null,
            },
          })
          migrated++
        }
      }
    }

    return migrated
  }

  /**
   * Retrieves the complete set of effective permission keys for a user in a business.
   */
  async getUserPermissions(
    userId: string,
    businessId: string,
    branchId?: string | null,
    existingMembership?: { role: string; isActive?: boolean } | null
  ): Promise<string[]> {
    let membership = existingMembership

    if (!membership) {
      membership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: { userId, businessId },
        },
      })
    }

    if (!membership || membership.isActive === false) {
      return []
    }

    const allSystemPermKeys = ['*', ...SYSTEM_PERMISSIONS.map((p) => p.key)]

    if (membership.role === 'OWNER') {
      return allSystemPermKeys
    }

    // 2. Fetch all role assignments for this user in this business
    try {
      const assignments = await prisma.userRoleAssignment.findMany({
        where: {
          userId,
          businessId,
          role: { isActive: true },
          OR: [{ branchId: null }, ...(branchId ? [{ branchId }] : [])],
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      })

      if (assignments && assignments.length > 0) {
        const permissionSet = new Set<string>()
        for (const a of assignments) {
          for (const rp of a.role.permissions) {
            if (rp.permission?.key) {
              permissionSet.add(rp.permission.key)
            }
          }
        }
        return Array.from(permissionSet)
      }
    } catch {
      // Mocked or non-relational test context fallback
    }

    // If user has no assignments yet, fallback to default role template based on BusinessMembership.role
    const template = SYSTEM_ROLE_TEMPLATES[membership.role]
    if (template) {
      if (template.permissions.includes('*')) {
        return allSystemPermKeys
      }
      return template.permissions
    }
    return []
  }

  /**
   * Checks if a user has a specific permission in a business.
   */
  async hasPermission(
    userId: string,
    businessId: string,
    permissionKey: string,
    branchId?: string | null
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, businessId, branchId)
    return userPermissions.includes(permissionKey)
  }

  /**
   * Lists all available system permissions grouped by module.
   */
  async listPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { riskLevel: 'desc' }, { key: 'asc' }],
    })
  }

  /**
   * Lists all roles for a business (including default system templates and custom roles).
   */
  async listRoles(businessId: string) {
    await this.ensureBusinessRoles(businessId)

    return prisma.appRole.findMany({
      where: { businessId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { roleAssignments: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    })
  }

  /**
   * Creates a custom role for a business.
   */
  async createCustomRole(
    businessId: string,
    actorId: string,
    input: {
      name: string
      description?: string
      permissionKeys: string[]
    }
  ) {
    const existing = await prisma.appRole.findFirst({
      where: {
        businessId,
        name: { equals: input.name.trim(), mode: 'insensitive' },
      },
    })

    if (existing) {
      throw new AppError(
        `A role with the name '${input.name}' already exists in this business`,
        409,
        'DUPLICATE_ROLE_NAME'
      )
    }

    const code = `CUSTOM_${input.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now().toString(36).toUpperCase()}`

    const permissions = await prisma.permission.findMany({
      where: { key: { in: input.permissionKeys } },
    })

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.appRole.create({
        data: {
          businessId,
          name: input.name.trim(),
          code,
          description: input.description?.trim(),
          isSystem: false,
          isActive: true,
          permissions: {
            create: permissions.map((p) => ({
              permissionId: p.id,
            })),
          },
        },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      })

      await auditService.record(
        {
          businessId,
          actorId,
          action: 'ROLE_CREATED',
          resourceType: 'ROLE',
          resourceId: created.id,
          description: `Created custom role '${created.name}' with ${permissions.length} permissions`,
          metadata: {
            name: created.name,
            code: created.code,
            permissionKeys: input.permissionKeys,
          },
        },
        tx
      )

      return created
    })

    return role
  }

  /**
   * Updates an existing custom role (system roles cannot be renamed or deleted, but their descriptions or permissions may be viewed).
   */
  async updateRole(
    businessId: string,
    roleId: string,
    actorId: string,
    input: {
      name?: string
      description?: string
      permissionKeys?: string[]
    }
  ) {
    const existing = await prisma.appRole.findFirst({
      where: { id: roleId, businessId },
      include: { permissions: { include: { permission: true } } },
    })

    if (!existing) {
      throw new AppError('Role not found for this business', 404, 'ROLE_NOT_FOUND')
    }

    if (existing.code === 'OWNER') {
      throw new AppError('The Owner role cannot be modified', 400, 'CANNOT_MODIFY_OWNER_ROLE')
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If permission keys provided, re-link permissions
      if (input.permissionKeys) {
        const permissions = await prisma.permission.findMany({
          where: { key: { in: input.permissionKeys } },
        })

        // Delete existing role permissions
        await tx.rolePermission.deleteMany({
          where: { roleId },
        })

        // Insert new ones
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId,
              permissionId: p.id,
            })),
          })
        }
      }

      const role = await tx.appRole.update({
        where: { id: roleId },
        data: {
          ...(input.name && !existing.isSystem ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description?.trim() } : {}),
        },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      })

      await auditService.record(
        {
          businessId,
          actorId,
          action: 'ROLE_UPDATED',
          resourceType: 'ROLE',
          resourceId: roleId,
          description: `Updated role '${role.name}'`,
          metadata: {
            name: role.name,
            permissionCount: input.permissionKeys?.length,
          },
        },
        tx
      )

      return role
    })

    return updated
  }

  /**
   * Deletes a custom role (system roles cannot be deleted).
   */
  async deleteRole(businessId: string, roleId: string, actorId: string) {
    const existing = await prisma.appRole.findFirst({
      where: { id: roleId, businessId },
      include: {
        _count: { select: { roleAssignments: true } },
      },
    })

    if (!existing) {
      throw new AppError('Role not found for this business', 404, 'ROLE_NOT_FOUND')
    }

    if (existing.isSystem) {
      throw new AppError('Built-in system roles cannot be deleted', 400, 'SYSTEM_ROLE_CANNOT_BE_DELETED')
    }

    if (existing._count.roleAssignments > 0) {
      throw new AppError(
        `Cannot delete role '${existing.name}' because it is assigned to ${existing._count.roleAssignments} staff member(s). Reassign them first.`,
        400,
        'ROLE_IN_USE'
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.appRole.delete({ where: { id: roleId } })

      await auditService.record(
        {
          businessId,
          actorId,
          action: 'ROLE_DELETED',
          resourceType: 'ROLE',
          resourceId: roleId,
          description: `Deleted custom role '${existing.name}'`,
        },
        tx
      )
    })

    return { success: true }
  }

  /**
   * Assigns roles to a staff member in a business.
   */
  async assignUserRoles(
    businessId: string,
    targetUserId: string,
    roleIds: string[],
    actorId: string,
    branchId?: string | null
  ) {
    // Verify user belongs to business
    const membership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: targetUserId,
          businessId,
        },
      },
    })

    if (!membership) {
      throw new AppError('Target user is not a member of this business', 404, 'MEMBER_NOT_FOUND')
    }

    // Verify all role IDs exist
    const roles = await prisma.appRole.findMany({
      where: {
        id: { in: roleIds },
        OR: [{ businessId }, { businessId: null }],
      },
    })

    if (roles.length !== roleIds.length) {
      throw new AppError('One or more specified roles do not exist', 400, 'INVALID_ROLE_ID')
    }

    await prisma.$transaction(async (tx) => {
      // Remove old assignments for this branch scope
      await tx.userRoleAssignment.deleteMany({
        where: {
          userId: targetUserId,
          businessId,
          branchId: branchId || null,
        },
      })

      // Create new assignments
      if (roleIds.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: roleIds.map((roleId) => ({
            userId: targetUserId,
            businessId,
            roleId,
            branchId: branchId || null,
          })),
        })
      }

      // Also sync BusinessMembership.role with the primary role if it's one of the standard roles
      const primaryRole = roles[0]
      if (primaryRole) {
        const standardCode = primaryRole.code as any
        if (['OWNER', 'MANAGER', 'CASHIER', 'STOCK_CLERK'].includes(standardCode)) {
          await tx.businessMembership.update({
            where: { id: membership.id },
            data: { role: standardCode },
          })
        }
      }

      await auditService.record(
        {
          businessId,
          actorId,
          action: 'USER_ROLES_ASSIGNED',
          resourceType: 'USER_ROLE',
          resourceId: targetUserId,
          description: `Assigned ${roles.length} role(s) to staff user: ${roles.map((r) => r.name).join(', ')}`,
          metadata: {
            targetUserId,
            roleIds,
            roleNames: roles.map((r) => r.name),
            branchId,
          },
        },
        tx
      )
    })

    return this.getUserPermissions(targetUserId, businessId, branchId)
  }
}

export const rbacService = new RbacService()
