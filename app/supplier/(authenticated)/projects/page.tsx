'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Project {
  link_id: string
  project_id: string
  project_code: string
  project_name: string
  country: string
  link_status: string
  project_status: string
  quota_allocated: number
  quota_used: number
  total_clicks: number
  total_completes: number
  conversion_rate: number
}

export default function SupplierProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/supplier/projects')
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/supplier/login')
            return
          }
          throw new Error('Failed to fetch projects')
        }
        const data = await res.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Projects fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [router])

  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true
    if (filter === 'active') return p.link_status === 'active' && p.project_status === 'active'
    if (filter === 'paused') return p.link_status === 'paused' || p.project_status === 'paused'
    return true
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Your assigned survey projects</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        >
          <option value="all">All Projects</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Quota</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Completes</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No projects found
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => {
                  const quotaPercent = project.quota_allocated > 0
                    ? Math.min((project.quota_used / project.quota_allocated) * 100, 100)
                    : 0
                  const isActive = project.link_status === 'active' && project.project_status === 'active'

                  return (
                    <tr key={project.link_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{project.project_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{project.project_code}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{project.country}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${quotaPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 min-w-[60px]">
                            {project.quota_used}/{project.quota_allocated || '∞'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{project.total_clicks}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{project.total_completes}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{project.conversion_rate}%</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
