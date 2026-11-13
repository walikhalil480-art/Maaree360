import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { apiFetch } from '../../api/client'
import type { AppRole, Permission, PermissionRiskLevel } from '../../types/rbac'
import {
  Shield,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

interface RoleBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  roleToEdit?: AppRole | null
  duplicateFrom?: AppRole | null
  onRoleSaved: () => void
}

export const RoleBuilderModal: React.FC<RoleBuilderModalProps> = ({
  isOpen,
  onClose,
  businessId,
  roleToEdit,
  duplicateFrom,
  onRoleSaved,
}) => {
  const isEditing = Boolean(roleToEdit)

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({})
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({})

  const [loading, setLoading] = useState(false)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all system permissions when modal opens
  useEffect(() => {
    if (!isOpen || !businessId) return

    const fetchPermissions = async () => {
      try {
        setLoadingPermissions(true)
        setError(null)
        const res = await apiFetch<{
          success: boolean
          data: { permissions: Permission[]; grouped: Record<string, Permission[]> }
        }>(`/api/v1/businesses/${businessId}/permissions`)

        if (res.success && res.data) {
          setAllPermissions(res.data.permissions || [])
          setGroupedPermissions(res.data.grouped || {})
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load permissions catalog')
      } finally {
        setLoadingPermissions(false)
      }
    }

    fetchPermissions()
  }, [isOpen, businessId])

  // Initialize form fields
  useEffect(() => {
    if (!isOpen) return

    if (roleToEdit) {
      setName(roleToEdit.name)
      setDisplayName(roleToEdit.displayName)
      setDescription(roleToEdit.description || '')
      setSelectedKeys(new Set(roleToEdit.permissions || []))
    } else if (duplicateFrom) {
      setName(`${duplicateFrom.name}_COPY`)
      setDisplayName(`${duplicateFrom.displayName} (Copy)`)
      setDescription(duplicateFrom.description || '')
      setSelectedKeys(new Set(duplicateFrom.permissions || []))
    } else {
      setName('')
      setDisplayName('')
      setDescription('')
      setSelectedKeys(new Set())
    }
  }, [isOpen, roleToEdit, duplicateFrom])

  const togglePermission = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleModuleAll = (modulePerms: Permission[]) => {
    const keys = modulePerms.map((p) => p.key)
    const allSelected = keys.every((k) => selectedKeys.has(k))

    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        keys.forEach((k) => next.delete(k))
      } else {
        keys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const toggleModuleCollapse = (module: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [module]: !prev[module],
    }))
  }

  const selectAll = () => {
    setSelectedKeys(new Set(allPermissions.map((p) => p.key)))
  }

  const clearAll = () => {
    setSelectedKeys(new Set())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!displayName.trim()) {
      setError('Please provide a display name for the role.')
      return
    }

    if (!isEditing && !name.trim()) {
      setError('Please provide an internal role code (e.g. STORE_AUDITOR).')
      return
    }

    if (selectedKeys.size === 0) {
      setError('Please select at least one permission for this role.')
      return
    }

    try {
      setLoading(true)
      const permissionKeys = Array.from(selectedKeys)

      if (isEditing && roleToEdit) {
        await apiFetch(`/api/v1/businesses/${businessId}/roles/${roleToEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            displayName: displayName.trim(),
            description: description.trim() || undefined,
            permissionKeys,
          }),
        })
      } else {
        await apiFetch(`/api/v1/businesses/${businessId}/roles`, {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
            displayName: displayName.trim(),
            description: description.trim() || undefined,
            permissionKeys,
          }),
        })
      }

      onRoleSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save role configuration.')
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadge = (level: PermissionRiskLevel) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
            High Risk
          </span>
        )
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Medium
          </span>
        )
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Standard
          </span>
        )
    }
  }

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
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Role: ${roleToEdit?.displayName}` : 'Create Custom Role'}
      description="Define granular capabilities, functional permissions, and authorization levels for team members."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Night Shift Supervisor"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  if (!isEditing && !name) {
                    setName(
                      e.target.value
                        .toUpperCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^A-Z0-9_]/g, '')
                    )
                  }
                }}
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Human-friendly role label shown in the UI.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Role Code <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. SHIFT_SUPERVISOR"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                disabled={isEditing}
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {isEditing ? 'Role code cannot be changed once created.' : 'Unique internal identifier.'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Describe what responsibilities this role handles and when it should be assigned..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Permissions Matrix Header */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Functional Permissions Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selected: <span className="font-semibold text-slate-800">{selectedKeys.size}</span> of{' '}
                  <span className="font-semibold text-slate-800">{allPermissions.length}</span> permissions
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={selectAll}
                  className="text-slate-600 text-[11px]"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearAll}
                  className="text-slate-500 text-[11px]"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {loadingPermissions ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                Loading permissions catalog...
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([moduleKey, perms]) => {
                  const isCollapsed = Boolean(collapsedModules[moduleKey])
                  const moduleKeys = perms.map((p) => p.key)
                  const selectedCount = moduleKeys.filter((k) => selectedKeys.has(k)).length
                  const allModuleSelected = selectedCount === perms.length

                  return (
                    <div
                      key={moduleKey}
                      className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs"
                    >
                      {/* Module Header Bar */}
                      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/70 select-none">
                        <button
                          type="button"
                          onClick={() => toggleModuleCollapse(moduleKey)}
                          className="flex items-center gap-2 text-left font-semibold text-xs text-slate-800 hover:text-slate-900 focus:outline-none"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{moduleTitles[moduleKey] || moduleKey.toUpperCase()}</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            ({selectedCount}/{perms.length})
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleModuleAll(perms)}
                          className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none px-2 py-0.5 rounded hover:bg-emerald-50"
                        >
                          {allModuleSelected ? 'Deselect Module' : 'Select Module'}
                        </button>
                      </div>

                      {/* Permissions List */}
                      {!isCollapsed && (
                        <div className="p-3 divide-y divide-slate-100">
                          {perms.map((perm) => {
                            const isChecked = selectedKeys.has(perm.key)

                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
                                  isChecked ? 'bg-emerald-50/30' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.key)}
                                  className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-900">
                                      {perm.name}
                                    </span>
                                    <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                      {perm.key}
                                    </code>
                                    {getRiskBadge(perm.riskLevel)}
                                  </div>

                                  {perm.description && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            {isEditing && roleToEdit?.isSystem && (
              <span className="flex items-center gap-1 text-amber-700">
                <Lock className="w-3 h-3" /> System template modifications apply to this business.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              {isEditing ? 'Save Changes' : 'Create Role'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
