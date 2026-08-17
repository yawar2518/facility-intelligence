import { useState } from 'react';
import { CheckCircle, XCircle, Filter } from 'lucide-react';
import { useAlertLogs } from '../hooks/useAlertLogs';
import CsvExportButton from '../components/CsvExportButton';

const STATUS_COLORS = {
  SENT:   'var(--online)',
  FAILED: 'var(--offline)',
};

const STATUS_ICONS = {
  SENT:   <CheckCircle size={14} />,
  FAILED: <XCircle size={14} />,
};

export default function AlertLogsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { logs, loading, error } = useAlertLogs({ status: statusFilter });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-1)', fontSize: '20px',
                     fontWeight: 600, margin: 0 }}>
          Alert Delivery Log
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '4px' }}>
          Every alert dispatched by the rules engine
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '16px' }}>
        <Filter size={14} color="var(--text-2)" />
        {['', 'SENT', 'FAILED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-2)',
              background: statusFilter === s ? 'var(--surface-2)' : 'transparent',
              color: statusFilter === s ? 'var(--text-1)' : 'var(--text-2)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>
      <CsvExportButton endpoint="alert-logs/" filename="alert-logs.csv" />

      {/* Table */}
      {loading && <p style={{ color: 'var(--text-2)' }}>Loading...</p>}
      {error   && <p style={{ color: 'var(--offline)' }}>Error: {error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse',
                        fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Rule', 'Recipient', 'Type', 'Severity', 'Status', 'Sent At'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                                     color: 'var(--text-2)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}
                  style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-1)' }}>
                  {log.rule?.name ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>
                  {log.recipient?.email ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-2)',
                             fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                  {log.rule?.anomaly_type ?? 'ANY'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>
                  {log.rule?.min_severity ?? '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center',
                                 gap: '4px', color: STATUS_COLORS[log.status] }}>
                    {STATUS_ICONS[log.status]}
                    {log.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-2)',
                             fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                  {new Date(log.sent_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px 12px',
                                         color: 'var(--text-2)', textAlign: 'center' }}>
                  No alert logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}