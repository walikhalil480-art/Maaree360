import { useState, useEffect, type FC, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { StaffMember } from '../../types/team'
import type { AppRole } from '../../types/rbac'
import { AlertCircle, Sparkles } from 'lucide-react'

interface ChangeRoleModalProps {
  isOpen: boolean
  onClose: () => void
  member: StaffMember | null
  roles?: AppRole[]
  onUpdateRole: (membershipId: string, roleName: string, roleId?: string) => Promise<void>
}

export const ChangeRoleModal: FC<ChangeRoleModalProps> = ({
  isOpen,
  onClose,
  member,
  roles = [],
  onUpdateRole,
}) => {
  const [selectedRoleName, setSelectedRoleName] = useState<string>(member?.role || 'CASHIER')
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (member) {
      setSelectedRoleName(member.role)
      const matched = roles.find((r) => r.name === member.role)
      setSelectedRoleId(matched?.id)
      setError(null)
    }
  }, [member, roles])

  if (!member) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      setLoading(true)
      await onUpdateRole(member.id, selectedRoleName, selectedRoleId)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to update member role')
    } finally {
      setLoading(false)
    }
  }

  const defaultRoleDescriptions: Record<string, { title: string; desc: string }> = {
    OWNER: {
      title: 'Owner',
      desc: 'Full administrative authority across business settings, financial records, team roles, and data.',
    },
    STORE_MANAGER: {
      title: 'Store Manager',
      desc: 'Supervises store operations, reports, staff shifts, purchasing, and expense approvals.',
    },
    MANAGER: {
      title: 'Manager',
      desc: 'Manage day-to-day operations, inventory, expenses, reports, and staff shifts.',
    },
    SUPERVISOR: {
      title: 'Supervisor',
      desc: 'Shift oversight, register reconciliation, returns management, and operational approvals.',
    },
    CASHIER: {
      title: 'Cashier',
      desc: 'Access Point of Sale, process cash/card/M-Pesa sales, and handle sales shifts.',
    },
    STOCK_CLERK: {
      title: 'Stock Clerk',
      desc: 'Receive supplier deliveries, track stock quantities, and record physical inventory audits.',
    },
    ACCOUNTANT: {
      title: 'Accountant',
      desc: 'Inspect financial statements, cash flow, operating expenses, and export fiscal tax reports.',
    },
  }

  // Use dynamic roles from server if available, otherwise fallback to defaults
  const displayRoles =
    roles.length > 0
      ? roles
      : ([
          {
            id: 'owner',
            name: 'OWNER',
            displayName: 'Owner',
            description: defaultRoleDescriptions.OWNER.desc,
            isSystem: true,
            isCustom: false,
            permissions: [],
            userCount: 0,
            businessId: null,
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 'manager',
            name: 'MANAGER',
            displayName: 'Manager',
            description: defaultRoleDescriptions.MANAGER.desc,
            isSystem: true,
            isCustom: false,
            permissions: [],
            userCount: 0,
            businessId: null,
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 'cashier',
            name: 'CASHIER',
            displayName: 'Cashier',
            description: defaultRoleDescriptions.CASHIER.desc,
            isSystem: true,
            isCustom: false,
            permissions: [],
            userCount: 0,
            businessId: null,
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 'stock_clerk',
            name: 'STOCK_CLERK',
            displayName: 'Stock Clerk',
            description: defaultRoleDescriptions.STOCK_CLERK.desc,
            isSystem: true,
            isCustom: false,
            permissions: [],
            userCount: 0,
            businessId: null,
            createdAt: '',
            updatedAt: '',
          },
        ] as AppRole[])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Staff Role"
      description={`Update access level and operational permissions for ${member.user.name} (${member.user.email}).`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {displayRoles.map((r) => {
            const isSelected = selectedRoleName === r.name
            const fallbackInfo = defaultRoleDescriptions[r.name]
            const title = r.displayName || fallbackInfo?.title || r.name
            const desc = r.description || fallbackInfo?.desc || 'Operational role'

            return (
              <label
                key={r.id || r.name}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/40 text-slate-900 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.name}
                  checked={isSelected}
                  onChange={() => {
                    setSelectedRoleName(r.name)
                    setSelectedRoleId(r.id)
                  }}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{title}</span>

                    {r.name === 'OWNER' && (
                      <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        Full Admin
                      </span>
                    )}

                    {r.isCustom && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        <Sparkles className="w-2.5 h-2.5" /> Custom Role
                      </span>
                    )}

                    {r.permissions && r.permissions.length > 0 && (
                      <span className="text-[11px] font-medium text-slate-500">
                        • {r.permissions.length} perms
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </label>
            )
          })}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
