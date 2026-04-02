'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, X } from 'lucide-react'

interface DeleteProjectButtonProps {
    id: string
    projectCode: string
}

function ConfirmModal({
    projectCode,
    onCancel,
    onConfirm,
    loading,
}: {
    projectCode: string
    onCancel: () => void
    onConfirm: () => void
    loading: boolean
}) {
    // Close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onCancel])

    return createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                padding: '16px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                    width: '100%',
                    maxWidth: '440px',
                    overflow: 'hidden',
                    animation: 'delModalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <AlertTriangle style={{ width: 22, height: 22, color: '#EF4444' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Delete Project</div>
                            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{projectCode}</div>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <X style={{ width: 16, height: 16 }} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '0 24px 20px' }}>
                    <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: 0 }}>
                        Are you sure you want to delete{' '}
                        <strong style={{ color: '#0F172A' }}>{projectCode}</strong>?
                        {' '}This will permanently remove the project from your dashboard.
                    </p>
                    <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginTop: 10, marginBottom: 0 }}>
                        ⚠️ This action cannot be undone.
                    </p>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#F1F5F9', margin: '0 24px' }} />

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px' }}>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        style={{
                            padding: '10px 20px', borderRadius: 12, border: 'none',
                            background: '#F1F5F9', color: '#475569', fontWeight: 600,
                            fontSize: 14, cursor: 'pointer', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#E2E8F0')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#F1F5F9')}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            padding: '10px 20px', borderRadius: 12, border: 'none',
                            background: loading ? '#FCA5A5' : '#EF4444',
                            color: '#fff', fontWeight: 600, fontSize: 14,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                            transition: 'background 0.15s, transform 0.1s',
                        }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#DC2626' }}
                        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#EF4444' }}
                    >
                        {loading ? (
                            <>
                                <svg style={{ animation: 'spin 0.7s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 style={{ width: 14, height: 14 }} />
                                Delete Project
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes delModalIn {
                    from { opacity: 0; transform: scale(0.92) translateY(-12px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);     }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>,
        document.body
    )
}

export default function DeleteProjectButton({ id, projectCode }: DeleteProjectButtonProps) {
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleConfirm = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`)
            setShowModal(false)
            router.refresh()
        } catch (error: any) {
            alert('Delete failed: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1"
                title="Delete Project"
            >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
            </button>

            {showModal && (
                <ConfirmModal
                    projectCode={projectCode}
                    onCancel={() => setShowModal(false)}
                    onConfirm={handleConfirm}
                    loading={loading}
                />
            )}
        </>
    )
}
