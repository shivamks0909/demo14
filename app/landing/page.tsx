'use client';

import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [params, setParams] = useState<Record<string, string>>({});
  const [callbackStatus, setCallbackStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    setParams(allParams);
  }, []);

  const sendCallback = async (type: string) => {
    setLoading(true);
    const sessionId = params.oi_session || params.transactionId || params.transactionid || params.oid || '';

    try {
      const response = await fetch(`/api/callback?session=${encodeURIComponent(sessionId)}&type=${encodeURIComponent(type)}`, {
        redirect: 'manual'
      });

      if (response.status === 200) {
        const data = await response.json();
        setCallbackStatus(`✅ ${data.message || 'Status updated to ' + type}`);
      } else if (response.status === 307 || response.status === 302) {
        setCallbackStatus(`✅ Status updated to ${type} (redirected)`);
      } else {
        const text = await response.text();
        setCallbackStatus(`❌ Error: ${response.status}`);
      }
    } catch (error: any) {
      setCallbackStatus(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  const paramOrder = ['transactionId', 'transactionid', 'oi_session', 'oid', 'uid', 'pid', 'rid', 'code', 'project', 'sid', 'cid', 'clickid', 'status', 'type'];
  const sortedParams = Object.entries(params).sort((a, b) => {
    const ia = paramOrder.indexOf(a[0]);
    const ib = paramOrder.indexOf(b[0]);
    if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

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
        maxWidth: '700px',
        width: '100%',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)'
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '32px',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>🎯 Survey Landing Page</h1>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '32px', fontSize: '14px' }}>
          All tracking parameters received from the redirect
        </p>

        {/* Parameters Display */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>📋 Received Parameters</h3>
          {sortedParams.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No parameters received. Open via track API link.</p>
          ) : (
            sortedParams.map(([key, value], i) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < sortedParams.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
              }}>
                <span style={{
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  minWidth: '140px'
                }}>{key}</span>
                <span style={{
                  color: '#e2e8f0',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  textAlign: 'right',
                  marginLeft: '16px'
                }}>{value}</span>
              </div>
            ))
          )}
        </div>

        {/* Callback Buttons */}
        {sortedParams.length > 0 && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>📞 Send S2S Callback</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => sendCallback('complete')}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                ✅ Complete
              </button>
              <button
                onClick={() => sendCallback('terminate')}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                ❌ Terminate
              </button>
              <button
                onClick={() => sendCallback('quota')}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                📊 Quota Full
              </button>
            </div>
            {callbackStatus && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: callbackStatus.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: callbackStatus.startsWith('✅') ? '#4ade80' : '#f87171',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {callbackStatus}
              </div>
            )}
          </div>
        )}

        {/* Raw URL */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>🔗 Full URL</h3>
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontFamily: 'monospace',
            fontSize: '12px',
            wordBreak: 'break-all',
            color: '#94a3b8'
          }}>
            {typeof window !== 'undefined' ? window.location.href : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
