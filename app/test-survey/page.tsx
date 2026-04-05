'use client';

import { useState } from 'react';

interface Session {
  id: string;
  project_code: string;
  project_name: string;
  uid: string;
  oi_session: string;
  clickid: string;
  status: string;
}

export default function TestSurveyPage() {
  const [projectCode, setProjectCode] = useState('TEST001');
  const [userId, setUserId] = useState('test_user_001');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<{ time: string; message: string; type: string }[]>([
    { time: new Date().toLocaleTimeString(), message: 'Ready. Configure and click "Start Survey" to begin.', type: 'info' }
  ]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'in_progress') return { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' };
    if (s === 'complete') return { bg: 'rgba(34,197,94,0.2)', text: '#4ade80' };
    if (s === 'terminate') return { bg: 'rgba(239,68,68,0.2)', text: '#f87171' };
    if (s === 'quota_full') return { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' };
    return { bg: 'rgba(148,163,184,0.2)', text: '#94a3b8' };
  };

  const startSurvey = async () => {
    if (!projectCode || !userId) {
      addLog('Please enter both Project Code and User ID', 'error');
      return;
    }

    setLoading(true);
    addLog(`Creating response for project=${projectCode}, uid=${userId}...`, 'info');

    try {
      const response = await fetch('/api/test-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectCode, uid: userId })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentSession(data.session);
        addLog(`✅ Response created successfully!`, 'success');
        addLog(`   Session ID: ${data.session.id}`, 'info');
        addLog(`   oi_session: ${data.session.oi_session}`, 'info');
        addLog(`   Status: ${data.session.status}`, 'info');
      } else {
        addLog(`❌ Error: ${data.error}`, 'error');
        if (data.details) addLog(`   Details: ${JSON.stringify(data.details)}`, 'error');
      }
    } catch (error: any) {
      addLog(`❌ Network error: ${error.message}`, 'error');
    }

    setLoading(false);
  };

  const updateStatus = async (type: string) => {
    if (!currentSession) {
      addLog('No active session. Click "Start Survey" first.', 'error');
      return;
    }

    addLog(`Updating status to "${type}"...`, 'info');

    try {
      const response = await fetch('/api/test-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clickid: currentSession.oi_session, type })
      });

      const data = await response.json();

      if (data.success) {
        if (data.session) {
          setCurrentSession(data.session);
        }
        addLog(`✅ ${data.message}`, 'success');
        if (data.idempotent) addLog(`   (Already was terminal)`, 'warn');
      } else {
        addLog(`❌ Error: ${data.error}`, 'error');
      }
    } catch (error: any) {
      addLog(`❌ Network error: ${error.message}`, 'error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#e2e8f0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)'
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '28px',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>🧪 Survey Test Link</h1>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '32px', fontSize: '14px' }}>
          Click to create response & update status in database
        </p>

        {/* Config Section */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>⚙️ Configuration</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Project Code</label>
            <input
              type="text"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="e.g. TEST001"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>User ID (uid)</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. user123"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Start Button */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: currentSession ? '16px' : '24px' }}>
          <button
            onClick={startSurvey}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.4 : 1,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '⏳ Creating...' : '▶ Start Survey'}
          </button>
        </div>

        {/* Status Buttons */}
        {currentSession && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => updateStatus('complete')}
              style={{
                flex: 1,
                padding: '14px 20px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease'
              }}
            >
              ✅ Complete
            </button>
            <button
              onClick={() => updateStatus('terminate')}
              style={{
                flex: 1,
                padding: '14px 20px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease'
              }}
            >
              ❌ Terminate
            </button>
            <button
              onClick={() => updateStatus('quota')}
              style={{
                flex: 1,
                padding: '14px 20px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease'
              }}
            >
              📊 Quota Full
            </button>
          </div>
        )}

        {/* Session Info */}
        {currentSession && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>📋 Session Details</h3>
            {[
              { label: 'Response ID', value: currentSession.id },
              { label: 'Project', value: `${currentSession.project_code} - ${currentSession.project_name}` },
              { label: 'User ID', value: currentSession.uid },
              { label: 'oi_session', value: currentSession.oi_session },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>{item.label}</span>
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Status</span>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                background: getStatusColor(currentSession.status).bg,
                color: getStatusColor(currentSession.status).text
              }}>
                {currentSession.status}
              </span>
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>📝 Activity Log</h3>
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            maxHeight: '200px',
            overflowY: 'auto',
            fontFamily: "'Consolas', monospace",
            fontSize: '12px',
            lineHeight: 1.6
          }}>
            {logs.map((log, i) => (
              <div key={i} style={{
                marginBottom: '4px',
                color: log.type === 'success' ? '#4ade80' : log.type === 'error' ? '#f87171' : log.type === 'warn' ? '#fbbf24' : '#60a5fa'
              }}>
                [{log.time}] {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
