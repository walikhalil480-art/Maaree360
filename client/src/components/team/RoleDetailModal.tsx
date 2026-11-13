import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { AppRole } from '../../types/rbac'
import { Shield, Lock, Users, CheckCircle2 } from 'lucide-react'

interface RoleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  role: AppRole | null
  onEdit?: () => void
  onDuplicate?: () => void
}

export const RoleDetailModal: React.FC<RoleDetailModalProps> = ({
  isOpen,
  onClose,
  role,
  onEdit,
  onDuplicate,
}) => {
  if (!role) return null

  // Group role permissions by module prefix (e.g. "pos.sell" -> module "pos")
  const grouped: Record<string, string[]> = {}
  role.permissions.forEach((permKey) => {
    const mod = permKey.includes('.') ? permKey.split('.')[0] : 'other'
    if (!grouped[mod]) grouped[mod] = []
    grouped[mod].push(permKey)
  })

  const moduleTitles: Record<string, string> = {
    pos: 'Point of Sale (POS)',
    inventory: 'Inventory & Stock Management',
    products: 'Products & Catalog',
    purchases: 'Purchases & Receiving',
    suppliers: 'Suppliers & Vendors',
    finance: 'Financial Operations & Expenses',
    reports: 'Reports & Analytics',
    team: 'Team & Access Management',
    system: 'System Configuration & Settings',
    settings: 'Settings & Administration',
    audit: 'Audit & Compliance',
    other: 'General Permissions',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role.displayName}
      description={role.description || 'Configured access role for business operations.'}
      size="lg"
    >
      <div className="flex flex-col max-h-[75vh]">
        {/* Header Stats */}
        <div className="p-6 pb-4 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/60">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
            <span className="text-slate-400">Code:</span>
            <span className="font-semibold">{role.name}</span>
          </div>

          {role.isSystem ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200/80 text-slate-800">
              <Lock className="w-3 h-3 text-slate-600" />
              System Default Role
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800">
              <Shield className="w-3 h-3 text-emerald-600" />
              Custom Business Role
            </span>
          )}

          <div className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {role.userCount} {role.userCount === 1 ? 'member' : 'members'} assigned
            </span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{role.permissions.length} total permissions</span>
          </div>
        </div>

        {/* Scrollable Permissions View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No permissions configured for this role.
            </div>
          ) : (
            Object.entries(grouped).map(([mod, keys]) => (
              <div
                key={mod}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white"
              >
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {moduleTitles[mod] || mod.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {keys.length} enabled
                  </span>
                </div>

                <div className="p-3 flex flex-wrap gap-1.5">
                  {keys.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onDuplicate && (
              <Button type="button" variant="outline" size="sm" onClick={onDuplicate}>
                Duplicate as Custom Role
              </Button>
            )}
            {onEdit && (
              <Button type="button" variant="primary" size="sm" onClick={onEdit}>
                Edit Role Permissions
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
