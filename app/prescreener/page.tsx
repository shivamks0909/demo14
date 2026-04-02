import { getUnifiedDb } from '@/lib/unified-db'
import { redirect } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

export const dynamic = 'force-dynamic'

interface PreScreenerProps {
    searchParams: Promise<{ response_id?: string; session_token?: string }>
}

export default async function PreScreenerPage({ searchParams }: PreScreenerProps) {
    const params = await searchParams
    const response_id = params.response_id
    const session_token = params.session_token

    if (!response_id && !session_token) {
        redirect('/paused')
    }

    const { database: db } = await getUnifiedDb()

    // 1. Fetch response and associated project
    let responseData: any = null
    if (session_token) {
        const { data } = await db.from('responses').select('*').eq('session_token', session_token).maybeSingle()
        responseData = data
    } else {
        const { data } = await db.from('responses').select('*').eq('id', response_id!).maybeSingle()
        responseData = data
    }

    if (!responseData) redirect('/paused')

    // Fetch project separately (SQLite local cannot do joins)
    const { data: project } = await db.from('projects').select('*').eq('id', responseData.project_id).maybeSingle()

    if (!project) redirect('/paused')

    // 2. If external pre-screener URL exists, redirect
    if (project.prescreener_url) {
        let externalUrl = project.prescreener_url
        if (response_id) externalUrl = externalUrl.replace('[response_id]', response_id)
        if (session_token) externalUrl = externalUrl.replace('[session_token]', session_token)
        redirect(externalUrl)
    }

    // 3. Internal Pre-Screener Action
    async function handleQualification(formData: FormData) {
        'use server'
        const age = parseInt(formData.get('age') as string)
        const country = formData.get('country') as string
        const res_id = formData.get('response_id') as string
        const token = formData.get('session_token') as string

        const { database: db2 } = await getUnifiedDb()

        const isQualified = age >= 18 && (project.country === 'Global' || project.country === country)

        if (isQualified) {
            let finalUrl = project.base_url
            const userToken = responseData.supplier_token || responseData.uid || ''
            if (userToken) {
                finalUrl = finalUrl.replace('[UID]', encodeURIComponent(userToken))
                finalUrl = finalUrl.replace('[identifier]', encodeURIComponent(userToken))
            }
            const finalUrlObj = new URL(finalUrl)
            finalUrlObj.searchParams.set('pid', project.project_code)
            if (token) finalUrlObj.searchParams.set('session_token', token)
            redirect(finalUrlObj.toString())
        } else {
            if (token) {
                await db2.from('responses').update({ status: 'terminate' }).eq('session_token', token)
            } else {
                await db2.from('responses').update({ status: 'terminate' }).eq('id', res_id)
            }
            const terminateUrl = `/terminate?pid=${project.project_code}&uid=${responseData.uid}`
            redirect(token ? `${terminateUrl}&session_token=${token}` : terminateUrl)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full flex flex-col items-center">
                <div className="mb-8 hover:scale-105 transition-transform duration-300">
                    <a href="http://opinioninsights.in/" target="_blank" rel="noopener noreferrer">
                        <BrandLogo
                            className="h-16 w-auto drop-shadow-sm"
                            fallbackClassName="text-2xl font-black text-indigo-900 tracking-tighter uppercase"
                        />
                    </a>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Quick Verification</h1>
                        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                            Please provide your details to continue to the survey.
                        </p>
                    </div>

                    <form action={handleQualification} className="space-y-6">
                        <input type="hidden" name="response_id" value={response_id || ''} />
                        <input type="hidden" name="session_token" value={session_token || ''} />

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">How old are you?</label>
                            <input
                                type="number" name="age" required min="1" max="120"
                                placeholder="Enter your age"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Your Country</label>
                            <select name="country" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium appearance-none">
                                <option value="">Select your country...</option>
                                <option value="US">United States</option>
                                <option value="UK">United Kingdom</option>
                                <option value="CA">Canada</option>
                                <option value="IN">India</option>
                                <option value="AU">Australia</option>
                                <option value="Global">Other / Global</option>
                            </select>
                        </div>

                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all mt-2">
                            Continue to Survey
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-gray-400 mt-8 font-medium">
                        By continuing, you agree to our terms of service and privacy policy.
                    </p>
                </div>
            </div>
        </div>
    )
}
