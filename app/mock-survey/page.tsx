'use client'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function SurveyContent() {
    const searchParams = useSearchParams()
    const pid = searchParams.get('pid') || ''
    const oiSession = searchParams.get('oi_session') || ''
    const oiSig = searchParams.get('oi_sig') || ''
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState('')

    const handleCallback = async (type: string) => {
        setLoading(true)
        try {
            // First, ensure response record exists for this session
            const initRes = await fetch('/api/mock-init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pid: pid,
                    oi_session: oiSession,
                    uid: oiSession // Use session as UID for test
                })
            })
            
            if (!initRes.ok) {
                const errData = await initRes.json().catch(() => ({}))
                setResult('Init failed: ' + (errData.error || 'Unknown error'))
                setLoading(false)
                return
            }
            
            const initData = await initRes.json()
            if (!initData.success) {
                setResult('Init failed: ' + (initData.error || 'Unknown error'))
                setLoading(false)
                return
            }
            
            // Now trigger callback
            const res = await fetch(`/api/callback?pid=${pid}&cid=${oiSession}&type=${type}&sig=${oiSig}`)
            const data = await res.json()
            if (data.success) {
                window.location.href = `/status?type=${type}`
            } else {
                setResult('Error: ' + data.error)
            }
        } catch (err: any) {
            setResult('Failed to connect: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-[#111] border border-[#222] p-8 rounded-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                
                <h1 className="text-2xl font-bold mb-2">Test Client Survey</h1>
                <p className="text-gray-400 text-sm mb-6">
                    This is a mock survey. In a real scenario, this is where the 3rd party host asks their questions.
                </p>

                <div className="bg-[#1A1A1A] p-4 rounded-lg mb-6 text-xs text-gray-500 break-all border border-[#222]">
                    <div className="text-gray-300 font-semibold mb-1">Session Data Received:</div>
                    <div><strong>PID:</strong> {pid || 'Missing'}</div>
                    <div><strong>Session:</strong> {oiSession || 'Missing'}</div>
                    <div><strong>Signature:</strong> {oiSig || 'Missing'}</div>
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={() => handleCallback('complete')}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 transition-colors font-medium rounded-lg text-white disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Finish Survey (Complete)'}
                    </button>
                    
                    <button 
                        onClick={() => handleCallback('terminate')}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-900/50 transition-colors font-medium rounded-lg disabled:opacity-50"
                    >
                        Disqualify Me (Terminate)
                    </button>

                    <button 
                        onClick={() => handleCallback('quota')}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 border border-yellow-900/50 transition-colors font-medium rounded-lg disabled:opacity-50"
                    >
                        Survey Full (Quota Full)
                    </button>
                </div>
                
                {result && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded text-sm">
                        {result}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function MockSurvey() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Loading Test Survey...</div>}>
            <SurveyContent />
        </Suspense>
    )
}
