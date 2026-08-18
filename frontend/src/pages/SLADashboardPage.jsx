import { Trophy, Activity, AlertTriangle, Zap } from 'lucide-react';
import { useFacilitySLA } from '../hooks/useFacilitySLA';

function UptimeBar({ pct }) {
  const color = pct >= 95 ? 'var(--online)' : pct >= 80 ? 'var(--degraded)' : 'var(--offline)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', background: 'var(--border-2)', borderRadius: '3px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ color, fontSize: '12px', fontFamily: 'JetBrains Mono, monospace',
                     minWidth: '48px', textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

function MetricCard({ icon, label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '16px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '8px', color: 'var(--text-2)' }}>
        {icon}
        <span style={{ fontSize: '12px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color ?? 'var(--text-1)',
                    fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
    </div>
  );
}

export default function SLADashboardPage() {
  const { facilities, loading, error } = useFacilitySLA();

  const totalAnomalies  = facilities.reduce((s, f) => s + f.anomaly_count, 0);
  const totalIncidents  = facilities.reduce((s, f) => s + f.incident_count, 0);
  const totalCritical   = facilities.reduce((s, f) => s + f.critical_anomalies, 0);
  const avgUptime       = facilities.length
    ? (facilities.reduce((s, f) => s + f.uptime_pct, 0) / facilities.length).toFixed(1)
    : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-1)', fontSize: '20px', fontWeight: 600, margin: 0 }}>
          Facility SLA Dashboard
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '4px' }}>
          Last 7 days — uptime, incidents, and anomalies across all facilities
        </p>
      </div>

      {loading && <p style={{ color: 'var(--text-2)' }}>Loading...</p>}
      {error   && <p style={{ color: 'var(--offline)' }}>Error: {error}</p>}

      {!loading && !error && (
        <>
          {/* Summary metric cards */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <MetricCard icon={<Activity size={14} />}    label="Avg Uptime"         value={`${avgUptime}%`}    color="var(--online)" />
            <MetricCard icon={<AlertTriangle size={14} />} label="Total Anomalies"  value={totalAnomalies}     color="var(--degraded)" />
            <MetricCard icon={<Zap size={14} />}         label="Critical Anomalies" value={totalCritical}      color="var(--offline)" />
            <MetricCard icon={<Activity size={14} />}    label="Total Incidents"    value={totalIncidents}     color="var(--text-2)" />
          </div>

          {/* Facility leaderboard */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={14} color="var(--text-2)" />
              <span style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 600 }}>
                Facility Rankings
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rank', 'Facility', 'Devices', 'Uptime (7d)', 'Incidents', 'Anomalies', 'Critical'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left',
                                         color: 'var(--text-2)', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facilities.map((f, index) => (
                  <tr key={f.facility_id}
                      style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: index === 0 ? '#F59E0B' : 'var(--text-2)',
                                     fontWeight: index === 0 ? 700 : 400,
                                     fontSize: '14px' }}>
                        #{index + 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                        {f.facility_name}
                      </div>
                      <div style={{ color: 'var(--text-2)', fontSize: '11px',
                                   fontFamily: 'JetBrains Mono, monospace' }}>
                        {f.facility_code}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                      <span style={{ color: 'var(--online)' }}>{f.online}</span>
                      {f.degraded > 0 && <span style={{ color: 'var(--degraded)' }}> / {f.degraded}</span>}
                      {f.offline  > 0 && <span style={{ color: 'var(--offline)' }}> / {f.offline}</span>}
                      <span style={{ color: 'var(--text-3)' }}> of {f.total_devices}</span>
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: '160px' }}>
                      <UptimeBar pct={f.uptime_pct} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)',
                                 fontFamily: 'JetBrains Mono, monospace' }}>
                      {f.incident_count}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)',
                                 fontFamily: 'JetBrains Mono, monospace' }}>
                      {f.anomaly_count}
                    </td>
                    <td style={{ padding: '12px 16px',
                                 color: f.critical_anomalies > 0 ? 'var(--offline)' : 'var(--text-2)',
                                 fontFamily: 'JetBrains Mono, monospace',
                                 fontWeight: f.critical_anomalies > 0 ? 600 : 400 }}>
                      {f.critical_anomalies}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}