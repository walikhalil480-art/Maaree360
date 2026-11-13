import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { apiFetch, ApiError } from '../../api/client'
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from '../../types/supplier'

interface SupplierFormModalProps {
  isOpen: boolean
  onClose: () => void
  supplier?: Supplier | null
  businessId: string
  onSaved: (supplier: Supplier) => void
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  supplier,
  businessId,
  onSaved,
}) => {
  const isEditing = Boolean(supplier)

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')
  const [taxPin, setTaxPin] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '')
      setContactPerson(supplier.contactPerson || '')
      setPhone(supplier.phone || '')
      setEmail(supplier.email || '')
      setPhysicalAddress(supplier.physicalAddress || '')
      setTaxPin(supplier.taxPin || '')
      setNotes(supplier.notes || '')
    } else {
      setName('')
      setContactPerson('')
      setPhone('')
      setEmail('')
      setPhysicalAddress('')
      setTaxPin('')
      setNotes('')
    }
    setError(null)
  }, [supplier, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Supplier name is required.')
      return
    }

    if (!phone.trim()) {
      setError('Phone number is required.')
      return
    }

    // Phone format basic check
    const cleanPhone = phone.trim()
    if (cleanPhone.length < 9) {
      setError('Please provide a valid phone number (at least 9 digits).')
      return
    }

    setLoading(true)

    try {
      if (isEditing && supplier) {
        const payload: UpdateSupplierInput = {
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: cleanPhone,
          email: email.trim() || undefined,
          physicalAddress: physicalAddress.trim() || undefined,
          taxPin: taxPin.trim() || undefined,
          notes: notes.trim() || undefined,
        }

        const res = await apiFetch<{ success: boolean; supplier: Supplier }>(
          `/api/v1/businesses/${businessId}/suppliers/${supplier.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        )

        onSaved(res.supplier)
        onClose()
      } else {
        const payload: CreateSupplierInput = {
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: cleanPhone,
          email: email.trim() || undefined,
          physicalAddress: physicalAddress.trim() || undefined,
          taxPin: taxPin.trim() || undefined,
          notes: notes.trim() || undefined,
        }

        const res = await apiFetch<{ success: boolean; supplier: Supplier }>(
          `/api/v1/businesses/${businessId}/suppliers`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        )

        onSaved(res.supplier)
        onClose()
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(err?.message || 'Failed to save supplier. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Supplier' : 'Add New Supplier'}
      description={
        isEditing
          ? 'Update supplier contact details and tax information.'
          : 'Register a wholesale distributor, manufacturer, or local vendor.'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supplier Name */}
          <div className="md:col-span-2">
            <Input
              label="Supplier / Business Name *"
              placeholder="e.g., Eldoret Farmers Millers Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Contact Person */}
          <div>
            <Input
              label="Contact Person"
              placeholder="e.g., David Kiprono"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>

          {/* Phone Number */}
          <div>
            <Input
              label="Phone Number *"
              placeholder="e.g., +254 712 345 678 or 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Supports Kenyan (+254 / 07 / 01) and international formats
            </span>
          </div>

          {/* Email Address */}
          <div>
            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="e.g., sales@eldoretmillers.co.ke"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Tax / KRA PIN */}
          <div>
            <Input
              label="KRA PIN / Tax ID (Optional)"
              placeholder="e.g., P051234567Z"
              value={taxPin}
              onChange={(e) => setTaxPin(e.target.value.toUpperCase())}
            />
          </div>

          {/* Physical Address */}
          <div className="md:col-span-2">
            <Input
              label="Physical Address / Depot Location"
              placeholder="e.g., Industrial Area, Off Enterprise Road, Nairobi"
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <Textarea
              label="Notes / Terms (Optional)"
              placeholder="e.g., Net 14 payment terms, delivers on Tuesdays and Fridays"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
