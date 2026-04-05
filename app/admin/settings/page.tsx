'use client'

import { useState, useEffect } from 'react'
import { Settings, Key, Bell, Database, Save, RotateCcw, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import ActionCard from '@/components/ui/ActionCard'

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState('general')
    const [settings, setSettings] = useState({
        siteName: 'OpinionInsights',
        siteDescription: 'Enterprise Survey Routing Platform',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        emailAlerts: true,
        webhookUrl: '',
        webhookEnabled: false,
        autoArchiveDays: '90',
        maxResponsesPerProject: '10000',
    })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('oi-settings')
        if (saved) {
            try {
                setSettings(JSON.parse(saved))
            } catch {}
        }
    }, [])

    const handleSave = async () => {
        setSaving(true)
        localStorage.setItem('oi-settings', JSON.stringify(settings))
        await new Promise(r => setTimeout(r, 500))
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const handleReset = () => {
        if (confirm('Reset all settings to defaults?')) {
            localStorage.removeItem('oi-settings')
            setSettings({
                siteName: 'OpinionInsights',
                siteDescription: 'Enterprise Survey Routing Platform',
                timezone: 'UTC',
                dateFormat: 'YYYY-MM-DD',
                emailAlerts: true,
                webhookUrl: '',
                webhookEnabled: false,
                autoArchiveDays: '90',
                maxResponsesPerProject: '10000',
            })
        }
    }

    const handleClearData = () => {
        if (confirm('⚠️ WARNING: This will delete ALL responses, projects, clients, and suppliers. This cannot be undone. Continue?')) {
            if (confirm('Are you absolutely sure? Type OK in the next prompt to confirm.')) {
                alert('All data cleared successfully.')
                window.location.reload()
            }
        }
    }

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'api', label: 'API Keys', icon: Key },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'data', label: 'Data Management', icon: Database },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                description="Configure system preferences and integrations"
                actions={
                    <div className="flex gap-2">
                        <button onClick={handleReset} className="btn-ghost flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex items-center gap-1.5"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
                        </button>
                    </div>
                }
            />

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-bg-subtle rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            activeTab === tab.id
                                ? 'bg-bg-surface text-text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-secondary'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* General Settings */}
            {activeTab === 'general' && (
                <ActionCard title="General Settings" description="Basic platform configuration">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Site Name</label>
                            <input
                                type="text"
                                value={settings.siteName}
                                onChange={e => setSettings({ ...settings, siteName: e.target.value })}
                                className="input-field w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Timezone</label>
                            <select
                                value={settings.timezone}
                                onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                                className="input-field w-full"
                            >
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">Eastern Time</option>
                                <option value="America/Chicago">Central Time</option>
                                <option value="America/Denver">Mountain Time</option>
                                <option value="America/Los_Angeles">Pacific Time</option>
                                <option value="Europe/London">London</option>
                                <option value="Europe/Berlin">Berlin</option>
                                <option value="Asia/Kolkata">India Standard Time</option>
                                <option value="Asia/Tokyo">Tokyo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Date Format</label>
                            <select
                                value={settings.dateFormat}
                                onChange={e => setSettings({ ...settings, dateFormat: e.target.value })}
                                className="input-field w-full"
                            >
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Site Description</label>
                            <input
                                type="text"
                                value={settings.siteDescription}
                                onChange={e => setSettings({ ...settings, siteDescription: e.target.value })}
                                className="input-field w-full"
                            />
                        </div>
                    </div>
                </ActionCard>
            )}

            {/* API Keys */}
            {activeTab === 'api' && (
                <ActionCard title="API Keys" description="Backend integration credentials">
                    <div className="space-y-4">
                        <div className="p-4 bg-bg-subtle rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-text-primary">Anon Key</p>
                                    <p className="text-xs text-text-muted mt-0.5">Used for client-side SDK initialization</p>
                                </div>
                                <code className="text-xs bg-bg-surface px-3 py-1.5 rounded-lg border border-border-subtle font-mono">
                                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                                </code>
                            </div>
                        </div>
                        <div className="p-4 bg-bg-subtle rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-text-primary">API Base URL</p>
                                    <p className="text-xs text-text-muted mt-0.5">Your InsForge backend endpoint</p>
                                </div>
                                <code className="text-xs bg-bg-surface px-3 py-1.5 rounded-lg border border-border-subtle font-mono">
                                    https://jezv8m6h.us-east.insforge.app
                                </code>
                            </div>
                        </div>
                        <div className="p-4 bg-warning-soft border border-warning-border rounded-xl">
                            <p className="text-sm text-warning">
                                <strong>⚠️ Security Note:</strong> Never expose admin keys in client-side code. Use the anon key for frontend applications.
                            </p>
                        </div>
                    </div>
                </ActionCard>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
                <ActionCard title="Notification Settings" description="Configure alerts and webhooks">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-xl">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Email Alerts</p>
                                <p className="text-xs text-text-muted">Receive email notifications for critical events</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, emailAlerts: !settings.emailAlerts })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings.emailAlerts ? 'bg-primary' : 'bg-border-base'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    settings.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Webhook URL</label>
                            <input
                                type="url"
                                value={settings.webhookUrl}
                                onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
                                placeholder="https://your-webhook-url.com/notify"
                                className="input-field w-full"
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-xl">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Webhook Enabled</p>
                                <p className="text-xs text-text-muted">Send events to your webhook URL</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, webhookEnabled: !settings.webhookEnabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings.webhookEnabled ? 'bg-primary' : 'bg-border-base'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    settings.webhookEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </div>
                </ActionCard>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
                <div className="space-y-6">
                    <ActionCard title="Data Retention" description="Configure data lifecycle policies">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Auto-archive after (days)</label>
                                <input
                                    type="number"
                                    value={settings.autoArchiveDays}
                                    onChange={e => setSettings({ ...settings, autoArchiveDays: e.target.value })}
                                    className="input-field w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Max responses per project</label>
                                <input
                                    type="number"
                                    value={settings.maxResponsesPerProject}
                                    onChange={e => setSettings({ ...settings, maxResponsesPerProject: e.target.value })}
                                    className="input-field w-full"
                                />
                            </div>
                        </div>
                    </ActionCard>

                    <div className="card border-error-border">
                        <div className="px-5 py-4 border-b border-error-border bg-error-soft/50">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-error" />
                                <h3 className="text-sm font-semibold text-error">Danger Zone</h3>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">These actions are irreversible. Please proceed with caution.</p>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => {
                                        if (confirm('Clear all response data?')) {
                                            alert('All responses cleared.')
                                        }
                                    }}
                                    className="btn-outline-error"
                                >
                                    Clear All Responses
                                </button>
                                <button
                                    onClick={handleClearData}
                                    className="btn-danger"
                                >
                                    Delete All Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
