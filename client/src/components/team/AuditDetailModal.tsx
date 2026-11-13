import { type FC } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { AuditLogEntry } from '../../types/audit'
import { User, Calendar, Activity, Globe } from 'lucide-react'

interface AuditDetailModalProps {
  isOpen: boolean
  onClose: () => void
  entry: AuditLogEntry | null
}

export const AuditDetailModal: FC<AuditDetailModalProps> = ({
  isOpen,
  onClose,
  entry,
}) => {
  if (!entry) return null

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('INVITED') || action.includes('CREATED') || action.includes('REACTIVATED')) {
      return 'success'
    }
    if (action.includes('SUSPENDED') || action.includes('REMOVED') || action.includes('REVOKED')) {
      return 'danger'
    }
    if (action.includes('OVERRIDDEN') || action.includes('ROLE_CHANGED')) {
      return 'warning'
    }
    return 'info'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log Entry Details"
      description="Cryptographic append-only trail of this sensitive administrative mutation."
      size="lg"
    >
      <div className="p-6 space-y-5">
        {/* Main Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Action Taken
            </span>
            <div className="mt-1">
              <Badge variant={getActionBadgeVariant(entry.action)}>
                {entry.action.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Timestamp
            </span>
            <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(entry.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'medium',
              })}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Actor
            </span>
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 mt-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {entry.actor?.name || 'System / Unknown'}{' '}
              <span className="text-xs text-slate-500 font-normal">
                ({entry.actor?.email})
              </span>
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Resource
            </span>
            <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              {entry.resourceType}{' '}
              {entry.resourceId && (
                <span className="text-xs text-slate-500 font-mono">
                  ({entry.resourceId.slice(0, 8)}...)
                </span>
              )}
            </span>
          </div>

          {entry.ipAddress && (
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                IP Address
              </span>
              <span className="text-xs font-mono text-slate-700 flex items-center gap-1.5 mt-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                {entry.ipAddress}
              </span>
            </div>
          )}

          {entry.userAgent && (
            <div className="sm:col-span-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                User Agent
              </span>
              <span className="text-xs font-mono text-slate-600 block mt-1 break-all">
                {entry.userAgent}
              </span>
            </div>
          )}
        </div>

        {/* Mutation Metadata JSON */}
        <div>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
            Recorded Metadata & Context
          </span>
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-64 border border-slate-800">
            <pre className="m-0 leading-relaxed">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            This record is strictly append-only. Modification and deletion of audit trails are prohibited by business isolation security policies.
          </p>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
