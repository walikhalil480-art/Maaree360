import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, ApiError } from '../api/client'

export interface PlatformAdminInfo {
  id: string
  role: string
  isActive: boolean
  mfaEnabled: boolean
}

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  platformAdmin?: PlatformAdminInfo | null
}

export interface Business {
  id: string
  name: string
  slug: string
  currency: string
  timezone: string
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'STOCK_CLERK' | string
  permissions?: string[]
}

interface AuthContextType {
  user: User | null
  businesses: Business[]
  activeBusiness: Business | null
  loading: boolean
  error: string | null
  permissions: string[]
  isPlatformAdmin: boolean
  platformRole?: string
  hasPermission: (permissionKey: string) => boolean
  hasAnyPermission: (permissionKeys: string[]) => boolean
  hasAllPermissions: (permissionKeys: string[]) => boolean
  refreshPermissions: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  createBusiness: (name: string, currency?: string, timezone?: string) => Promise<Business>
  switchBusiness: (businessId: string) => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  // Initialize session and businesses
  const initAuth = async () => {
    try {
      setLoading(true)
      // Check auth status
      const authData = await apiFetch<{ success: boolean; user: User }>('/api/v1/auth/me')
      if (authData.success && authData.user) {
        setUser(authData.user)
        // Fetch businesses user belongs to
        const bizData = await apiFetch<{ success: boolean; businesses: Business[] }>('/api/v1/businesses')
        if (bizData.success && bizData.businesses) {
          setBusinesses(bizData.businesses)
          if (bizData.businesses.length > 0) {
            const savedId = localStorage.getItem('smartstock_active_business_id')
            const matched = bizData.businesses.find((b) => b.id === savedId)
            const selected = matched || bizData.businesses[0]
            setActiveBusiness(selected)
            localStorage.setItem('smartstock_active_business_id', selected.id)
          }
        }
      }
    } catch {
      setUser(null)
      setBusinesses([])
      setActiveBusiness(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const data = await apiFetch<{ success: boolean; user: User }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(data.user)
      // Fetch associated businesses
      const bizData = await apiFetch<{ success: boolean; businesses: Business[] }>('/api/v1/businesses')
      setBusinesses(bizData.businesses || [])
      if (bizData.businesses && bizData.businesses.length > 0) {
        const savedId = localStorage.getItem('smartstock_active_business_id')
        const matched = bizData.businesses.find((b) => b.id === savedId)
        const selected = matched || bizData.businesses[0]
        setActiveBusiness(selected)
        localStorage.setItem('smartstock_active_business_id', selected.id)
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please check your credentials.'
      setError(msg)
      throw err
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setError(null)
    try {
      await apiFetch<{ success: boolean; user: User }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      })
      // Automatically log in user after successful registration
      await login(email, password)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed. Please check the form.'
      setError(msg)
      throw err
    }
  }

  const logout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('smartstock_active_business_id')
      setUser(null)
      setBusinesses([])
      setActiveBusiness(null)
      window.dispatchEvent(new CustomEvent('smartstock:logout'))
    }
  }

  const createBusiness = async (name: string, currency = 'KES', timezone = 'Africa/Nairobi'): Promise<Business> => {
    setError(null)
    try {
      const data = await apiFetch<{ success: boolean; business: Business }>('/api/v1/businesses', {
        method: 'POST',
        body: JSON.stringify({ name, currency, timezone }),
      })
      const newBiz = data.business
      setBusinesses((prev) => [...prev, newBiz])
      setActiveBusiness(newBiz)
      localStorage.setItem('smartstock_active_business_id', newBiz.id)
      return newBiz
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not create business.'
      setError(msg)
      throw err
    }
  }

  const switchBusiness = async (businessId: string) => {
    try {
      // Re-verify membership with backend and fetch fresh permissions
      const res = await apiFetch<{ success: boolean; business: Business }>(`/api/v1/businesses/${businessId}`)
      if (res && res.success && res.business) {
        setActiveBusiness(res.business)
        localStorage.setItem('smartstock_active_business_id', res.business.id)
        window.dispatchEvent(
          new CustomEvent('smartstock:business-switched', { detail: { businessId: res.business.id } })
        )
        return
      }
    } catch {
      // Fallback to local businesses list if offline or fast switch
      const target = businesses.find((b) => b.id === businessId)
      if (target) {
        setActiveBusiness(target)
        localStorage.setItem('smartstock_active_business_id', target.id)
        window.dispatchEvent(
          new CustomEvent('smartstock:business-switched', { detail: { businessId: target.id } })
        )
      }
    }
  }

  const permissions = activeBusiness?.permissions || []

  const hasPermission = (permissionKey: string): boolean => {
    if (!activeBusiness) return false
    if (activeBusiness.role === 'OWNER') return true
    if (permissions.includes('*')) return true
    return permissions.includes(permissionKey)
  }

  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    if (!activeBusiness) return false
    if (activeBusiness.role === 'OWNER') return true
    if (permissions.includes('*')) return true
    return permissionKeys.some((k) => permissions.includes(k))
  }

  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    if (!activeBusiness) return false
    if (activeBusiness.role === 'OWNER') return true
    if (permissions.includes('*')) return true
    return permissionKeys.every((k) => permissions.includes(k))
  }

  const refreshPermissions = async () => {
    if (!activeBusiness) return
    try {
      const res = await apiFetch<{ success: boolean; permissions: string[] }>(
        `/api/v1/businesses/${activeBusiness.id}/roles/my-permissions`
      )
      if (res.success && res.permissions) {
        const updatedPerms = res.permissions
        setActiveBusiness((prev) => (prev ? { ...prev, permissions: updatedPerms } : null))
        setBusinesses((prev) =>
          prev.map((b) => (b.id === activeBusiness.id ? { ...b, permissions: updatedPerms } : b))
        )
      }
    } catch {
      // Ignore background refresh errors
    }
  }

  const VALID_PLATFORM_ROLES = [
    'PLATFORM_OWNER',
    'SUPER_ADMIN',
    'TECHNICAL_ADMIN',
    'SUPPORT_ADMIN',
    'BILLING_ADMIN',
    'SECURITY_AUDITOR',
  ]
  const isPlatformAdmin = Boolean(
    user?.platformAdmin &&
    user.platformAdmin.isActive &&
    VALID_PLATFORM_ROLES.includes(user.platformAdmin.role)
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        businesses,
        activeBusiness,
        loading,
        error,
        permissions,
        isPlatformAdmin,
        platformRole: user?.platformAdmin?.role,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions,
        login,
        register,
        logout,
        createBusiness,
        switchBusiness,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
