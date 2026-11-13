import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Toast, type ToastProps } from '../components/ui/Toast'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'

import { InviteStaffModal } from '../components/team/InviteStaffModal'
import { ChangeRoleModal } from '../components/team/ChangeRoleModal'
import { RegisterModal } from '../components/team/RegisterModal'
import { OpenShiftModal } from '../components/team/OpenShiftModal'
import { CloseShiftModal } from '../components/team/CloseShiftModal'
import { AuditDetailModal } from '../components/team/AuditDetailModal'
import { RoleBuilderModal } from '../components/team/RoleBuilderModal'
import { RoleDetailModal } from '../components/team/RoleDetailModal'

import type { StaffMember, StaffInvitation, StaffRole, InviteStaffInput } from '../types/team'
import type { Register, CashierShift, OpenShiftInput, CloseShiftInput } from '../types/shift'
import type { AuditLogEntry } from '../types/audit'
import type { AppRole } from '../types/rbac'

import {
  Users,
  Shield,
  UserPlus,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserX,
  UserCheck,
  Edit,
  Trash2,
  Copy,
  Banknote,
  Search,
  RefreshCw,
  Plus,
  Activity,
  Lock,
  ExternalLink,
  Sparkles,
  KeyRound,
  Send,
  AlertCircle,
} from 'lucide-react'

type TabType = 'staff' | 'invitations' | 'roles' | 'shifts' | 'audit'

