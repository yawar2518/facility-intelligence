import { useFacilities } from '../hooks/useFacilities'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getFacilityStatusChanges } from '../api/monitoring'
import useAnomalies from '../hooks/useAnomalies'
import { useAlertLogs } from '../hooks/useAlertLogs'
import { useFacilitySLA } from '../hooks/useFacilitySLA'
import { useCountUp } from '../hooks/useCountUp'
import { useLiveEventListener } from '../hooks/useLiveUpdates'

function DashboardPage() {
  const { facilities, setFacilities, loading, error } = useFacilities()
  const [recentChanges, setRecentChanges] = useState([])
  const { anomalies, setAnomalies, loading: anomalyLoading, acknowledgeAnomaly } = useAnomalies({ is_acknowledged: false })
  const { logs: alertLogs } = useAlertLogs()
  const { facilities: slaFacilities } = useFacilitySLA()
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
          facilities.map(f => getFacilityStatusChanges(f.id, 10))
        )
        const combined = allChanges
          .flatMap(r => r.data.changes)
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
          .slice(0, 5)
        setRecentChanges(combined)
      } catch (err) {
        console.error(err)
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
  const animatedFleetHealth = useCountUp(parseFloat(fleetHealth) || 0, 1000)
  const animatedUnacknowledged = useCountUp(unacknowledgedAnomalies.length, 1000)
  const animatedAlerts24h = useCountUp(alertsLast24h, 1000)
  const animatedAvgUptime = useCountUp(parseFloat(avgUptime) || 0, 1000)

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
          OVERVIEW <span style={{ color: 'var(--text-light)' }}>/</span> ALL FACILITIES
        </div>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
        }}>
          {formatDate()} · <span style={{ color: 'var(--text-1)' }}>{formatTime(currentTime)}</span> PKT
        </span>
      </div>

      {/* Main Content */}
      <div className="fade-in" style={{ flex: 1, overflow: 'auto', padding: '34px' }}>

        {/* Hero Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '48px',
          paddingBottom: '30px',
          borderBottom: '1px solid var(--border)',
        }}>
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
            <div style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 900,
              fontSize: '96px',
              lineHeight: 0.82,
              letterSpacing: '-0.03em',
            }}>
              <span style={{ display: 'inline-block', animation: 'fadeIn 0.4s ease-out' }}>
                {animatedFleetHealth.toFixed(1)}<span style={{ fontSize: '44px', color: 'var(--text-3)' }}>%</span>
              </span>
            </div>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.55,
              color: 'var(--text-2)',
              maxWidth: '420px',
              margin: '20px 0 22px',
            }}>
              {heroDescription}
            </p>
            <div style={{
              height: '4px',
              background: 'rgba(33, 29, 23, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
              maxWidth: '420px',
            }}>
              {!loading && (
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

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '20px',
          }}>
            <Link to="/anomalies" style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-2)',
              paddingBottom: '14px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Unacknowledged anomalies
              </span>
              <span style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 800,
                fontSize: '30px',
                color: unacknowledgedAnomalies.length > 0 ? 'var(--critical)' : 'var(--text-1)',
                animation: 'fadeIn 0.4s ease-out',
              }}>
                {Math.round(animatedUnacknowledged)}
              </span>
            </Link>

            <Link to="/alert-logs" style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-2)',
              paddingBottom: '14px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Alerts sent · 24h
              </span>
              <span style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 800,
                fontSize: '30px',
                animation: 'fadeIn 0.4s ease-out',
              }}>
                {Math.round(animatedAlerts24h)}
              </span>
            </Link>

            <Link to="/sla" style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Avg uptime · 7d
              </span>
              <span style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 800,
                fontSize: '30px',
                color: avgUptime === null ? 'var(--text-3)' : avgUptime >= 95 ? 'var(--online)' : avgUptime >= 90 ? 'var(--degraded)' : 'var(--critical)',
                animation: 'fadeIn 0.4s ease-out',
              }}>
                {animatedAvgUptime.toFixed(1)}<span style={{ fontSize: '16px', color: 'var(--text-3)' }}>%</span>
              </span>
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

        {loading && <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Loading...</p>}
        {error && <p style={{ fontSize: '12px', color: 'var(--critical)' }}>{error}</p>}

        <div style={{
          display: 'flex',
          gap: '18px',
          marginBottom: '8px',
        }}>
          {facilities.map((facility, index) => {
            const health = facility.health?.health_score || 0
            const online = facility.health?.online || 0
            const degraded = facility.health?.degraded || 0
            const offline = facility.health?.offline || 0
            const total = facility.health?.total_devices || 0
            const hasIssues = offline > 0 || degraded > 0
            // When a card is juggling all three states at once it gets tight —
            // abbreviate to keep the summary line on one row.
            const isCrowded = online > 0 && degraded > 0 && offline > 0

            return (
              <Link
                key={facility.id}
                to={`/status?facility=${facility.id}`}
                className="slide-up"
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
        <div style={{
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

            {anomalyLoading && <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Loading...</p>}

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

                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    marginBottom: '4px',
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

            {recentChanges.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>No recent events</p>
            )}

            {recentChanges.map((change, i) => (
              <div
                key={change.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 0',
                  borderBottom: i < recentChanges.length - 1
                    ? '1px solid rgba(33, 29, 23, 0.08)'
                    : 'none',
                  animation: `floatUp 0.4s ease-out ${Math.min(i, 10) * 0.05}s both`,
                }}
              >
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
