import { useState, useEffect, useCallback } from 'react'
import useAnomalies from '../hooks/useAnomalies'
import { useLiveEventListener } from '../hooks/useLiveUpdates'
import Dropdown from '../components/Dropdown'

const SEVERITY_OPTIONS = [
  { value: '',         label: 'All severities' },
  { value: 'CRITICAL', label: 'CRITICAL'       },
  { value: 'HIGH',      label: 'HIGH'          },
  { value: 'MEDIUM',    label: 'MEDIUM'        },
  { value: 'LOW',       label: 'LOW'           },
]
const TYPE_OPTIONS = [
  { value: '',                label: 'All types'         },
  { value: 'TRAFFIC_SPIKE',   label: 'Traffic Spike'   },
  { value: 'TRAFFIC_DROP',    label: 'Traffic Drop'    },
  { value: 'DEVICE_FLAPPING', label: 'Device Flapping' },
  { value: 'ERROR_RATE',      label: 'Error Rate'      },
]

export default function AnomaliesPage() {
  const [severity, setSeverity] = useState('')
  const [anomalyType, setAnomalyType] = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const filters = {}
  if (severity) filters.severity = severity
  if (anomalyType) filters.anomaly_type = anomalyType
  if (!showAcknowledged) filters.is_acknowledged = false

  const { anomalies, setAnomalies, loading, error, acknowledgeAnomaly } = useAnomalies(filters)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Live anomaly events (from the shared connection in Layout) — new
  // detections appear at the top instantly, and an acknowledgment made
  // from another tab/session is reflected here too, without a reload.
  useLiveEventListener(useCallback((event) => {
    if (event.kind === 'anomaly_created') {
      if (severity && event.severity !== severity) return
      if (anomalyType && event.anomaly_type !== anomalyType) return

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
  }, [severity, anomalyType, setAnomalies]))

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatTimeAgo = (iso) => {
    const diff = Math.floor((new Date() - new Date(iso)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const severityColor = {
    CRITICAL: 'var(--critical)',
    HIGH:     'var(--high)',
    MEDIUM:   'var(--medium)',
    LOW:      'var(--low)',
  }

  const severityDarkColor = {
    CRITICAL: 'var(--critical)',
    HIGH:     'var(--high-dark)',
    MEDIUM:   'var(--medium-dark)',
    LOW:      'var(--low)',
  }

  // Count by severity — always "how many need attention", regardless of
  // whether the "Show acknowledged" toggle is also displaying resolved
  // ones below. Acknowledging only flips a flag on the row (it isn't
  // removed from the list), so this must exclude acknowledged ones
  // explicitly or the tally wouldn't actually drop when you acknowledge.
  const counts = {
    CRITICAL: anomalies.filter(a => a.severity === 'CRITICAL' && !a.is_acknowledged).length,
    HIGH:     anomalies.filter(a => a.severity === 'HIGH' && !a.is_acknowledged).length,
    MEDIUM:   anomalies.filter(a => a.severity === 'MEDIUM' && !a.is_acknowledged).length,
    LOW:      anomalies.filter(a => a.severity === 'LOW' && !a.is_acknowledged).length,
  }

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
          ANOMALIES <span style={{ color: 'var(--text-light)' }}>/</span> ALL FACILITIES
        </div>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
        }}>
          {formatTime(currentTime)} PKT
        </span>
      </div>

      {/* Main Content */}
      <div className="fade-in" style={{ flex: 1, overflow: 'auto', padding: '32px 34px 48px' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 800,
              fontSize: '34px',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}>
              Anomalies
            </h1>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-2)',
              margin: 0,
            }}>
              Traffic & device anomalies detected by IsolationForest across all facilities.
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: '26px',
            textAlign: 'right',
          }}>
            <div>
              <div style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 900,
                fontSize: '32px',
                color: 'var(--critical)',
                lineHeight: 1,
              }}>
                {counts.CRITICAL}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--text-3)',
                marginTop: '3px',
              }}>
                CRITICAL
              </div>
            </div>
            <div>
              <div style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 900,
                fontSize: '32px',
                color: 'var(--high-dark)',
                lineHeight: 1,
              }}>
                {counts.HIGH}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--text-3)',
                marginTop: '3px',
              }}>
                HIGH
              </div>
            </div>
            <div>
              <div style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 900,
                fontSize: '32px',
                color: 'var(--medium-dark)',
                lineHeight: 1,
              }}>
                {counts.MEDIUM}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--text-3)',
                marginTop: '3px',
              }}>
                MEDIUM
              </div>
            </div>
            <div>
              <div style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 900,
                fontSize: '32px',
                color: 'var(--text-3)',
                lineHeight: 1,
              }}>
                {counts.LOW}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--text-3)',
                marginTop: '3px',
              }}>
                LOW
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}>
          <Dropdown
            value={severity}
            onChange={setSeverity}
            options={SEVERITY_OPTIONS}
            width="160px"
          />

          <Dropdown
            value={anomalyType}
            onChange={setAnomalyType}
            options={TYPE_OPTIONS}
            width="170px"
          />

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '12px',
            color: 'var(--text-2)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={e => setShowAcknowledged(e.target.checked)}
              style={{ accentColor: 'var(--text-1)' }}
            />
            Show acknowledged
          </label>

          <span style={{
            marginLeft: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: 'var(--text-2)',
          }}>
            {anomalies.length} anomalies
          </span>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '7px',
            padding: '7px 12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: 'var(--text-1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--text-1)'
            e.currentTarget.style.color = 'var(--bg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)'
            e.currentTarget.style.color = 'var(--text-1)'
          }}
          >
            ↓ Export CSV
          </button>
        </div>

        {/* List */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {loading && (
            <p style={{ padding: '20px', fontSize: '13px', color: 'var(--text-3)' }}>
              Loading...
            </p>
          )}

          {error && (
            <p style={{ padding: '20px', fontSize: '13px', color: 'var(--critical)' }}>
              {error}
            </p>
          )}

          {!loading && !error && anomalies.length === 0 && (
            <p style={{ padding: '20px', fontSize: '13px', color: 'var(--text-3)' }}>
              No anomalies found
            </p>
          )}

          {!loading && !error && anomalies.map((anomaly, i) => {
            const isAcknowledged = anomaly.is_acknowledged

            return (
              <div
                key={anomaly.id}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '16px 20px',
                  borderBottom: i < anomalies.length - 1 ? '1px solid rgba(33, 29, 23, 0.09)' : 'none',
                  animation: isAcknowledged ? 'none' : `floatUp 0.4s ease-out ${Math.min(i, 10) * 0.05}s both`,
                  opacity: isAcknowledged ? 0.5 : 1,
                }}
              >
                <span style={{
                  width: '4px',
                  flex: 'none',
                  borderRadius: '2px',
                  background: isAcknowledged ? 'var(--text-light)' : severityColor[anomaly.severity] || 'var(--text-3)',
                }}/>

                <div style={{ width: '118px', flex: 'none' }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isAcknowledged ? 'var(--low)' : severityDarkColor[anomaly.severity] || 'var(--text-3)',
                  }}>
                    {anomaly.severity}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    marginTop: '3px',
                  }}>
                    {anomaly.sigma_score?.toFixed(1)}σ
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10.5px',
                    color: isAcknowledged ? 'var(--low)' : severityDarkColor[anomaly.severity] || 'var(--text-3)',
                    marginBottom: '4px',
                  }}>
                    {anomaly.anomaly_type?.replace(/_/g, ' ')}
                  </div>
                  <p style={{
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: isAcknowledged ? 'var(--text-mid)' : 'var(--text-1)',
                    margin: 0,
                  }}>
                    {anomaly.explanation}
                  </p>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9.5px',
                    color: 'var(--text-3)',
                    marginTop: '6px',
                  }}>
                    {anomaly.facility_name} · {anomaly.area_name || 'Area'} / {anomaly.lane_name || 'Lane'} · {formatTimeAgo(anomaly.detected_at)}
                  </div>
                </div>

                <div style={{
                  flex: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                  }}>
                    {formatTimeAgo(anomaly.detected_at)}
                  </span>
                  {!isAcknowledged ? (
                    <button
                      onClick={async () => {
                        try {
                          await acknowledgeAnomaly(anomaly.id)
                        } catch (err) {
                          console.error(err)
                        }
                      }}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '10px',
                        color: 'var(--text-2)',
                        background: 'none',
                        border: '1px solid rgba(33, 29, 23, 0.2)',
                        borderRadius: '6px',
                        padding: '4px 11px',
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
                      Acknowledge
                    </button>
                  ) : (
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9.5px',
                      color: 'var(--online)',
                    }}>
                      ✓ acknowledged
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}
