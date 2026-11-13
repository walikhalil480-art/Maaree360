import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { apiFetch, ApiError } from '../../api/client'
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../types/customer'
import { User, Phone, Mail, MapPin, FileText } from 'lucide-react'

interface CustomerFormModalProps {
  isOpen: boolean
  onClose: () => void
  customer?: Customer | null
  businessId: string
  onSaved: (customer: Customer) => void
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  businessId,
  onSaved,
}) => {
  const isEditing = Boolean(customer)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [taxPin, setTaxPin] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setEmail(customer.email || '')
      setAddress(customer.address || '')
      setTaxPin(customer.taxPin || '')
      setNotes(customer.notes || '')
      setIsActive(customer.isActive ?? true)
    } else {
      setName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setTaxPin('')
      setNotes('')
      setIsActive(true)
    }
    setError(null)
  }, [customer, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Customer name is required.')
      return
    }

    setLoading(true)

    try {
      if (isEditing && customer) {
        const payload: UpdateCustomerInput = {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          taxPin: taxPin.trim() || undefined,
          notes: notes.trim() || undefined,
          isActive,
        }

        const res = await apiFetch<{ success: boolean; customer: Customer }>(
          `/api/v1/businesses/${businessId}/customers/${customer.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        )

        onSaved(res.customer)
        onClose()
      } else {
        const payload: CreateCustomerInput = {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          taxPin: taxPin.trim() || undefined,
          notes: notes.trim() || undefined,
        }

        const res = await apiFetch<{ success: boolean; customer: Customer }>(
          `/api/v1/businesses/${businessId}/customers`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        )

        onSaved(res.customer)
        onClose()
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to save customer. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Customer' : 'Add New Customer'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kamau Mwangi or Safaricom PLC"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +254 712 345 678"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. kamau@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              KRA Tax PIN
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={taxPin}
                onChange={(e) => setTaxPin(e.target.value.toUpperCase())}
                placeholder="e.g. A001234567X"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Physical Location / Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Biashara St, Nairobi"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes / Account Terms
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Wholesale buyer, prefers M-Pesa receipts"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {isEditing && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-slate-700 select-none">
              Active Customer Account
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
