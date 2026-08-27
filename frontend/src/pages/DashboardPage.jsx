import { useFacilities } from '../hooks/useFacilities'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getFacilityStatusChanges } from '../api/monitoring'
import useAnomalies from '../hooks/useAnomalies'
import { useAlertLogs } from '../hooks/useAlertLogs'
import { useFacilitySLA } from '../hooks/useFacilitySLA'
import { useCountUp } from '../hooks/useCountUp'
import { useLiveEventListener } from '../hooks/useLiveUpdates'

// Responsive rules — same pattern as Layout.jsx (inline-style codebase,
// one injected <style> block for breakpoint logic only).
const MOBILE_STYLES = `
  @media (max-width: 768px) {
    .dash-header {
      padding: 12px 16px !important;
      flex-wrap: wrap;
      gap: 4px;
    }
    .dash-header-time {
      font-size: 10px !important;
    }
    .dash-content {
      padding: 20px 16px !important;
    }
    .dash-hero {
      grid-template-columns: 1fr !important;
      gap: 24px !important;
    }
    .dash-hero-number {
      font-size: 72px !important;
    }
    .dash-hero-desc {
      font-size: 14px !important;
      margin: 14px 0 16px !important;
    }
    .dash-stats {
      flex-direction: column !important;
      gap: 0 !important;
      border-top: 1px solid var(--border-2);
      padding-top: 16px;
      justify-content: flex-start !important;
    }
    .dash-stat-link {
      padding-bottom: 14px !important;
      margin-bottom: 4px;
    }
    .dash-stat-number {
      font-size: 26px !important;
    }
    .dash-facilities {
      flex-direction: column !important;
    }
    .dash-facility-card {
      flex: none !important;
      width: 100% !important;
    }
    .dash-bottom {
      grid-template-columns: 1fr !important;
      gap: 28px !important;
    }
  }
`

// A shimmering placeholder block — same skeletonPulse animation the
// design system already ships in index.css, just never wired up to
// anything yet. Used everywhere below in place of a "0.0%"/"0" that
// hasn't loaded yet, or a bare "Loading..." string.
function Skeleton({ width, height = '1em', style }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'inline-block', width, height, ...style }}
    />
  )
}

