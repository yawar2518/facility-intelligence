import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useAlertLogs } from '../hooks/useAlertLogs';
import { useLiveEventListener } from '../hooks/useLiveUpdates';
import { useCountUp } from '../hooks/useCountUp';
import CsvExportButton from '../components/CsvExportButton';

const MOBILE_STYLES = `
  @media (max-width: 768px) {
    .al-header {
      padding: 10px 16px !important;
    }
    .al-header-clock {
      display: none !important;
    }
    .al-content {
      padding: 24px 16px 48px !important;
    }
    .al-title-row {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 14px !important;
      margin-bottom: 18px !important;
    }
    .al-title {
      font-size: 26px !important;
    }
    .al-stats {
      flex-direction: row !important;
      gap: 20px !important;
    }
    .al-stat-num {
      font-size: 24px !important;
    }
    /* Hide the desktop table header on mobile */
    .al-table-header {
      display: none !important;
    }
    /* Switch rows from grid to card layout */
    .al-table-row {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      padding: 14px 16px !important;
    }
    .al-col-rule {
      font-size: 13px !important;
      font-weight: 500 !important;
    }
    .al-col-recipient {
      font-size: 11.5px !important;
    }
    .al-col-meta {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      align-items: center !important;
      margin-top: 2px !important;
    }
    /* Hide redundant desktop-only columns on mobile */
    .al-col-type,
    .al-col-severity,
    .al-col-status-desktop,
    .al-col-time-desktop {
      display: none !important;
    }
  }
`

const STATUS_FILTERS = [
  { value: '',       label: 'All'    },
  { value: 'SENT',   label: 'Sent'   },
  { value: 'FAILED', label: 'Failed' },
];

const SEVERITY_COLOR = {
  CRITICAL: 'var(--critical)',
  HIGH:     'var(--high-dark)',
  MEDIUM:   'var(--medium-dark)',
  LOW:      'var(--low)',
};

