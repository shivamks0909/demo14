// Server component wrapper - forces dynamic rendering
export const dynamic = 'force-dynamic'

import LoginForm from './login-form'

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Admin Login
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter your credentials to access the dashboard
                </p>
            </div>

            <LoginForm />
        </div>
    )
}