export default function TeamPage() {
  const { activeBusiness, user } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'
  const userRole = activeBusiness?.role || 'CASHIER'
  const isOwner = userRole === 'OWNER'
  const isManagerOrOwner = userRole === 'OWNER' || userRole === 'MANAGER'

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('staff')

  // Staff state
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [memberToToggle, setMemberToToggle] = useState<StaffMember | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<StaffMember | null>(null)

  // Invitations state
  const [invitations, setInvitations] = useState<StaffInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [invitationToRevoke, setInvitationToRevoke] = useState<StaffInvitation | null>(null)
  const [lastCreatedInvite, setLastCreatedInvite] = useState<{ url: string; token: string } | null>(null)
  const [inviteTokens, setInviteTokens] = useState<Record<string, string>>({})
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null)

  // Registers & Shifts state
  const [registers, setRegisters] = useState<Register[]>([])
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null)
  const [shiftHistory, setShiftHistory] = useState<CashierShift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [editingRegister, setEditingRegister] = useState<Register | null>(null)
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false)
  const [shiftToClose, setShiftToClose] = useState<{ id: string; isOverride: boolean } | null>(null)

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [auditActionFilter, setAuditActionFilter] = useState('ALL')
  const [auditSearch, setAuditSearch] = useState('')
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AuditLogEntry | null>(null)

  // Roles & Permissions state
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [isRoleBuilderOpen, setIsRoleBuilderOpen] = useState(false)
  const [roleToEdit, setRoleToEdit] = useState<AppRole | null>(null)
  const [duplicateFromRole, setDuplicateFromRole] = useState<AppRole | null>(null)
  const [roleDetailToView, setRoleDetailToView] = useState<AppRole | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<AppRole | null>(null)
  const [roleSearch, setRoleSearch] = useState('')

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // 1. Fetch Staff Members
  const fetchMembers = useCallback(async () => {
    if (!businessId) return
    try {
      setLoadingMembers(true)
      const res = await apiFetch<any>(
        `/api/v1/businesses/${businessId}/team/members`
      )
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.items || []
        setMembers(list)
      } else {
        setMembers([])
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load team members', 'error')
    } finally {
      setLoadingMembers(false)
    }
  }, [businessId])

  // 2. Fetch Invitations
  const fetchInvitations = useCallback(async () => {
    if (!businessId) return
    try {
      setLoadingInvitations(true)
      const res = await apiFetch<any>(
        `/api/v1/businesses/${businessId}/team/invitations`
      )
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.items || []
        setInvitations(list)
      } else {
        setInvitations([])
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load invitations', 'error')
    } finally {
      setLoadingInvitations(false)
    }
  }, [businessId])

  // 3. Fetch Shifts & Registers
  const fetchShiftsAndRegisters = useCallback(async () => {
    if (!businessId) return
    try {
      setLoadingShifts(true)
      const [regRes, curRes, histRes] = await Promise.all([
        apiFetch<any>(
          `/api/v1/businesses/${businessId}/shifts/registers`
        ),
        apiFetch<any>(
          `/api/v1/businesses/${businessId}/shifts/current`
        ),
        apiFetch<any>(
          `/api/v1/businesses/${businessId}/shifts/history`
        ),
      ])
      if (regRes?.success && regRes?.data) {
        const regList = Array.isArray(regRes.data) ? regRes.data : regRes.data.items || []
        setRegisters(regList)
      } else {
        setRegisters([])
      }
      if (curRes?.success) setActiveShift(curRes.data)
      if (histRes?.success && histRes?.data) {
        const histList = Array.isArray(histRes.data) ? histRes.data : histRes.data.items || []
        setShiftHistory(histList)
      } else {
        setShiftHistory([])
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load shifts and registers', 'error')
    } finally {
      setLoadingShifts(false)
    }
  }, [businessId])

  // 4. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    if (!businessId || !isManagerOrOwner) return
    try {
      setLoadingAudit(true)
      const params = new URLSearchParams()
      if (auditActionFilter !== 'ALL') params.append('action', auditActionFilter)
      const res = await apiFetch<any>(`/api/v1/businesses/${businessId}/audit?${params.toString()}`)
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.items || []
        setAuditLogs(list)
      } else {
        setAuditLogs([])
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load audit logs', 'error')
    } finally {
      setLoadingAudit(false)
    }
  }, [businessId, isManagerOrOwner, auditActionFilter])

  // 5. Fetch Roles
  const fetchRoles = useCallback(async () => {
    if (!businessId) return
    try {
      setLoadingRoles(true)
      const res = await apiFetch<{ success: boolean; data: AppRole[] }>(
        `/api/v1/businesses/${businessId}/roles`
      )
      if (res.success && res.data) {
        setRoles(res.data)
      } else {
        setRoles([])
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load roles catalog', 'error')
    } finally {
      setLoadingRoles(false)
    }
  }, [businessId])

  // Initial load based on tab
  useEffect(() => {
    if (!businessId) return
    if (activeTab === 'staff') fetchMembers()
    if (activeTab === 'invitations') fetchInvitations()
    if (activeTab === 'roles') fetchRoles()
    if (activeTab === 'shifts') fetchShiftsAndRegisters()
    if (activeTab === 'audit') fetchAuditLogs()
  }, [activeTab, businessId, fetchMembers, fetchInvitations, fetchRoles, fetchShiftsAndRegisters, fetchAuditLogs])

  // Fetch roles initially to make sure modal selects are pre-populated
  useEffect(() => {
    if (businessId) {
      fetchRoles()
    }
  }, [businessId, fetchRoles])

  // Member Action Handlers
  const handleInviteStaff = async (input: InviteStaffInput) => {
    if (!businessId) return null
    const res = await apiFetch<{
      success: boolean
      message: string
      data: StaffInvitation
      invitationUrl: string
      token: string
      emailDelivery?: {
        status: 'SENT' | 'FAILED' | 'PENDING'
        error?: string
      }
    }>(`/api/v1/businesses/${businessId}/team/members/invite`, {
      method: 'POST',
      body: JSON.stringify(input),
    })

    if (res.success && res.token) {
      showToast('Invitation created successfully!', 'success')
      setLastCreatedInvite({
        url: res.invitationUrl,
        token: res.token,
      })
      if (res.data?.id) {
        setInviteTokens((prev) => ({ ...prev, [res.data.id]: res.token }))
      }
      fetchMembers()
      fetchInvitations()
      return {
        token: res.token,
        invitationUrl: res.invitationUrl,
        recipient: input.email || input.phone || 'Employee',
        name: input.name,
        role: input.role,
        emailDelivery: res.emailDelivery,
      }
    }
    return null
  }

  const handleCopyOrResendInvite = async (invite: StaffInvitation) => {
    if (!businessId) return
    const knownToken = inviteTokens[invite.id] || (invite.token ? invite.token : null)
    if (knownToken) {
      copyToClipboard(`${window.location.origin}/accept-invitation?token=${knownToken}`)
      return
    }

    try {
      setResendingInviteId(invite.id)
      const res = await apiFetch<{
        success: boolean
        message: string
        token: string
        invitationUrl: string
      }>(`/api/v1/businesses/${businessId}/team/invitations/${invite.id}/resend`, {
        method: 'POST',
      })

      if (res.success && res.token) {
        setInviteTokens((prev) => ({ ...prev, [invite.id]: res.token }))
        copyToClipboard(`${window.location.origin}/accept-invitation?token=${res.token}`)
        showToast('Fresh invitation link generated and copied to clipboard!', 'success')
        fetchInvitations()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to refresh invitation link', 'error')
    } finally {
      setResendingInviteId(null)
    }
  }

  const handleUpdateRole = async (membershipId: string, roleName: string, roleId?: string) => {
    if (!businessId) return
    try {
      const res = await apiFetch<{ success: boolean; message: string; data: StaffMember }>(
        `/api/v1/businesses/${businessId}/team/members/${membershipId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role: roleName }),
        }
      )

      if (roleId && selectedMember?.user?.id) {
        try {
          await apiFetch(`/api/v1/businesses/${businessId}/roles/assign`, {
            method: 'POST',
            body: JSON.stringify({
              userId: selectedMember.user.id,
              roleIds: [roleId],
            }),
          })
        } catch {
          // assignment fallback
        }
      }

      if (res.success) {
        showToast(res.message || 'Role updated successfully', 'success')
        fetchMembers()
        fetchRoles()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update member role', 'error')
      throw err
    }
  }

  const handleDeleteRole = async () => {
    if (!businessId || !roleToDelete) return
    try {
      const res = await apiFetch<{ success: boolean; message: string }>(
        `/api/v1/businesses/${businessId}/roles/${roleToDelete.id}`,
        {
          method: 'DELETE',
        }
      )
      if (res.success) {
        showToast(res.message || 'Role deleted successfully', 'success')
        fetchRoles()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete role', 'error')
    } finally {
      setRoleToDelete(null)
    }
  }

  const handleToggleMemberStatus = async () => {
    if (!businessId || !memberToToggle) return
    try {
      const newStatus = !memberToToggle.isActive
      const res = await apiFetch<{ success: boolean; message: string; data: StaffMember }>(
        `/api/v1/businesses/${businessId}/team/members/${memberToToggle.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: newStatus }),
        }
      )
      if (res.success) {
        showToast(res.message, 'success')
        fetchMembers()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update member status', 'error')
    } finally {
      setMemberToToggle(null)
    }
  }

  const handleRemoveMember = async () => {
    if (!businessId || !memberToRemove) return
    try {
      const res = await apiFetch<{ success: boolean; message: string }>(
        `/api/v1/businesses/${businessId}/team/members/${memberToRemove.id}`,
        {
          method: 'DELETE',
        }
      )
      if (res.success) {
        showToast(res.message, 'success')
        fetchMembers()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove member', 'error')
    } finally {
      setMemberToRemove(null)
    }
  }

  const handleRevokeInvitation = async () => {
    if (!businessId || !invitationToRevoke) return
    try {
      const res = await apiFetch<{ success: boolean; message: string }>(
        `/api/v1/businesses/${businessId}/team/invitations/${invitationToRevoke.id}`,
        {
          method: 'DELETE',
        }
      )
      if (res.success) {
        showToast(res.message, 'success')
        fetchInvitations()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke invitation', 'error')
    } finally {
      setInvitationToRevoke(null)
    }
  }

  // Register Handlers
  const handleSaveRegister = async (data: { name: string; code: string; description?: string }) => {
    if (!businessId) return
    if (editingRegister) {
      const res = await apiFetch<{ success: boolean; message: string; data: Register }>(
        `/api/v1/businesses/${businessId}/shifts/registers/${editingRegister.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      )
      if (res.success) {
        showToast('Register updated successfully', 'success')
        fetchShiftsAndRegisters()
      }
    } else {
      const res = await apiFetch<{ success: boolean; message: string; data: Register }>(
        `/api/v1/businesses/${businessId}/shifts/registers`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      )
      if (res.success) {
        showToast('Register created successfully', 'success')
        fetchShiftsAndRegisters()
      }
    }
  }

  // Shift Handlers
  const handleOpenShift = async (data: OpenShiftInput) => {
    if (!businessId) return
    const res = await apiFetch<{ success: boolean; message: string; data: CashierShift }>(
      `/api/v1/businesses/${businessId}/shifts/open`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    if (res.success) {
      showToast('Cashier shift started successfully', 'success')
      fetchShiftsAndRegisters()
    }
  }

  const handleCloseShift = async (shiftId: string, data: CloseShiftInput) => {
    if (!businessId) return
    const res = await apiFetch<{ success: boolean; message: string; data: CashierShift }>(
      `/api/v1/businesses/${businessId}/shifts/${shiftId}/close`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    if (res.success) {
      showToast('Shift reconciled and closed successfully', 'success')
      fetchShiftsAndRegisters()
    }
  }

  // Helpers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Invitation link copied to clipboard!', 'success')
  }

  const getRoleBadgeVariant = (role: StaffRole) => {
    switch (role) {
      case 'OWNER':
        return 'danger'
      case 'MANAGER':
        return 'info'
      case 'CASHIER':
        return 'success'
      case 'STOCK_CLERK':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  const memberList = Array.isArray(members) ? members : []
  const inviteList = Array.isArray(invitations) ? invitations : []
  const registerList = Array.isArray(registers) ? registers : []
  const shiftList = Array.isArray(shiftHistory) ? shiftHistory : []
  const auditList = Array.isArray(auditLogs) ? auditLogs : []

  const activeCount = memberList.filter((m) => m.isActive).length
  const suspendedCount = memberList.filter((m) => !m.isActive).length
  const cashierClerkCount = memberList.filter(
    (m) => m.role === 'CASHIER' || m.role === 'STOCK_CLERK'
  ).length

  // Filtered audit logs
  const filteredAuditLogs = auditList.filter((entry) => {
    if (!auditSearch) return true
    const term = auditSearch.toLowerCase()
    return (
      entry.action.toLowerCase().includes(term) ||
      entry.actor?.name?.toLowerCase().includes(term) ||
      entry.actor?.email?.toLowerCase().includes(term) ||
      entry.resourceType.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <PageHeader
        title="Team"
        actions={
          <div className="flex items-center gap-3">
            {activeTab === 'shifts' && !activeShift && (
              <Button
                variant="outline"
                className="flex items-center gap-1.5"
                onClick={() => setIsOpenShiftModalOpen(true)}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                Start Shift
              </Button>
            )}

            {activeTab === 'shifts' && isManagerOrOwner && (
              <Button
                variant="outline"
                className="flex items-center gap-1.5"
                onClick={() => {
                  setEditingRegister(null)
                  setIsRegisterModalOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
                Add Register
              </Button>
            )}

            {activeTab === 'roles' && isManagerOrOwner && (
              <Button
                variant="primary"
                className="flex items-center gap-1.5"
                onClick={() => {
                  setRoleToEdit(null)
                  setDuplicateFromRole(null)
                  setIsRoleBuilderOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
                Create Role
              </Button>
            )}

            {isManagerOrOwner && (
              <Button
                variant="primary"
                className="flex items-center gap-1.5"
                onClick={() => setIsInviteModalOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Invite Staff
              </Button>
            )}
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Staff"
          value={memberList.length.toString()}
          icon={<Users className="w-5 h-5 text-slate-600" />}
          subtitle="Members with business access"
        />
        <MetricCard
          title="Active Members"
          value={activeCount.toString()}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          subtitle="Authorized to sign in"
          statusBadge={{ text: 'Authorized', variant: 'success' }}
        />
        <MetricCard
          title="Cashiers & Clerks"
          value={cashierClerkCount.toString()}
          icon={<Shield className="w-5 h-5 text-blue-600" />}
          subtitle="Operational floor staff"
        />
        <MetricCard
          title="Suspended"
          value={suspendedCount.toString()}
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          subtitle="Immediate access revoked"
          statusBadge={
            suspendedCount > 0
              ? { text: 'Attention', variant: 'warning' }
              : undefined
          }
        />
      </div>

      {/* Newly Created Invite Banner */}
      {lastCreatedInvite && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                Staff Invitation Link Ready (Demo / Dev Mode)
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Copy and share this secure link with the invited employee to complete onboarding:
              </p>
              <span className="inline-block mt-1 font-mono text-xs bg-white px-2.5 py-1 rounded-md border border-emerald-200 text-emerald-900 break-all select-all">
                {window.location.origin}/accept-invitation?token={lastCreatedInvite.token}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  `${window.location.origin}/accept-invitation?token=${lastCreatedInvite.token}`
                )
              }
              className="flex items-center gap-1.5 bg-white"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-700" />
              Copy Link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastCreatedInvite(null)}
              className="text-slate-500 hover:text-slate-700 text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Members
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {memberList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'invitations'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            Invitations
            {inviteList.filter((i) => i.status === 'PENDING').length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                {inviteList.filter((i) => i.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            Roles & Permissions
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {roles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'shifts'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Banknote className="w-4 h-4" />
            Registers & Shifts
            {activeShift && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold animate-pulse">
                ONGOING
              </span>
            )}
          </button>

          {isManagerOrOwner && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'border-emerald-600 text-emerald-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity className="w-4 h-4" />
              Audit Log
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Immutable
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* TAB 1: Staff & Roles */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Current Staff Members</h3>
              <p className="text-xs text-slate-500">
                Staff accounts with access to {activeBusiness?.name}. Roles determine permitted actions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMembers}
              isLoading={loadingMembers}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          {loadingMembers ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : memberList.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Users className="w-8 h-8 text-slate-400" />}
                title="No staff members found"
                description="Invite employees to your shop to assign roles and manage POS cashiers."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    Invite Staff
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Employee</th>
                    <th className="px-6 py-3.5 font-semibold">Assigned Role</th>
                    <th className="px-6 py-3.5 font-semibold">Account Status</th>
                    <th className="px-6 py-3.5 font-semibold">Joined Date</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberList.map((member) => {
                    const isSelf = member.userId === user?.id
                    const isLastActiveOwner =
                      member.role === 'OWNER' &&
                      member.isActive &&
                      memberList.filter((m) => m.role === 'OWNER' && m.isActive).length === 1

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {member.user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                {member.user.name}
                                {isSelf && (
                                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-normal">
                                {member.user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role.replace(/_/g, ' ')}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          {member.isActive ? (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="warning" dot>
                              Suspended
                            </Badge>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(member.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Change Role Button */}
                            {isManagerOrOwner && (
                              <button
                                onClick={() => {
                                  setSelectedMember(member)
                                  setIsRoleModalOpen(true)
                                }}
                                disabled={
                                  (userRole === 'MANAGER' &&
                                    (member.role === 'OWNER' || isSelf)) ||
                                  isLastActiveOwner
                                }
                                title={
                                  isLastActiveOwner
                                    ? 'Cannot demote the last remaining active owner'
                                    : 'Change role'
                                }
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}

                            {/* Suspend / Reactivate Button */}
                            {isManagerOrOwner && (
                              <button
                                onClick={() => setMemberToToggle(member)}
                                disabled={isLastActiveOwner || (userRole === 'MANAGER' && member.role === 'OWNER')}
                                title={
                                  isLastActiveOwner
                                    ? 'Cannot suspend the last remaining active owner'
                                    : member.isActive
                                    ? 'Suspend staff member'
                                    : 'Reactivate staff member'
                                }
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                  member.isActive
                                    ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                              >
                                {member.isActive ? (
                                  <UserX className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Remove Member Button */}
                            {isOwner && (
                              <button
                                onClick={() => setMemberToRemove(member)}
                                disabled={isLastActiveOwner}
                                title={
                                  isLastActiveOwner
                                    ? 'Cannot remove the last remaining active owner'
                                    : 'Remove staff member from business'
                                }
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Invitations */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Secure Cryptographic Staff Onboarding</p>
              <p className="text-blue-800">
                Staff invitations generate a secure SHA-256 token link. In local development or testing mode,
                simply click <strong>Copy Link</strong> next to any pending invitation and open it in the browser
                to accept the role atomically.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Staff Invitations</h3>
                <p className="text-xs text-slate-500">
                  Track pending and historical invitations sent to prospective employees.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInvitations}
                isLoading={loadingInvitations}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>

            {loadingInvitations ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : inviteList.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Mail className="w-8 h-8 text-slate-400" />}
                  title="No invitations found"
                  description="Send an invitation by email or phone to onboard staff members."
                  action={
                    isManagerOrOwner ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsInviteModalOpen(true)}
                      >
                        Invite Staff
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Recipient</th>
                      <th className="px-6 py-3.5 font-semibold">Role</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                      <th className="px-6 py-3.5 font-semibold">Invited By</th>
                      <th className="px-6 py-3.5 font-semibold">Expires</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inviteList.map((invite) => {
                      const isPending = invite.status === 'PENDING'
                      const isExpired =
                        isPending && new Date(invite.expiresAt).getTime() < Date.now()
                      const statusVariant =
                        invite.status === 'ACCEPTED'
                          ? 'success'
                          : isExpired
                          ? 'neutral'
                          : invite.status === 'REVOKED'
                          ? 'danger'
                          : 'info'

                      return (
                        <tr key={invite.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            {invite.name && (
                              <div className="font-semibold text-slate-900 text-xs mb-0.5">
                                {invite.name}
                              </div>
                            )}
                            {invite.email ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>{invite.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{invite.phone}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <Badge variant={getRoleBadgeVariant(invite.role)}>
                              {invite.role.replace(/_/g, ' ')}
                            </Badge>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant={statusVariant}>
                                {isExpired ? 'EXPIRED' : invite.status}
                              </Badge>
                              {invite.emailDeliveryStatus === 'SENT' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Send className="w-2.5 h-2.5 text-emerald-600" /> Delivered
                                </span>
                              )}
                              {invite.emailDeliveryStatus === 'FAILED' && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
                                  title={invite.emailDeliveryError || 'Email delivery unconfigured'}
                                >
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-600" /> Undelivered
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-600">
                            <div>{invite.invitedBy?.name || 'Admin'}</div>
                            {invite.resentAt && (
                              <span className="text-[10px] text-slate-400 block">
                                Refreshed {new Date(invite.resentAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-500">
                            {new Date(invite.expiresAt).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isPending && !isExpired && (
                                <>
                                  <button
                                    onClick={() => handleCopyOrResendInvite(invite)}
                                    disabled={resendingInviteId === invite.id}
                                    title="Copy invitation link"
                                    className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    {resendingInviteId === invite.id ? 'Generating...' : 'Copy Link'}
                                  </button>

                                  {(inviteTokens[invite.id] || invite.token) && (
                                    <button
                                      onClick={() =>
                                        window.open(
                                          `${window.location.origin}/accept-invitation?token=${
                                            inviteTokens[invite.id] || invite.token
                                          }`,
                                          '_blank'
                                        )
                                      }
                                      title="Open and test onboarding page"
                                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Test Link
                                    </button>
                                  )}
                                </>
                              )}

                              {isPending && isManagerOrOwner && (
                                <button
                                  onClick={() => setInvitationToRevoke(invite)}
                                  title="Revoke invitation"
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Roles & Permissions */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roles by title, code or responsibilities..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRoles}
                isLoading={loadingRoles}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>

              {isManagerOrOwner && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setRoleToEdit(null)
                    setDuplicateFromRole(null)
                    setIsRoleBuilderOpen(true)
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Custom Role
                </Button>
              )}
            </div>
          </div>

          {/* Roles Cards Grid */}
          {loadingRoles ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
              Loading access control roles...
            </div>
          ) : roles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <EmptyState
                icon={<Shield className="w-8 h-8 text-slate-400" />}
                title="No roles found"
                description="Initialize or create custom roles to manage granular permissions for your staff."
                action={
                  isManagerOrOwner ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setRoleToEdit(null)
                        setDuplicateFromRole(null)
                        setIsRoleBuilderOpen(true)
                      }}
                    >
                      Create Custom Role
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {roles
                .filter((r) => {
                  if (!roleSearch) return true
                  const q = roleSearch.toLowerCase()
                  return (
                    r.displayName.toLowerCase().includes(q) ||
                    r.name.toLowerCase().includes(q) ||
                    (r.description && r.description.toLowerCase().includes(q))
                  )
                })
                .map((roleItem) => {
                  const isOwnerRole = roleItem.name === 'OWNER'

                  return (
                    <div
                      key={roleItem.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
                    >
                      {/* Top Content */}
                      <div className="p-5 pb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h4 className="text-base font-bold text-slate-900 tracking-tight truncate">
                              {roleItem.displayName}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-400">
                              {roleItem.name}
                            </span>
                          </div>

                          {roleItem.isSystem ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                              System
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              Custom
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] leading-relaxed">
                          {roleItem.description || 'Configured operational role with granular security capabilities.'}
                        </p>

                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <strong>{roleItem.userCount}</strong> assigned
                          </span>
                          <span className="flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                            <strong>{roleItem.permissions.length}</strong> permissions
                          </span>
                        </div>
                      </div>

                      {/* Permissions Tags Preview */}
                      <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap gap-1 items-center min-h-[38px]">
                        {roleItem.permissions.slice(0, 3).map((pKey) => (
                          <span
                            key={pKey}
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-600"
                          >
                            {pKey}
                          </span>
                        ))}
                        {roleItem.permissions.length > 3 && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            +{roleItem.permissions.length - 3} more
                          </span>
                        )}
                        {roleItem.permissions.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No permissions assigned</span>
                        )}
                      </div>

                      {/* Card Action Footer */}
                      <div className="p-3 px-5 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setRoleDetailToView(roleItem)}
                          className="text-slate-600 hover:text-slate-900 text-xs"
                        >
                          Inspect
                        </Button>

                        <div className="flex items-center gap-1">
                          {isManagerOrOwner && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setRoleToEdit(null)
                                setDuplicateFromRole(roleItem)
                                setIsRoleBuilderOpen(true)
                              }}
                              title="Duplicate as new custom role"
                              className="text-slate-500 hover:text-slate-800 text-xs p-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {isManagerOrOwner && (!roleItem.isSystem || !isOwnerRole) && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                setRoleToEdit(roleItem)
                                setDuplicateFromRole(null)
                                setIsRoleBuilderOpen(true)
                              }}
                              className="text-xs"
                            >
                              Edit
                            </Button>
                          )}

                          {isOwner && roleItem.isCustom && (
                            <button
                              onClick={() => setRoleToDelete(roleItem)}
                              disabled={roleItem.userCount > 0}
                              title={
                                roleItem.userCount > 0
                                  ? 'Reassign users before deleting this role'
                                  : 'Delete custom role'
                              }
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Registers & Cashier Shifts */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Active Shift Banner for Current User */}
          {activeShift ? (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  Your Active Shift is In Progress
                </div>
                <h3 className="text-xl font-semibold">
                  {activeShift.register?.name || 'Assigned Register'} ({activeShift.register?.code || 'REG'})
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Started at{' '}
                    {new Date(activeShift.openedAt).toLocaleTimeString(undefined, {
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5" />
                    Opening Float: {currency}{' '}
                    {activeShift.openingFloat.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  variant="secondary"
                  className="bg-white text-emerald-950 hover:bg-emerald-50 font-medium px-6 py-2.5 shadow-md flex items-center gap-2"
                  onClick={() => setShiftToClose({ id: activeShift.id, isOverride: false })}
                >
                  <RotateCcw className="w-4 h-4 text-emerald-700" />
                  End Shift & Reconcile Till
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-slate-900">No Shift Currently Open</h4>
                <p className="text-xs text-slate-500">
                  You do not have an active register shift. Start a shift with your opening float before processing sales.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="flex items-center gap-2 shrink-0"
              >
                <Banknote className="w-4 h-4" />
                Start Cashier Shift
              </Button>
            </div>
          )}

          {/* Registers Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Checkout Registers</h3>
                <p className="text-xs text-slate-500">
                  Physical and virtual checkout terminals configured in {activeBusiness?.name}.
                </p>
              </div>
              {isManagerOrOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingRegister(null)
                    setIsRegisterModalOpen(true)
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Register
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {registerList.map((reg) => (
                <div
                  key={reg.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{reg.name}</h4>
                      <span className="text-xs font-mono font-semibold text-emerald-700">
                        {reg.code}
                      </span>
                    </div>
                    {reg.activeShift ? (
                      <Badge variant="warning" dot>
                        In Use
                      </Badge>
                    ) : reg.isActive ? (
                      <Badge variant="success" dot>
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </div>

                  {reg.description && (
                    <p className="text-xs text-slate-500">{reg.description}</p>
                  )}

                  {reg.activeShift && (
                    <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="text-slate-500">Active Cashier:</div>
                      <div className="font-semibold text-slate-900">
                        {reg.activeShift.cashier.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Opened at {new Date(reg.activeShift.openedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  )}

                  {isManagerOrOwner && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setEditingRegister(reg)
                          setIsRegisterModalOpen(true)
                        }}
                        className="text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Edit Details
                      </button>

                      {reg.activeShift && isManagerOrOwner && reg.activeShift.cashierId !== user?.id && (
                        <button
                          onClick={() =>
                            setShiftToClose({
                              id: reg.activeShift!.id,
                              isOverride: true,
                            })
                          }
                          className="text-amber-700 hover:text-amber-900 font-semibold text-[11px]"
                        >
                          Manager Override Close
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shift History Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Recent Cashier Shifts</h3>
                <p className="text-xs text-slate-500">
                  Historical record of drawer opening floats, reconciliations, and cash variances.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchShiftsAndRegisters}
                isLoading={loadingShifts}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>

            {loadingShifts ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : shiftList.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Clock className="w-8 h-8 text-slate-400" />}
                  title="No shift history yet"
                  description="Open a shift on a register to start tracking cashier drawer balances."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Cashier</th>
                      <th className="px-6 py-3.5 font-semibold">Register</th>
                      <th className="px-6 py-3.5 font-semibold">Time Interval</th>
                      <th className="px-6 py-3.5 font-semibold">Opening Float</th>
                      <th className="px-6 py-3.5 font-semibold">Expected Cash</th>
                      <th className="px-6 py-3.5 font-semibold">Actual Counted</th>
                      <th className="px-6 py-3.5 font-semibold">Variance</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shiftList.map((shift) => {
                      const isClosed = shift.status === 'CLOSED'
                      const variance = shift.cashVariance ?? 0

                      return (
                        <tr key={shift.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{shift.cashier.name}</div>
                            <span className="text-xs text-slate-400">{shift.cashier.email}</span>
                          </td>

                          <td className="px-6 py-4 font-mono text-xs text-slate-700">
                            {shift.register.name} ({shift.register.code})
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-500">
                            <div>
                              Opened:{' '}
                              {new Date(shift.openedAt).toLocaleTimeString(undefined, {
                                timeStyle: 'short',
                              })}
                            </div>
                            {shift.closedAt && (
                              <div>
                                Closed:{' '}
                                {new Date(shift.closedAt).toLocaleTimeString(undefined, {
                                  timeStyle: 'short',
                                })}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
                            {currency}{' '}
                            {shift.openingFloat.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>

                          <td className="px-6 py-4 font-mono text-xs font-semibold text-blue-700">
                            {shift.expectedCash != null
                              ? `${currency} ${shift.expectedCash.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}`
                              : '—'}
                          </td>

                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-900">
                            {shift.actualCash != null
                              ? `${currency} ${shift.actualCash.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}`
                              : '—'}
                          </td>

                          <td className="px-6 py-4">
                            {isClosed ? (
                              variance === 0 ? (
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                  Balanced
                                </span>
                              ) : variance > 0 ? (
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  +{currency}{' '}
                                  {variance.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                  {currency}{' '}
                                  {variance.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">In Progress</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Badge variant={isClosed ? 'neutral' : 'warning'}>
                              {shift.status}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Audit Log */}
      {activeTab === 'audit' && isManagerOrOwner && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3 text-xs">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-400 mb-0.5">
                Append-Only Security Audit Trail
              </p>
              <p className="text-slate-300">
                Every sensitive administrative event (staff invitations, role adjustments, suspensions, register creation, shift overrides)
                is recorded with user identity, client metadata, and timestamp. Audit logs cannot be altered or deleted.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search action or actor..."
                    className="h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-56"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                </div>

                <select
                  className="h-9 px-3 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                >
                  <option value="ALL">All Actions</option>
                  <option value="STAFF_INVITED">STAFF_INVITED</option>
                  <option value="ROLE_CHANGED">ROLE_CHANGED</option>
                  <option value="STAFF_SUSPENDED">STAFF_SUSPENDED</option>
                  <option value="STAFF_REACTIVATED">STAFF_REACTIVATED</option>
                  <option value="STAFF_REMOVED">STAFF_REMOVED</option>
                  <option value="INVITATION_REVOKED">INVITATION_REVOKED</option>
                  <option value="INVITATION_ACCEPTED">INVITATION_ACCEPTED</option>
                  <option value="SHIFT_OPENED">SHIFT_OPENED</option>
                  <option value="SHIFT_CLOSED">SHIFT_CLOSED</option>
                  <option value="SHIFT_OVERRIDDEN">SHIFT_OVERRIDDEN</option>
                  <option value="REGISTER_CREATED">REGISTER_CREATED</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchAuditLogs}
                isLoading={loadingAudit}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>

            {loadingAudit ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Activity className="w-8 h-8 text-slate-400" />}
                  title="No audit entries matched"
                  description="Administrative mutations and shift actions will appear in this log."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                      <th className="px-6 py-3.5 font-semibold">Action</th>
                      <th className="px-6 py-3.5 font-semibold">Actor</th>
                      <th className="px-6 py-3.5 font-semibold">Resource</th>
                      <th className="px-6 py-3.5 font-semibold">Summary Context</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {new Date(entry.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {entry.action}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-slate-900">
                            {entry.actor?.name || 'System'}
                          </div>
                          <span className="text-slate-400">{entry.actor?.email}</span>
                        </td>

                        <td className="px-6 py-4 text-xs font-medium text-slate-700">
                          {entry.resourceType}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                          {JSON.stringify(entry.metadata)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedAuditEntry(entry)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        roles={roles}
        currentRole={userRole}
        onInvite={handleInviteStaff}
        onSuccessDone={() => {
          setIsInviteModalOpen(false)
          setActiveTab('invitations')
        }}
      />

      <ChangeRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false)
          setSelectedMember(null)
        }}
        member={selectedMember}
        roles={roles}
        onUpdateRole={handleUpdateRole}
      />

      {businessId && (
        <RoleBuilderModal
          isOpen={isRoleBuilderOpen}
          onClose={() => {
            setIsRoleBuilderOpen(false)
            setRoleToEdit(null)
            setDuplicateFromRole(null)
          }}
          businessId={businessId}
          roleToEdit={roleToEdit}
          duplicateFrom={duplicateFromRole}
          onRoleSaved={() => {
            fetchRoles()
            showToast(
              roleToEdit
                ? 'Role permissions updated successfully'
                : 'Custom role created successfully',
              'success'
            )
          }}
        />
      )}

      <RoleDetailModal
        isOpen={Boolean(roleDetailToView)}
        onClose={() => setRoleDetailToView(null)}
        role={roleDetailToView}
        onEdit={
          isManagerOrOwner &&
          roleDetailToView &&
          (!roleDetailToView.isSystem || roleDetailToView.name !== 'OWNER')
            ? () => {
                const r = roleDetailToView
                setRoleDetailToView(null)
                setRoleToEdit(r)
                setDuplicateFromRole(null)
                setIsRoleBuilderOpen(true)
              }
            : undefined
        }
        onDuplicate={
          isManagerOrOwner && roleDetailToView
            ? () => {
                const r = roleDetailToView
                setRoleDetailToView(null)
                setRoleToEdit(null)
                setDuplicateFromRole(r)
                setIsRoleBuilderOpen(true)
              }
            : undefined
        }
      />

      {roleToDelete && (
        <ConfirmationDialog
          isOpen={true}
          title="Delete Custom Role?"
          message={`Are you sure you want to delete the custom role "${roleToDelete.displayName}"? This action cannot be undone.`}
          confirmText="Delete Role"
          variant="danger"
          onConfirm={handleDeleteRole}
          onCancel={() => setRoleToDelete(null)}
        />
      )}

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false)
          setEditingRegister(null)
        }}
        register={editingRegister}
        onSave={handleSaveRegister}
      />

      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        registers={registers}
        currency={currency}
        onOpenShift={handleOpenShift}
      />

      {shiftToClose && businessId && (
        <CloseShiftModal
          isOpen={true}
          onClose={() => setShiftToClose(null)}
          businessId={businessId}
          shiftId={shiftToClose.id}
          currency={currency}
          isManagerOverride={shiftToClose.isOverride}
          onCloseShift={handleCloseShift}
        />
      )}

      <AuditDetailModal
        isOpen={!!selectedAuditEntry}
        onClose={() => setSelectedAuditEntry(null)}
        entry={selectedAuditEntry}
      />

      {/* Confirmation: Suspend / Reactivate */}
      {memberToToggle && (
        <ConfirmationDialog
          isOpen={true}
          title={memberToToggle.isActive ? 'Suspend Staff Member?' : 'Reactivate Staff Member?'}
          message={
            memberToToggle.isActive
              ? `Are you sure you want to suspend ${memberToToggle.user.name}? They will immediately be blocked from accessing this business.`
              : `Are you sure you want to restore access for ${memberToToggle.user.name}?`
          }
          confirmText={memberToToggle.isActive ? 'Suspend Member' : 'Reactivate Member'}
          variant={memberToToggle.isActive ? 'danger' : 'primary'}
          onConfirm={handleToggleMemberStatus}
          onCancel={() => setMemberToToggle(null)}
        />
      )}

      {/* Confirmation: Remove Member */}
      {memberToRemove && (
        <ConfirmationDialog
          isOpen={true}
          title="Remove Member from Business?"
          message={`Are you sure you want to permanently remove ${memberToRemove.user.name} (${memberToRemove.user.email}) from ${activeBusiness?.name}? Their global user account and history remain preserved, but they will lose all permissions in this shop.`}
          confirmText="Remove Member"
          variant="danger"
          onConfirm={handleRemoveMember}
          onCancel={() => setMemberToRemove(null)}
        />
      )}

      {/* Confirmation: Revoke Invitation */}
      {invitationToRevoke && (
        <ConfirmationDialog
          isOpen={true}
          title="Revoke Invitation?"
          message={`Are you sure you want to revoke the pending invitation for ${
            invitationToRevoke.email || invitationToRevoke.phone
          }? The invitation link will immediately become invalid.`}
          confirmText="Revoke Invitation"
          variant="danger"
          onConfirm={handleRevokeInvitation}
          onCancel={() => setInvitationToRevoke(null)}
        />
      )}
    </div>
  )
}
