import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { validateSupplierSession } from '@/lib/supplier-auth'
import { getDb } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, FolderKanban, FileText, LogOut } from 'lucide-react'

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('supplier_session')?.value

  if (!token) {
    redirect('/supplier/login')
  }

  const { valid, supplierId } = await validateSupplierSession(token)

  if (!valid || !supplierId) {
    redirect('/supplier/login')
  }

  const db = getDb()
  const supplier = db.prepare(`
    SELECT id, name, login_email, status
    FROM suppliers
    WHERE id = ?
  `).get(supplierId) as any

  if (!supplier || supplier.status !== 'active') {
    redirect('/supplier/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image src="/opinion-insights-logo.png" alt="Opinion Insights" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className="font-bold text-gray-900">Supplier Portal</h1>
              <p className="text-xs text-gray-500">Opinion insights</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/supplier/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            href="/supplier/projects"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            <FolderKanban className="w-5 h-5" />
            Projects
          </Link>
          <Link
            href="/supplier/reports"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Reports
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-3 mb-2">
            <p className="text-sm font-medium text-gray-900">{supplier.name}</p>
            <p className="text-xs text-gray-500 truncate">{supplier.login_email}</p>
          </div>
          <form action="/api/supplier/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  )
}
