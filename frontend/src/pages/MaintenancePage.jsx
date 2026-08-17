import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import { useMaintenanceScores } from '../hooks/useMaintenanceScores';
import CsvExportButton from '../components/CsvExportButton';

const RISK_COLORS = {
  LOW:    'var(--online)',
  MEDIUM: 'var(--degraded)',
  HIGH:   'var(--offline)',
};

const RISK_ICONS = {
  LOW:    <CheckCircle size={14} />,
  MEDIUM: <Clock size={14} />,
  HIGH:   <AlertTriangle size={14} />,
};

export default function MaintenancePage() {
  const [riskFilter, setRiskFilter] = useState('');
  const { scores, loading, error }  = useMaintenanceScores({ risk_level: riskFilter });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-1)', fontSize: '20px',
                     fontWeight: 600, margin: 0 }}>
          Predictive Maintenance
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '4px' }}>
          Barrier gate risk scores based on cycle count and error frequency
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '16px' }}>
        <Filter size={14} color="var(--text-2)" />
        {['', 'LOW', 'MEDIUM', 'HIGH'].map(r => (
          <button
            key={r}
            onClick={() => setRiskFilter(r)}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-2)',
              background: riskFilter === r ? 'var(--surface-2)' : 'transparent',
              color: riskFilter === r ? 'var(--text-1)' : 'var(--text-2)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {r || 'All'}
          </button>
        ))}
      </div>
      <CsvExportButton endpoint="monitoring/maintenance-scores/" filename="maintenance-scores.csv" />

      {/* Scores table */}
      {loading && <p style={{ color: 'var(--text-2)' }}>Loading...</p>}
      {error   && <p style={{ color: 'var(--offline)' }}>Error: {error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Device', 'Facility', 'Risk Level', 'Risk Score', 'Explanation', 'Computed At'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                                     color: 'var(--text-2)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.map(score => (
              <tr key={score.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ color: 'var(--text-1)' }}>{score.device_name}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: '11px',
                               fontFamily: 'JetBrains Mono, monospace' }}>
                    {score.device_code}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>
                  {score.facility}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center',
                                 gap: '4px', color: RISK_COLORS[score.risk_level] }}>
                    {RISK_ICONS[score.risk_level]}
                    {score.risk_level}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Risk score bar */}
                    <div style={{ width: '80px', height: '4px',
                                  background: 'var(--border-2)', borderRadius: '2px' }}>
                      <div style={{
                        width: `${score.risk_score * 100}%`,
                        height: '100%',
                        background: RISK_COLORS[score.risk_level],
                        borderRadius: '2px',
                      }} />
                    </div>
                    <span style={{ color: 'var(--text-2)', fontSize: '11px',
                                   fontFamily: 'JetBrains Mono, monospace' }}>
                      {(score.risk_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-2)',
                             fontSize: '12px', maxWidth: '300px' }}>
                  {score.explanation}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-2)',
                             fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                  {new Date(score.computed_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {scores.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px 12px',
                                         color: 'var(--text-2)', textAlign: 'center' }}>
                  No maintenance scores found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}