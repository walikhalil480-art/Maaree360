export type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STOCK_CLERK'

export interface StaffUser {
  id: string
  name: string
  email: string
  createdAt?: string
}

export interface StaffMember {
  id: string
  userId: string
  businessId: string
  role: StaffRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  user: StaffUser
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

export interface StaffInvitation {
  id: string
  businessId: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  role: StaffRole
  status: InvitationStatus
  emailDeliveryStatus?: 'PENDING' | 'SENT' | 'FAILED'
  emailDeliveryError?: string | null
  invitedById: string
  invitedBy: StaffUser
  acceptedById?: string | null
  acceptedBy?: StaffUser | null
  expiresAt: string
  acceptedAt: string | null
  resentAt?: string | null
  revokedAt?: string | null
  createdAt: string
  invitationUrl?: string
  token?: string
}

export interface InviteStaffInput {
  name?: string
  email?: string
  phone?: string
  role: StaffRole
  message?: string
}

export interface UpdateMemberRoleInput {
  role: StaffRole
}

