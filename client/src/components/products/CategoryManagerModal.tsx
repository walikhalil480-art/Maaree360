import React, { useState } from 'react'
import type { Category } from '../../types/product'
import { apiFetch, ApiError } from '../../api/client'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ConfirmationDialog } from '../ui/ConfirmationDialog'
import { X, Plus, Edit2, Trash2, Folder, AlertTriangle, Layers } from 'lucide-react'

interface CategoryManagerModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  businessId: string
  onCategoriesUpdated: () => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  businessId,
  onCategoriesUpdated,
  showToast,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Safe delete dialog state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deleteWarningCategory, setDeleteWarningCategory] = useState<Category | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  if (!isOpen) return null

  const handleStartCreate = () => {
    setEditingCategory(null)
    setName('')
    setDescription('')
    setError(null)
    setIsCreating(true)
  }

  const handleStartEdit = (cat: Category) => {
    setIsCreating(false)
    setEditingCategory(cat)
    setName(cat.name)
    setDescription(cat.description || '')
    setError(null)
  }

  const handleCancelForm = () => {
    setIsCreating(false)
    setEditingCategory(null)
    setName('')
    setDescription('')
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Category name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (editingCategory) {
        await apiFetch(`/api/v1/businesses/${businessId}/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        })
        showToast(`Category '${name.trim()}' updated successfully`, 'success')
      } else {
        await apiFetch(`/api/v1/businesses/${businessId}/categories`, {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        })
        showToast(`Category '${name.trim()}' created successfully`, 'success')
      }
      handleCancelForm()
      onCategoriesUpdated()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to save category. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (cat: Category) => {
    const count = cat.productsCount ?? cat._count?.products ?? 0
    if (count > 0) {
      setDeleteWarningCategory(cat)
    } else {
      setCategoryToDelete(cat)
    }
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return
    setDeleteLoading(true)
    try {
      await apiFetch(`/api/v1/businesses/${businessId}/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      })
      showToast(`Category '${categoryToDelete.name}' deleted`, 'success')
      setCategoryToDelete(null)
      onCategoriesUpdated()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not delete category'
      showToast(msg, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 m-0">Manage Categories</h2>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Organize your products into structured merchandise groups
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Top Action to Add Category */}
              {!isCreating && !editingCategory && (
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleStartCreate}>
                    <Plus className="w-4 h-4 mr-1.5" /> Add Category
                  </Button>
                </div>
              )}

              {/* Create / Edit Form */}
              {(isCreating || editingCategory) && (
                <form
                  onSubmit={handleSave}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {isCreating ? 'New Category' : `Edit Category: ${editingCategory?.name}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  {error && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Input
                    label="Category Name *"
                    placeholder="e.g. Beverages, Bakery, Electronics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Category scope or notes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelForm}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={loading}>
                      {isCreating ? 'Create Category' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Categories List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Existing Categories ({categories.length})
                </div>

                {categories.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                    No categories registered yet. Click &quot;Add Category&quot; to create one.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {categories.map((cat) => {
                      const count = cat.productsCount ?? cat._count?.products ?? 0
                      return (
                        <div
                          key={cat.id}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">
                                {cat.name}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                <Layers className="w-3 h-3 text-slate-400" />
                                {count} {count === 1 ? 'product' : 'products'}
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-xs text-slate-500 m-0 line-clamp-1">
                                {cat.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cat)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(cat)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 px-6 flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Safe Confirmation Dialog for Empty Category */}
      <ConfirmationDialog
        isOpen={Boolean(categoryToDelete)}
        title="Delete Category"
        message={`Are you sure you want to delete '${categoryToDelete?.name}'? This action cannot be undone.`}
        confirmText="Delete Category"
        variant="danger"
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />

      {/* Warning Dialog when Category has products */}
      {deleteWarningCategory && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeleteWarningCategory(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100 text-amber-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 m-0">
                    Cannot Delete Category
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed m-0">
                    Category <strong>&quot;{deleteWarningCategory.name}&quot;</strong> currently has{' '}
                    <strong>
                      {deleteWarningCategory.productsCount ??
                        deleteWarningCategory._count?.products ??
                        0}{' '}
                      product(s)
                    </strong>{' '}
                    assigned to it.
                  </p>
                  <p className="mt-2 text-xs text-slate-500 m-0">
                    To maintain catalog integrity, please reassign or remove these products before
                    deleting this category.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setDeleteWarningCategory(null)}
                >
                  Understood
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
