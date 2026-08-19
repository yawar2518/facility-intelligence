import { useFacilitySLA } from '../hooks/useFacilitySLA';
import { useCountUp } from '../hooks/useCountUp';

const GRID_COLUMNS = '64px minmax(180px,1fr) 170px 230px 100px 100px 90px';

function uptimeColor(pct) {
  return pct >= 95 ? 'var(--online)' : pct >= 80 ? 'var(--degraded)' : 'var(--offline)';
}

function UptimeBar({ pct, delay }) {
  const color = uptimeColor(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <div style={{
        flex: 1,
        height: '6px',
        background: 'var(--border-2)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '3px',
          transformOrigin: 'left',
          animation: `barGrow 1s ease-out ${delay}s both`,
        }} />
      </div>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11.5px',
        color,
        flex: 'none',
        minWidth: '42px',
        textAlign: 'right',
      }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function MetricCard({ label, value, suffix, color, delay }) {
  return (
    <div className="slide-up" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '18px 20px',
      flex: 1,
      animationDelay: `${delay}s`,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9.5px',
        letterSpacing: '0.14em',
        color: 'var(--text-3)',
        marginBottom: '10px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Archivo, sans-serif',
        fontWeight: 900,
        fontSize: '34px',
        lineHeight: 1,
        color,
      }}>
        {value}{suffix && <span style={{ fontSize: '20px' }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function SLADashboardPage() {
  const { facilities, loading, error } = useFacilitySLA();

  const totalAnomalies = facilities.reduce((s, f) => s + f.anomaly_count, 0);
  const totalIncidents = facilities.reduce((s, f) => s + f.incident_count, 0);
  const totalCritical  = facilities.reduce((s, f) => s + f.critical_anomalies, 0);
  const avgUptime      = facilities.length
    ? facilities.reduce((s, f) => s + f.uptime_pct, 0) / facilities.length
    : 0;

  // Ranked by uptime (already sorted by the API), then by fewer anomalies —
  // matches the "#1 / #2 / #3" leaderboard order in the design.
  const ranked = [...facilities].sort((a, b) =>
    b.uptime_pct - a.uptime_pct || a.anomaly_count - b.anomaly_count
  );

  const avgUptimeCount   = useCountUp(avgUptime, 900);
  const anomaliesCount   = useCountUp(totalAnomalies, 900);
  const criticalCount    = useCountUp(totalCritical, 900);
  const incidentsCount   = useCountUp(totalIncidents, 900);

  const now   = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 34px',
        borderBottom: '1px solid var(--border)',
        flex: 'none',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'var(--text-4)',
        }}>
          SLA DASHBOARD <span style={{ color: 'var(--text-light)' }}>/</span> LAST 7 DAYS
        </div>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
        }}>
          {fmtDate(start)} – {fmtDate(now)}
        </span>
      </div>

      {/* Main Content — fades/rises in on every mount (initial load,
          reload, or route switch into this page) and smooth-scrolls on
          its own axis, matching the rest of the app's page-transition
          convention. */}
      <div className="fade-in" style={{ flex: 1, overflow: 'auto', scrollBehavior: 'smooth', padding: '32px 34px 48px' }}>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 800,
            fontSize: '34px',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Facility SLA
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
            Uptime, incidents, and anomalies across all facilities, ranked over the last 7 days.
          </p>
        </div>

        {loading && (
          <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading...</p>
        )}

        {error && (
          <p style={{ fontSize: '13px', color: 'var(--critical)' }}>Error: {error}</p>
        )}

        {!loading && !error && (
          <>
            {/* Summary metric cards */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <MetricCard label="AVG UPTIME"         value={avgUptimeCount.toFixed(1)} suffix="%" color="var(--online)"   delay={0} />
              <MetricCard label="TOTAL ANOMALIES"    value={Math.round(anomaliesCount)}               color="var(--degraded-dark)" delay={0.06} />
              <MetricCard label="CRITICAL ANOMALIES" value={Math.round(criticalCount)}                color="var(--critical)" delay={0.12} />
              <MetricCard label="TOTAL INCIDENTS"    value={Math.round(incidentsCount)}               color="var(--text-1)"  delay={0.18} />
            </div>

            {/* Facility leaderboard */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 22px',
                background: 'var(--text-1)',
              }}>
                <span style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: 'var(--bg)',
                }}>
                  Facility Rankings
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLUMNS,
                gap: '16px',
                padding: '12px 22px',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                letterSpacing: '0.12em',
                color: 'var(--text-3)',
              }}>
                <span>RANK</span>
                <span>FACILITY</span>
                <span>DEVICES</span>
                <span>UPTIME 7D</span>
                <span style={{ textAlign: 'right' }}>INCIDENTS</span>
                <span style={{ textAlign: 'right' }}>ANOMALIES</span>
                <span style={{ textAlign: 'right' }}>CRITICAL</span>
              </div>

              {ranked.length === 0 && (
                <p style={{ padding: '24px 22px', fontSize: '13px', color: 'var(--text-3)', textAlign: 'center' }}>
                  No facilities found.
                </p>
              )}

              {ranked.map((f, i) => {
                const rank = i + 1;
                return (
                  <div
                    key={f.facility_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRID_COLUMNS,
                      gap: '16px',
                      padding: '17px 22px',
                      borderBottom: i < ranked.length - 1 ? '1px solid var(--border-2)' : 'none',
                      alignItems: 'center',
                      animation: `floatUp 0.4s ease-out ${i * 0.06}s both`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(33, 29, 23, 0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Rank */}
                    <span style={{
                      fontFamily: 'Archivo, sans-serif',
                      fontWeight: 800,
                      fontSize: '16px',
                      color: rank === 1 ? 'var(--accent)' : 'var(--text-3)',
                    }}>
                      #{rank}
                    </span>

                    {/* Facility */}
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-1)' }}>
                        {f.facility_name}
                      </div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '10.5px',
                        color: 'var(--text-3)',
                        marginTop: '2px',
                      }}>
                        {f.facility_code}
                      </div>
                    </div>

                    {/* Devices */}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-3)' }}>
                      <span style={{ color: 'var(--online)' }}>{f.online}</span>
                      {f.degraded > 0 && <span style={{ color: 'var(--degraded-dark)' }}> / {f.degraded}</span>}
                      {f.offline  > 0 && <span style={{ color: 'var(--offline)' }}> / {f.offline}</span>}
                      {' '}of {f.total_devices}
                    </span>

                    {/* Uptime 7d — bar fills in from 0 on every mount. */}
                    <UptimeBar pct={f.uptime_pct} delay={i * 0.06} />

                    {/* Incidents */}
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12.5px',
                      color: 'var(--text-2)',
                      textAlign: 'right',
                    }}>
                      {f.incident_count}
                    </span>

                    {/* Anomalies */}
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12.5px',
                      color: 'var(--text-2)',
                      textAlign: 'right',
                    }}>
                      {f.anomaly_count}
                    </span>

                    {/* Critical */}
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12.5px',
                      color: f.critical_anomalies > 0 ? 'var(--critical)' : 'var(--text-3)',
                      fontWeight: f.critical_anomalies > 0 ? 700 : 400,
                      textAlign: 'right',
                    }}>
                      {f.critical_anomalies}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
