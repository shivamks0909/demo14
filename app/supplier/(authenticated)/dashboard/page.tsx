'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MousePointerClick, CheckCircle2, XCircle, TrendingUp, AlertTriangle, ShieldAlert, Copy, BarChart3, Target } from 'lucide-react'

interface KPIs {
  totalClicks: number
  totalCompletes: number
  totalTerminates: number
  totalQuotaFull: number
  totalSecurityTerminate: number
  totalDuplicateIp: number
  totalDuplicateString: number
  conversionRate: number
  activeProjects: number
  quotaUsed: number
  quotaAllocated: number
}

interface RecentResponse {
  id: string
  project_code: string
  project_name: string
  uid: string
  oi_session: string
  status: string
  created_at: string
}

export default function SupplierDashboardPage() {
  const router = useRouter()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/supplier/dashboard')
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/supplier/login')
            return
          }
          throw new Error('Failed to fetch dashboard data')
        }
        const data = await res.json()
        setKpis(data.kpis)
        setRecentResponses(data.recentResponses || [])
      } catch (error) {
        console.error('Dashboard fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-emerald-100 text-emerald-700'
      case 'terminate': return 'bg-red-100 text-red-700'
      case 'quota_full': return 'bg-amber-100 text-amber-700'
      case 'security_terminate': return 'bg-purple-100 text-purple-700'
      case 'duplicate_ip': return 'bg-orange-100 text-orange-700'
      case 'duplicate_string': return 'bg-pink-100 text-pink-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your survey performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Clicks"
          value={kpis?.totalClicks || 0}
          icon={MousePointerClick}
          color="blue"
        />
        <KPICard
          title="Completes"
          value={kpis?.totalCompletes || 0}
          icon={CheckCircle2}
          color="emerald"
        />
        <KPICard
          title="Terminates"
          value={kpis?.totalTerminates || 0}
          icon={XCircle}
          color="red"
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis?.conversionRate || 0}%`}
          icon={TrendingUp}
          color="violet"
        />
        <KPICard
          title="Active Projects"
          value={kpis?.activeProjects || 0}
          icon={BarChart3}
          color="cyan"
        />
        <KPICard
          title="Quota Used"
          value={`${kpis?.quotaUsed || 0} / ${kpis?.quotaAllocated || 0}`}
          icon={Target}
          color="amber"
        />
        <KPICard
          title="Duplicates"
          value={(kpis?.totalDuplicateIp || 0) + (kpis?.totalDuplicateString || 0)}
          icon={Copy}
          color="orange"
        />
        <KPICard
          title="Security Terminates"
          value={kpis?.totalSecurityTerminate || 0}
          icon={ShieldAlert}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentResponses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No responses yet
                  </td>
                </tr>
              ) : (
                recentResponses.map((response) => (
                  <tr key={response.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{response.project_name}</div>
                      <div className="text-xs text-gray-500">{response.project_code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{response.uid || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(response.status)}`}>
                        {formatStatus(response.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(response.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    violet: 'from-violet-500 to-violet-600',
    cyan: 'from-cyan-500 to-cyan-600',
    amber: 'from-amber-500 to-amber-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