// Mirrors the real facility card's exact layout (same padding, border,
// radius) so there's no size jump the moment real data replaces it —
// stands in for the plain "Loading..." text.
function SkeletonFacilityCard({ delay }) {
  return (
    <div
      className="fade-in"
      style={{
        flex: 1,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
        <Skeleton width="130px" height="19px" />
        <Skeleton width="38px" height="22px" />
      </div>
      <div style={{ margin: '10px 0 20px' }}>
        <Skeleton width="150px" height="10px" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} width="9px" height="9px" style={{ borderRadius: '2px' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '14px' }}>
        <Skeleton width="52px" height="11px" />
        <Skeleton width="52px" height="11px" />
      </div>
    </div>
  )
}

// Stands in for one anomaly-feed row while it loads — same severity
// bar + two text lines + timestamp shape as the real row.
function SkeletonFeedRow({ delay }) {
  return (
    <div className="fade-in" style={{
      display: 'flex', gap: '13px', padding: '14px 0',
      borderBottom: '1px solid var(--border-2)', animationDelay: `${delay}s`,
    }}>
      <Skeleton width="4px" height="auto" style={{ borderRadius: '2px', alignSelf: 'stretch' }} />
      <div style={{ flex: 1 }}>
        <Skeleton width="170px" height="10px" style={{ marginBottom: '9px' }} />
        <Skeleton width="88%" height="12.5px" style={{ marginBottom: '6px' }} />
        <Skeleton width="110px" height="9.5px" />
      </div>
    </div>
  )
}

// Stands in for one recent-events row while it loads — matches the
// real row's two-line shape (device + transition, then where it is).
function SkeletonEventRow({ delay }) {
  return (
    <div className="fade-in" style={{
      padding: '11px 0',
      borderBottom: '1px solid rgba(33, 29, 23, 0.08)', animationDelay: `${delay}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <Skeleton width="34px" height="10px" />
        <Skeleton width="56px" height="11px" />
        <Skeleton width="90px" height="10.5px" />
      </div>
      <Skeleton width="160px" height="9.5px" style={{ marginLeft: '46px' }} />
    </div>
  )
}

function DashboardPage() {
  const { facilities, setFacilities, loading, error } = useFacilities()
  const [recentChanges, setRecentChanges] = useState([])
  const [recentChangesLoading, setRecentChangesLoading] = useState(true)
  const { anomalies, setAnomalies, loading: anomalyLoading, acknowledgeAnomaly } = useAnomalies({ is_acknowledged: false })
  const { logs: alertLogs, loading: alertsLoading } = useAlertLogs()
  const { facilities: slaFacilities, loading: slaLoading } = useFacilitySLA()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Keep every facility card's counts, health %, and dot grid in sync live —
  // no reload needed, works the same in both directions (a device going
  // offline/degraded, or one recovering back to online). Toasts for these
  // same events are handled globally in Layout, not here.
  useLiveEventListener(useCallback((event) => {
    setFacilities((prev) => prev.map((f) => {
      if (f.id !== event.facility_id) return f
      const health = { ...(f.health || {}) }
      const prevKey = event.previous_status?.toLowerCase()
      const newKey = event.new_status?.toLowerCase()
      if (prevKey && health[prevKey] != null) {
        health[prevKey] = Math.max(0, health[prevKey] - 1)
      }
      if (newKey) {
        health[newKey] = (health[newKey] || 0) + 1
      }
      const total = health.total_devices || 0
      health.health_score = total > 0
        ? Math.round(((total - (health.offline || 0)) / total) * 1000) / 10
        : 100
      return { ...f, health }
    }))
  }, [setFacilities]))

  // Fetch recent events
  useEffect(() => {
    if (!facilities.length) return

    async function fetchAllChanges() {
      try {
        const allChanges = await Promise.all(
          facilities.map(f => getFacilityStatusChanges(f.id, 10).then(r =>
            // The API scopes one response to one facility and only
            // names it once at the top level — since changes from every
            // facility get flattened together below, each row needs to
            // carry its own facility name/code or there's no way to
            // tell which facility a bare device code like "BG-01" is at.
            r.data.changes.map(c => ({
              ...c,
              facility_name: f.name,
              facility_code: f.code,
            }))
          ))
        )
        const combined = allChanges
          .flat()
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
          .slice(0, 5)
        setRecentChanges(combined)
      } catch (err) {
        console.error(err)
      } finally {
        setRecentChangesLoading(false)
      }
    }

    fetchAllChanges()
  }, [facilities])

  // Live anomaly events, same as the Anomalies page — new detections show
  // up in the feed instantly, and acknowledging from another tab is
  // reflected here too, so the "Unacknowledged anomalies" stat stays true.
  useLiveEventListener(useCallback((event) => {
    if (event.kind === 'anomaly_created') {
      setAnomalies((prev) => {
        if (prev.some(a => a.id === event.anomaly_id)) return prev
        const newAnomaly = {
          id: event.anomaly_id,
          severity: event.severity,
          anomaly_type: event.anomaly_type,
          sigma_score: event.sigma_score,
          explanation: event.explanation,
          detected_at: event.detected_at,
          facility_name: event.facility_name,
          facility_code: event.facility_code,
          area_name: event.area_name,
          lane_name: event.lane_name,
          is_acknowledged: false,
        }
        return [newAnomaly, ...prev]
      })
    } else if (event.kind === 'anomaly_acknowledged') {
      setAnomalies((prev) => prev.map(a =>
        a.id === event.anomaly_id ? { ...a, is_acknowledged: true } : a
      ))
    }
  }, [setAnomalies]))

  // Calculate fleet health
  const fleetHealth = facilities.length > 0
    ? (facilities.reduce((sum, f) => sum + (f.health?.health_score || 0), 0) / facilities.length).toFixed(1)
    : 0

  const totalDevices = facilities.reduce((sum, f) => sum + (f.health?.total_devices || 0), 0)
  const onlineDevices = facilities.reduce((sum, f) => sum + (f.health?.online || 0), 0)
  const issueDevices = totalDevices - onlineDevices

  // Name the facility carrying the most issues instead of a flat count,
  // so the summary reads like a briefing rather than a stat dump.
  // "Issues" is defined the same way as issueDevices above (total - online)
  // so the two always agree — a facility can only be absent from this list
  // if it contributes nothing to issueDevices.
  const facilitiesWithIssues = facilities
    .map(f => ({
      name: f.name,
      issues: (f.health?.total_devices || 0) - (f.health?.online || 0),
    }))
    .filter(f => f.issues > 0)
    .sort((a, b) => b.issues - a.issues)

  const heroDescription = (() => {
    if (issueDevices === 0) {
      return `${onlineDevices} of ${totalDevices} devices reporting. Everything is nominal.`
    }
    const worst = facilitiesWithIssues[0]
    const plural = worst.issues === 1 ? 'device needs' : 'devices need'
    if (facilitiesWithIssues.length === 1) {
      return `${onlineDevices} of ${totalDevices} devices reporting. ${worst.issues} ${plural} attention at ${worst.name} — everything else is nominal.`
    }
    const othersCount = facilitiesWithIssues.length - 1
    const othersLabel = othersCount === 1 ? 'facility' : 'facilities'
    return `${onlineDevices} of ${totalDevices} devices reporting. ${worst.issues} ${plural} attention at ${worst.name}, plus ${othersCount} other ${othersLabel}.`
  })()

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  const formatTimeAgo = (iso) => {
    const diff = Math.floor((new Date() - new Date(iso)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const statusColor = {
    ONLINE:   'var(--online)',
    OFFLINE:  'var(--offline)',
    DEGRADED: 'var(--degraded)',
    UNKNOWN:  'var(--unknown)',
  }

  const severityColor = {
    CRITICAL: 'var(--critical)',
    HIGH:     'var(--high)',
    MEDIUM:   'var(--medium)',
    LOW:      'var(--low)',
  }

  const unacknowledgedAnomalies = anomalies?.filter(a => !a.is_acknowledged) || []

  // Calculate alerts sent in last 24h
  const alertsLast24h = alertLogs?.filter(log => {
    const logTime = new Date(log.sent_at)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return logTime >= oneDayAgo
  }).length || 0

  // Calculate average uptime across all facilities (7 day)
  const avgUptime = slaFacilities.length > 0
    ? (slaFacilities.reduce((sum, f) => sum + (f.uptime_pct || 0), 0) / slaFacilities.length).toFixed(1)
    : null

  // Counter animations
  const animatedFleetHealth      = useCountUp(parseFloat(fleetHealth) || 0, 1000)
  const animatedUnacknowledged   = useCountUp(unacknowledgedAnomalies.length, 1000)
  const animatedAlerts24h        = useCountUp(alertsLast24h, 1000)
  const animatedAvgUptime        = useCountUp(parseFloat(avgUptime) || 0, 1000)

  return (
    <>
      <style>{MOBILE_STYLES}</style>

      {/* Header Bar */}
      <div className="dash-header" style={{
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
          OVERVIEW <span style={{ color: 'var(--text-light)' }}>/</span> ALL FACILITIES
        </div>
        <span className="dash-header-time" style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
          whiteSpace: 'nowrap',
        }}>
          {formatDate()} · <span style={{ color: 'var(--text-1)' }}>{formatTime(currentTime)}</span> PKT
        </span>
      </div>

      {/* Main Content */}
      <div className="fade-in dash-content" style={{ flex: 1, overflow: 'auto', padding: '34px' }}>

        {/* Hero Section */}
        <div className="dash-hero" style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '48px',
          paddingBottom: '30px',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Left — big health number */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              letterSpacing: '0.2em',
              color: 'var(--accent)',
              marginBottom: '12px',
            }}>
              FLEET HEALTH · LAST 60S
            </div>
            <div className="dash-hero-number" style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 900,
              fontSize: '96px',
              lineHeight: 0.82,
              letterSpacing: '-0.03em',
            }}>
              {loading ? (
                <Skeleton width="230px" height="79px" style={{ borderRadius: '10px' }} />
              ) : (
                <span style={{ display: 'inline-block', animation: 'fadeIn 0.4s ease-out' }}>
                  {animatedFleetHealth.toFixed(1)}<span style={{ fontSize: '44px', color: 'var(--text-3)' }}>%</span>
                </span>
              )}
            </div>
            <p className="dash-hero-desc" style={{
              fontSize: '16px',
              lineHeight: 1.55,
              color: 'var(--text-2)',
              maxWidth: '420px',
              margin: '20px 0 22px',
            }}>
              {loading ? (
                <>
                  <Skeleton width="100%" height="16px" style={{ marginBottom: '8px' }} />
                  <Skeleton width="70%" height="16px" />
                </>
              ) : heroDescription}
            </p>
            <div style={{
              height: '4px',
              background: 'rgba(33, 29, 23, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
              maxWidth: '420px',
            }}>
              {loading ? (
                <Skeleton width="38%" height="100%" style={{ borderRadius: '2px' }} />
              ) : (
                <div style={{
                  height: '100%',
                  width: `${fleetHealth}%`,
                  background: 'var(--online)',
                  borderRadius: '2px',
                  transformOrigin: 'left',
                  animation: 'barGrow 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) both',
                }}/>
              )}
            </div>
          </div>

          {/* Right — three stat links */}
          <div className="dash-stats" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '20px',
          }}>
            <Link className="dash-stat-link" to="/anomalies" style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-2)',
              paddingBottom: '14px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Unacknowledged anomalies
              </span>
              {anomalyLoading ? (
                <Skeleton width="42px" height="26px" />
              ) : (
                <span className="dash-stat-number" style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 800,
                  fontSize: '30px',
                  color: unacknowledgedAnomalies.length > 0 ? 'var(--critical)' : 'var(--text-1)',
                  animation: 'fadeIn 0.4s ease-out',
                }}>
                  {Math.round(animatedUnacknowledged)}
                </span>
              )}
            </Link>

            <Link className="dash-stat-link" to="/alert-logs" style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-2)',
              paddingBottom: '14px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Alerts sent · 24h
              </span>
              {alertsLoading ? (
                <Skeleton width="30px" height="26px" />
              ) : (
                <span className="dash-stat-number" style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 800,
                  fontSize: '30px',
                  animation: 'fadeIn 0.4s ease-out',
                }}>
                  {Math.round(animatedAlerts24h)}
                </span>
              )}
            </Link>

            <Link className="dash-stat-link" to="/sla" style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Avg uptime · 7d
              </span>
              {slaLoading ? (
                <Skeleton width="58px" height="26px" />
              ) : (
                <span className="dash-stat-number" style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 800,
                  fontSize: '30px',
                  color: avgUptime === null ? 'var(--text-3)' : avgUptime >= 95 ? 'var(--online)' : avgUptime >= 90 ? 'var(--degraded)' : 'var(--critical)',
                  animation: 'fadeIn 0.4s ease-out',
                }}>
                  {animatedAvgUptime.toFixed(1)}<span style={{ fontSize: '16px', color: 'var(--text-3)' }}>%</span>
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Facilities Grid */}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'var(--text-4)',
          margin: '28px 0 14px',
        }}>
          FACILITIES
        </div>

        {error && <p style={{ fontSize: '12px', color: 'var(--critical)' }}>{error}</p>}

        <div className="dash-facilities" style={{
          display: 'flex',
          gap: '18px',
          marginBottom: '8px',
        }}>
          {loading && [0, 1, 2].map((i) => (
            <SkeletonFacilityCard key={i} delay={i * 0.08} />
          ))}

          {!loading && facilities.map((facility, index) => {
            const health   = facility.health?.health_score || 0
            const online   = facility.health?.online || 0
            const degraded = facility.health?.degraded || 0
            const offline  = facility.health?.offline || 0
            const total    = facility.health?.total_devices || 0
            const hasIssues = offline > 0 || degraded > 0
            // When a card is juggling all three states at once it gets tight —
            // abbreviate to keep the summary line on one row.
            const isCrowded = online > 0 && degraded > 0 && offline > 0

            return (
              <Link
                key={facility.id}
                to={`/status?facility=${facility.id}`}
                className="dash-facility-card slide-up"
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: hasIssues
                    ? '1px solid rgba(204, 59, 48, 0.3)'
                    : '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'block',
                  opacity: 0,
                  animationDuration: '0.85s',
                  animationDelay: `${Math.min(index + 1, 8) * 0.14}s`,
                  animationFillMode: 'forwards',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = hasIssues
                    ? 'rgba(204, 59, 48, 0.55)'
                    : 'rgba(33, 29, 23, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = hasIssues
                    ? 'rgba(204, 59, 48, 0.3)'
                    : 'rgba(33, 29, 23, 0.12)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <div style={{
                    fontFamily: 'Archivo, sans-serif',
                    fontWeight: 700,
                    fontSize: '19px',
                  }}>
                    {facility.name}
                  </div>
                  <div style={{
                    fontFamily: 'Archivo, sans-serif',
                    fontWeight: 800,
                    fontSize: '22px',
                    color: health >= 95 ? 'var(--online)' : health >= 70 ? 'var(--degraded)' : 'var(--critical)',
                  }}>
                    {health}%
                  </div>
                </div>

                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  marginBottom: '16px',
                }}>
                  {facility.code} · {total} devices · {facility.area_count ?? 0} areas
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginBottom: '14px',
                }}>
                  {/* One dot per position (not per status) so a live status
                      change animates the same square's color instead of
                      deleting one dot and adding another elsewhere. */}
                  {[
                    ...Array(online).fill('online'),
                    ...Array(degraded).fill('degraded'),
                    ...Array(offline).fill('offline'),
                  ].map((dotStatus, i) => (
                    <span key={`dot-${i}`} style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '2px',
                      background: `var(--${dotStatus})`,
                      transition: 'background-color 400ms ease',
                      animation: dotStatus === 'offline' ? 'blink 1.8s infinite' : 'none',
                    }}/>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '14px',
                  fontSize: '11px',
                  color: 'var(--text-2)',
                }}>
                  <span>
                    <b style={{ color: 'var(--online)', fontWeight: 600 }}>{online}</b> {isCrowded ? 'on' : 'online'}
                  </span>
                  {degraded > 0 && (
                    <span>
                      <b style={{ color: 'var(--degraded)', fontWeight: 600 }}>{degraded}</b> {isCrowded ? 'degr' : 'degraded'}
                    </span>
                  )}
                  {offline > 0 && (
                    <span>
                      <b style={{ color: 'var(--offline)', fontWeight: 600 }}>{offline}</b> offline
                    </span>
                  )}
                  {offline === 0 && degraded === 0 && (
                    <span style={{ color: 'var(--text-3)' }}>all nominal</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Feed + Events Two-Column */}
        <div className="dash-bottom" style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '36px',
          marginTop: '26px',
        }}>

          {/* Anomaly Feed */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: 'var(--text-4)',
              }}>
                ANOMALY FEED
              </span>
              {unacknowledgedAnomalies.length > 0 && (
                <Link to="/anomalies" style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--critical)',
                }}>
                  {unacknowledgedAnomalies.length} UNACKNOWLEDGED →
                </Link>
              )}
            </div>

            {anomalyLoading && [0, 1, 2].map((i) => (
              <SkeletonFeedRow key={i} delay={i * 0.07} />
            ))}

            {!anomalyLoading && unacknowledgedAnomalies.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>No unacknowledged anomalies</p>
            )}

            {!anomalyLoading && unacknowledgedAnomalies.slice(0, 4).map((anomaly, i) => (
              <div
                key={anomaly.id}
                className={`slide-up stagger-${i + 1}`}
                style={{
                  display: 'flex',
                  gap: '13px',
                  padding: '14px 0',
                  borderBottom: i < 3 ? '1px solid var(--border-2)' : 'none',
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <span style={{
                  width: '4px',
                  flex: 'none',
                  borderRadius: '2px',
                  background: severityColor[anomaly.severity] || 'var(--text-3)',
                }}/>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    marginBottom: '4px',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: severityColor[anomaly.severity] || 'var(--text-3)',
                    }}>
                      {anomaly.severity}
                    </span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      color: 'var(--text-4)',
                    }}>
                      {anomaly.anomaly_type?.replace(/_/g, ' ')} · {anomaly.sigma_score?.toFixed(1)}σ
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    color: 'var(--text-mid)',
                    margin: 0,
                  }}>
                    {anomaly.explanation}
                  </p>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9.5px',
                    color: 'var(--text-3)',
                    marginTop: '5px',
                  }}>
                    {anomaly.facility_name} · {formatTimeAgo(anomaly.detected_at)}
                  </div>
                </div>

                <button
                  onClick={async (e) => {
                    e.preventDefault()
                    try {
                      await acknowledgeAnomaly(anomaly.id)
                    } catch (err) {
                      console.error(err)
                    }
                  }}
                  style={{
                    flex: 'none',
                    alignSelf: 'flex-start',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9.5px',
                    color: 'var(--text-2)',
                    background: 'none',
                    border: '1px solid rgba(33, 29, 23, 0.2)',
                    borderRadius: '5px',
                    padding: '3px 9px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--text-1)'
                    e.currentTarget.style.color = 'var(--bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--text-2)'
                  }}
                >
                  Ack
                </button>
              </div>
            ))}
          </div>

          {/* Recent Events */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              letterSpacing: '0.2em',
              color: 'var(--text-4)',
              marginBottom: '12px',
            }}>
              RECENT EVENTS
            </div>

            {recentChangesLoading && [0, 1, 2, 3].map((i) => (
              <SkeletonEventRow key={i} delay={i * 0.06} />
            ))}

            {!recentChangesLoading && recentChanges.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>No recent events</p>
            )}

            {!recentChangesLoading && recentChanges.map((change, i) => (
              <div
                key={change.id}
                style={{
                  padding: '11px 0',
                  borderBottom: i < recentChanges.length - 1
                    ? '1px solid rgba(33, 29, 23, 0.08)'
                    : 'none',
                  animation: `floatUp 0.4s ease-out ${Math.min(i, 10) * 0.05}s both`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    width: '34px',
                    flex: 'none',
                  }}>
                    {formatTimeAgo(change.changed_at)}
                  </span>

                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    width: '56px',
                    flex: 'none',
                  }}>
                    {change.device_code}
                  </span>

                  <span style={{ fontSize: '10.5px' }}>
                    <span style={{ color: statusColor[change.previous_status] || 'var(--text-3)' }}>
                      {change.previous_status}
                    </span>
                    {' '}
                    <span style={{ color: 'var(--text-3)' }}>→</span>
                    {' '}
                    <span style={{ color: statusColor[change.new_status] || 'var(--text-3)' }}>
                      {change.new_status}
                    </span>
                  </span>
                </div>

                {/* Where — otherwise a bare device code like "BG-01" gives
                    no clue which facility, area, or lane it's even at. */}
                <div style={{
                  fontSize: '10.5px',
                  color: 'var(--text-3)',
                  marginLeft: '46px',
                  marginTop: '3px',
                }}>
                  {change.facility_name}
                  {change.facility_code ? ` (${change.facility_code})` : ''}
                  {' · '}{change.area_name} / {change.lane_name}
                </div>
              </div>
            ))}

            {recentChanges.length > 0 && (
              <Link to="/timeline" style={{
                display: 'inline-block',
                marginTop: '14px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                color: 'var(--accent)',
              }}>
                VIEW FULL TIMELINE →
              </Link>
            )}
          </div>
        </div>

      </div>

    </>
  )
}

export default DashboardPage