export default function AlertLogsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [currentTime, setCurrentTime]   = useState(new Date());
  const [liveIds, setLiveIds] = useState(new Set());

  const filters = {};
  if (statusFilter) filters.status = statusFilter;

  const { logs, setLogs, totalCount, stats, setStats, loading, error } = useAlertLogs(filters);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useLiveEventListener(useCallback((event) => {
    if (event.kind !== 'alert_log_created') return;

    setLogs((prev) => {
      if (prev.some(l => l.id === event.id)) return prev;
      if (statusFilter && event.status !== statusFilter) return prev;

      const newLog = {
        id:            event.id,
        status:        event.status,
        error_message: event.error_message,
        sent_at:       event.sent_at,
        rule:          event.rule,
        recipient:     event.recipient,
        anomaly:       event.anomaly,
      };
      return [newLog, ...prev];
    });

    setStats((prev) => ({
      sent_24h:   (prev.sent_24h ?? 0)   + (event.status === 'SENT'   ? 1 : 0),
      failed_24h: (prev.failed_24h ?? 0) + (event.status === 'FAILED' ? 1 : 0),
    }));

    setLiveIds((prev) => new Set(prev).add(event.id));
    setTimeout(() => {
      setLiveIds((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }, 2200);
  }, [statusFilter, setLogs, setStats]));

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatSentAt = (iso) => {
    const d = new Date(iso);
    const isToday = d.toDateString() === new Date().toDateString();
    return isToday
      ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const sentCount   = useCountUp(stats.sent_24h ?? 0, 700);
  const failedCount = useCountUp(stats.failed_24h ?? 0, 700);

  return (
    <>
      <style>{MOBILE_STYLES}</style>

      {/* Header Bar */}
      <div className="al-header" style={{
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
          ALERT LOGS <span style={{ color: 'var(--text-light)' }}>/</span> DELIVERY
        </div>
        <span className="al-header-clock" style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
          whiteSpace: 'nowrap',
        }}>
          {formatTime(currentTime)} PKT
        </span>
      </div>

      {/* Main Content */}
      <div className="fade-in al-content" style={{ flex: 1, overflow: 'auto', padding: '32px 34px 48px' }}>

        {/* Title + 24h stats */}
        <div className="al-title-row" style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <div>
            <h1 className="al-title" style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 800,
              fontSize: '34px',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}>
              Alert Delivery Log
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
              Every alert dispatched by the rules engine — email, Slack, and SMS.
            </p>
          </div>

          <div className="al-stats" style={{ display: 'flex', gap: '22px', textAlign: 'right', flex: 'none' }}>
            <div>
              <div className="al-stat-num" style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 900,
                fontSize: '30px',
                lineHeight: 1,
                color: 'var(--online)',
              }}>
                {Math.round(sentCount)}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--text-3)',
                marginTop: '3px',
              }}>
                SENT · 24H
              </div>
            </div>
            <div>
              <div className="al-stat-num" style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 900,
                fontSize: '30px',
                lineHeight: 1,
                color: 'var(--critical)',
              }}>
                {Math.round(failedCount)}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--text-3)',
                marginTop: '3px',
              }}>
                FAILED · 24H
              </div>
            </div>
          </div>
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
            STATUS
          </span>

          {STATUS_FILTERS.map(({ value, label }) => {
            const active = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
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
            {totalCount ?? logs.length} alerts
          </span>

          <CsvExportButton
            endpoint="alert-logs/"
            filename="alert-logs.csv"
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
          key={statusFilter}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Desktop table header — hidden on mobile */}
          <div className="al-table-header" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(170px,1fr) minmax(150px,200px) 150px 100px 110px 130px',
            gap: '16px',
            padding: '12px 22px',
            borderBottom: '1px solid var(--border)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            letterSpacing: '0.12em',
            color: 'var(--text-3)',
          }}>
            <span>RULE</span>
            <span>RECIPIENT</span>
            <span>TYPE</span>
            <span>SEVERITY</span>
            <span>STATUS</span>
            <span style={{ textAlign: 'right' }}>SENT AT</span>
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

          {!loading && !error && logs.length === 0 && (
            <p style={{ padding: '24px 22px', fontSize: '13px', color: 'var(--text-3)', textAlign: 'center' }}>
              No alert logs found.
            </p>
          )}

          {!loading && !error && logs.map((log, i) => {
            const isSent = log.status === 'SENT';
            const isLive = liveIds.has(log.id);
            const entrance = `floatUp 0.4s ease-out ${Math.min(i, 12) * 0.04}s both`;
            const highlight = isLive
              ? `, ${isSent ? 'highlightFadeGreen' : 'highlightFadeRed'} 2.2s ease-out`
              : '';

            return (
              <div
                key={log.id}
                className="al-table-row"
                style={{
                  // Desktop: 6-column grid. Mobile: overridden to flex column by .al-table-row CSS
                  display: 'grid',
                  gridTemplateColumns: 'minmax(170px,1fr) minmax(150px,200px) 150px 100px 110px 130px',
                  gap: '16px',
                  padding: '14px 22px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--border-2)' : 'none',
                  alignItems: 'center',
                  animation: entrance + highlight,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(33, 29, 23, 0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Rule name */}
                <span className="al-col-rule" style={{
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: 'var(--text-1)',
                }}>
                  {log.rule?.name ?? '—'}
                </span>

                {/* Recipient */}
                <span className="al-col-recipient" style={{
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {log.recipient?.email ?? log.recipient?.name ?? '—'}
                </span>

                {/* Type — desktop only */}
                <span className="al-col-type" style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10.5px',
                  color: 'var(--text-2)',
                }}>
                  {log.rule?.anomaly_type ?? 'ANY'}
                </span>

                {/* Severity — desktop only */}
                <span className="al-col-severity" style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10.5px',
                  color: SEVERITY_COLOR[log.rule?.min_severity] ?? 'var(--text-3)',
                }}>
                  {log.rule?.min_severity ?? '—'}
                </span>

                {/* Status — desktop only (shown in mobile meta row instead) */}
                <span className="al-col-status-desktop" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: isSent ? 500 : 600,
                  color: isSent ? 'var(--online)' : 'var(--critical)',
                }}
                  title={!isSent ? log.error_message : undefined}
                >
                  {isSent ? <CheckCircle size={13} /> : <XCircle size={13} />}
                  {log.status}
                </span>

                {/* Sent at — desktop only */}
                <span className="al-col-time-desktop" style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10.5px',
                  color: 'var(--text-3)',
                  textAlign: 'right',
                }}>
                  {formatSentAt(log.sent_at)}
                </span>

                {/* Mobile-only meta row: status + severity + time in one line */}
                <div className="al-col-meta" style={{
                  display: 'none', // shown on mobile via CSS
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: isSent ? 'var(--online)' : 'var(--critical)',
                    fontWeight: 600,
                  }}>
                    {isSent ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {log.status}
                  </span>
                  <span style={{ color: SEVERITY_COLOR[log.rule?.min_severity] ?? 'var(--text-3)' }}>
                    {log.rule?.min_severity ?? '—'}
                  </span>
                  <span>{log.rule?.anomaly_type ?? 'ANY'}</span>
                  <span style={{ marginLeft: 'auto' }}>{formatSentAt(log.sent_at)}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}