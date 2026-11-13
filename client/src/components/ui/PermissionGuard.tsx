import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Button } from './Button'

export interface PermissionGuardProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()

  let isAllowed = false

  if (permission) {
    isAllowed = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    isAllowed = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  } else {
    isAllowed = true
  }

  if (!isAllowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export interface AccessDeniedStateProps {
  moduleName?: string
  requiredPermission?: string
  title?: string
  description?: string
}

export const AccessDeniedState: React.FC<AccessDeniedStateProps> = ({
  moduleName = 'This Section',
  requiredPermission,
  title = 'Access Restricted',
  description,
}) => {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-5 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          {description ||
            `Your current role does not have authorization to access ${moduleName}. Contact your organization owner or administrator if you require access.`}
        </p>

        {requiredPermission && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs font-mono text-slate-700 mb-6">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Required: {requiredPermission}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
