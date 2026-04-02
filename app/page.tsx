export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Survey Management System</h1>
        <p className="text-gray-600 mb-8">Local SQLite database for managing survey projects and responses</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="border rounded-lg p-6 hover:shadow-lg transition col-span-2">
            <h2 className="text-xl font-semibold mb-2">📊 Analytics & Tracking</h2>
            <div className="flex justify-between items-center text-sm">
              <ul className="space-y-2">
                <li><a href="/api/health" className="text-blue-600 hover:underline">/api/health</a> - Health check</li>
                <li><a href="/admin/dashboard" className="text-blue-600 hover:underline font-bold">Admin Dashboard</a> - Analytics Overview</li>
              </ul>
              <ul className="space-y-2 text-right">
                <li><a href="/admin/responses" className="text-blue-600 hover:underline">Responses Log</a></li>
                <li><a href="/admin/projects" className="text-blue-600 hover:underline">Project Management</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Quick Stats</h3>
          <p className="text-sm text-gray-600">Check <a href="/api/health" className="text-blue-600 hover:underline">health endpoint</a> for database statistics</p>
          <div className="mt-4">
            <a href="/login" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold">
              Admin Login →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
