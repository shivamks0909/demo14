'use client'

import { useState } from 'react'
import { Plus, Key, Link as LinkIcon, Trash2, Edit2, Check, X } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  login_email: string
  status: 'active' | 'paused'
  last_login?: string
  created_at: string
}

interface Project {
  id: string
  project_code: string
  project_name: string
}

interface SupplierManagerProps {
  suppliers: Supplier[]
  projects: Project[]
}

export default function SupplierManager({ suppliers: init, projects }: SupplierManagerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(init)
  const [showCreate, setShowCreate] = useState(false)
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', login_email: '', password: '' })
  const [assignForm, setAssignForm] = useState({ project_id: '', quota_allocated: 100 })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleCreate = async () => {
    if (!formData.name || !formData.login_email || !formData.password) {
      setMessage({ type: 'error', text: 'All fields are required' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Failed to create supplier')

      const data = await res.json()
      setSuppliers([...suppliers, data.supplier])
      setShowCreate(false)
      setFormData({ name: '', login_email: '', password: '' })
      setMessage({ type: 'success', text: `Supplier created. Password: ${data.password}` })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create supplier' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      await fetch(`/api/admin/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      setSuppliers(suppliers.map(s => s.id === id ? { ...s, status: newStatus } : s))
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update status' })
    }
  }

  const handleAssign = async (supplierId: string) => {
    if (!assignForm.project_id) return

    setLoading(true)
    try {
      await fetch('/api/admin/supplier-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          project_id: assignForm.project_id,
          quota_allocated: assignForm.quota_allocated
        })
      })
      setShowAssign(null)
      setAssignForm({ project_id: '', quota_allocated: 100 })
      setMessage({ type: 'success', text: 'Project assigned to supplier' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to assign project' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (id: string) => {
    const newPassword = Math.random().toString(36).substring(2, 10)
    try {
      await fetch(`/api/admin/suppliers/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      setMessage({ type: 'success', text: `Password reset to: ${newPassword}` })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset password' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Supplier Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage supplier accounts and project assignments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Supplier</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Supplier name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
              <input
                type="email"
                value={formData.login_email}
                onChange={(e) => setFormData({ ...formData, login_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="supplier@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Secure password"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setFormData({ name: '', login_email: '', password: '' }) }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Login Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                  <div className="text-xs text-gray-500">Created {new Date(supplier.created_at).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{supplier.login_email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                    supplier.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {supplier.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {supplier.last_login ? new Date(supplier.last_login).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(supplier.id, supplier.status)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        supplier.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={supplier.status === 'active' ? 'Pause' : 'Activate'}
                    >
                      {supplier.status === 'active' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleResetPassword(supplier.id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowAssign(supplier.id)}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Assign Project"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign Project Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={assignForm.project_id}
                  onChange={(e) => setAssignForm({ ...assignForm, project_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_name} ({p.project_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quota Allocation</label>
                <input
                  type="number"
                  value={assignForm.quota_allocated}
                  onChange={(e) => setAssignForm({ ...assignForm, quota_allocated: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 for unlimited</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => handleAssign(showAssign)}
                disabled={loading || !assignForm.project_id}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <LinkIcon className="w-4 h-4" />
                Assign
              </button>
              <button
                onClick={() => { setShowAssign(null); setAssignForm({ project_id: '', quota_allocated: 100 }) }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
