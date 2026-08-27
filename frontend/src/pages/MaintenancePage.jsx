import { useState, useEffect } from 'react';
import { useMaintenanceScores } from '../hooks/useMaintenanceScores';
import CsvExportButton from '../components/CsvExportButton';

const MOBILE_STYLES = `
  @media (max-width: 768px) {
    .mn-header {
      padding: 10px 16px !important;
      flex-wrap: wrap;
      gap: 4px;
    }
    .mn-header-right {
      font-size: 10px !important;
    }
    .mn-content {
      padding: 24px 16px 48px !important;
    }
    .mn-title {
      font-size: 26px !important;
    }
    .mn-table-header {
      display: none !important;
    }
    .mn-table-row {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      padding: 14px 16px !important;
    }
    .mn-row-top {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
    }
    .mn-row-bar {
      display: flex !important;
      width: 100% !important;
      align-items: center !important;
    }
    .mn-table-row > div:first-child,
    .mn-row-explanation {
      text-align: center !important;
    }
    .mn-row-explanation {
      display: block !important;
    }
    .mn-row-meta {
      display: flex !important;
    }
    /* Desktop-only columns hidden on mobile */
    .mn-col-facility-desktop,
    .mn-col-risk-desktop,
    .mn-col-computed-desktop {
      display: none !important;
    }
  }
`

const RISK_FILTERS = [
  { value: '',       label: 'All'    },
  { value: 'LOW',    label: 'Low'    },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH',   label: 'High'   },
];

const RISK_COLORS = {
  LOW:    'var(--online)',
  MEDIUM: 'var(--degraded)',
  HIGH:   'var(--offline)',
};

const GRID_COLUMNS = '180px 140px 100px 170px minmax(180px,1fr) 100px';

export default function MaintenancePage() {
  const [riskFilter, setRiskFilter]   = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { scores, loading, error }    = useMaintenanceScores({ risk_level: riskFilter });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTimeAgo = (iso) => {
    const diff = Math.floor((new Date() - new Date(iso)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <>
      <style>{MOBILE_STYLES}</style>

      {/* Header Bar */}
      <div className="mn-header" style={{
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
          whiteSpace: 'nowrap',
        }}>
          MAINTENANCE <span style={{ color: 'var(--text-light)' }}>/</span> PREDICTIVE
        </div>
        <span className="mn-header-right" style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
          whiteSpace: 'nowrap',
        }}>
          recomputed hourly · {formatTime(currentTime)} PKT
        </span>
      </div>

      {/* Main Content */}
      <div className="fade-in mn-content" style={{
        flex: 1,
        overflow: 'auto',
        scrollBehavior: 'smooth',
        padding: '32px 34px 48px',
      }}>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="mn-title" style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 800,
            fontSize: '34px',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Predictive Maintenance
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
            Device risk scores from cycle count and error frequency. Service the top of the list first.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'var(--text-3)',
            letterSpacing: '0.1em',
            marginRight: '4px',
          }}>
            RISK
          </span>

          {RISK_FILTERS.map(({ value, label }) => {
            const active = riskFilter === value;
            return (
              <button
                key={value}
                onClick={() => setRiskFilter(value)}
                style={{
                  padding: '5px 13px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-strong)',
                  background: active ? 'var(--text-1)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--text-2)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(33, 29, 23, 0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                {label}
              </button>
            );
          })}

          <span style={{
            marginLeft: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: 'var(--text-2)',
          }}>
            {scores.length} devices
          </span>

          <CsvExportButton
            endpoint="monitoring/maintenance-scores/"
            filename="maintenance-scores.csv"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: '7px',
              padding: '6px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: 'var(--text-1)',
            }}
            hoverStyle={{ background: 'var(--text-1)', color: 'var(--bg)' }}
          />
        </div>

        {/* Table */}
        <div
          key={riskFilter}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Desktop header — hidden on mobile */}
          <div className="mn-table-header" style={{
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
            <span>DEVICE</span>
            <span>FACILITY</span>
            <span>RISK</span>
            <span>RISK SCORE</span>
            <span>EXPLANATION</span>
            <span style={{ textAlign: 'right' }}>COMPUTED</span>
          </div>

          {loading && (
            <p style={{ padding: '20px', fontSize: '13px', color: 'var(--text-3)' }}>
              Loading...
            </p>
          )}

          {error && (
            <p style={{ padding: '20px', fontSize: '13px', color: 'var(--critical)' }}>
              Error: {error}
            </p>
          )}

          {!loading && !error && scores.length === 0 && (
            <p style={{ padding: '24px 22px', fontSize: '13px', color: 'var(--text-3)', textAlign: 'center' }}>
              No maintenance scores found.
            </p>
          )}

          {!loading && !error && scores.map((score, i) => {
            const color = RISK_COLORS[score.risk_level] ?? 'var(--text-3)';
            const pct   = score.risk_score * 100;

            return (
              <div
                key={score.id}
                className="mn-table-row"
                style={{
                  // Desktop: 6-col grid. Mobile: overridden to flex-column by CSS.
                  display: 'grid',
                  gridTemplateColumns: GRID_COLUMNS,
                  gap: '16px',
                  padding: '15px 22px',
                  borderBottom: i < scores.length - 1 ? '1px solid var(--border-2)' : 'none',
                  alignItems: 'center',
                  animation: `floatUp 0.4s ease-out ${Math.min(i, 12) * 0.05}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(33, 29, 23, 0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Device name + code — always shown */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
                    {score.device_name}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    marginTop: '2px',
                  }}>
                    {score.device_code}
                  </div>
                </div>

                {/* Facility — desktop only */}
                <span className="mn-col-facility-desktop" style={{
                  fontSize: '12px',
                  color: 'var(--text-2)',
                }}>
                  {score.facility}
                </span>

                {/* Risk level — desktop only */}
                <span className="mn-col-risk-desktop" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color,
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flex: 'none' }} />
                  {score.risk_level}
                </span>

                {/* Risk score bar — always shown */}
                <div className="mn-row-bar" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{
                    flex: 1,
                    height: '5px',
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
                      animation: `barGrow 1s ease-out ${Math.min(i, 12) * 0.05}s both`,
                    }} />
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color,
                    flex: 'none',
                  }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>

                {/* Explanation — always shown */}
                <span className="mn-row-explanation" style={{
                  fontSize: '11.5px',
                  color: 'var(--text-mid)',
                  lineHeight: 1.45,
                }}>
                  {score.explanation}
                </span>

                {/* Computed at — desktop only */}
                <span className="mn-col-computed-desktop" style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  textAlign: 'right',
                }}>
                  {formatTimeAgo(score.computed_at)}
                </span>

                {/* Mobile-only meta: risk level + facility + computed */}
                <div className="mn-row-meta" style={{
                  display: 'none', // shown on mobile via CSS
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                    color,
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flex: 'none' }} />
                    {score.risk_level}
                  </span>
                  <span style={{ color: 'var(--text-2)' }}>{score.facility}</span>
                  <span style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>
                    {formatTimeAgo(score.computed_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}