import { useDeviceDetail } from '../../hooks/useDeviceDetail'
import ForecastChart from '../ForecastChart'

function DeviceDetailPanel({ device, onClose }) {
  const { uptime, loading } = useDeviceDetail(device?.id)

  const statusColor = {
    ONLINE:      'var(--online)',
    OFFLINE:     'var(--offline)',
    DEGRADED:    'var(--degraded)',
    UNKNOWN:     'var(--unknown)',
    MAINTENANCE: 'var(--text-2)',
  }

  const color = statusColor[device?.status] || statusColor.UNKNOWN
  const isDegraded = device?.status === 'DEGRADED'

  const formatLastSeen = (iso) => {
    if (!iso) return 'Never'
    const diff = (Date.now() - new Date(iso)) / 1000
    if (diff < 60) return `${Math.round(diff)}s ago`
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`
    return `${Math.round(diff / 3600)}h ago`
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0h'
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (d === 0 && h === 0) return `${m}m`
    if (d === 0 && m === 0) return `${h}h`
    if (d === 0) return `${h}h ${m}m`
    if (d === 0 && m === 0) return `${d}d`
    if (m === 0) return `${d}d ${h}h`
    return `${d}d ${h}h ${m}m`
  }

  if (!device) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(33, 29, 23, 0.28)',
          animation: 'backdropIn 0.32s ease-out both',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: '372px',
        background: '#f7f2e9',
        borderLeft: '1px solid rgba(33, 29, 23, 0.14)',
        boxShadow: '-16px 0 40px rgba(33, 29, 23, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'drawerIn 0.32s cubic-bezier(0.2, 0.7, 0.2, 1) both',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '22px',
          borderBottom: '1px solid var(--border-2)',
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '17px',
              fontWeight: 500,
            }}>
              {device.code}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-3)',
              marginTop: '3px',
            }}>
              {device.name}
              {(device.area_name || device.lane_name) &&
                ` · ${[device.area_name, device.lane_name].filter(Boolean).join(' / ')}`}
            </div>
          </div>
          <div
            onClick={onClose}
            style={{
              fontSize: '16px',
              color: 'var(--text-3)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
          >
            ✕
          </div>
        </div>

        <div style={{
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflow: 'auto',
        }}>

          {/* Current Status */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              letterSpacing: '0.14em',
              color: 'var(--text-3)',
              marginBottom: '11px',
            }}>
              CURRENT STATUS
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: color,
                  animation: isDegraded ? 'pulseA 2s infinite' : 'none',
                }}/>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: color,
                }}>
                  {device.status}
                </span>
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                color: 'var(--text-3)',
              }}>
                {formatLastSeen(device.last_heartbeat)}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-2)' }}/>

          {/* Device Info */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              letterSpacing: '0.14em',
              color: 'var(--text-3)',
              marginBottom: '12px',
            }}>
              DEVICE INFO
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
            }}>
              {[
                { label: 'Type', value: device.device_type },
                { label: 'Firmware', value: device.firmware_version || '—' },
                { label: 'Heartbeat timeout', value: `${device.heartbeat_timeout_seconds}s` },
                { label: 'Serial', value: device.serial_number || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    {label}
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color: 'var(--text-mid)',
                  }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-2)' }}/>

          {/* Uptime */}
          {loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Loading uptime...</p>
          )}

          {uptime && (
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                letterSpacing: '0.14em',
                color: 'var(--text-3)',
                marginBottom: '12px',
              }}>
                UPTIME — LAST 7 DAYS
              </div>

              {/* Big number */}
              <div style={{
                fontFamily: 'Archivo, sans-serif',
                fontWeight: 900,
                fontSize: '38px',
                lineHeight: 1,
              }}>
                {uptime.uptime_pct}
                <span style={{ fontSize: '18px', color: 'var(--text-3)' }}>%</span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '4px',
                background: 'rgba(33, 29, 23, 0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
                margin: '12px 0 16px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${uptime.uptime_pct}%`,
                  background: 'var(--online)',
                  borderRadius: '2px',
                  transformOrigin: 'left',
                  animation: 'barGrow 1s ease-out both',
                }}/>
              </div>

              {/* Breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
              }}>
                {[
                  { label: 'Online', value: formatDuration(uptime.online_seconds), color: 'var(--online)' },
                  { label: 'Offline', value: formatDuration(uptime.offline_seconds), color: 'var(--critical)' },
                  { label: 'Degraded', value: formatDuration(uptime.degraded_seconds), color: 'var(--degraded)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'var(--surface-white)',
                    border: '1px solid var(--border-2)',
                    borderRadius: '7px',
                    padding: '9px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12px',
                      fontWeight: 600,
                      color,
                    }}>
                      {value}
                    </div>
                    <div style={{
                      fontSize: '9.5px',
                      color: 'var(--text-3)',
                      marginTop: '3px',
                    }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {device.lane_id && <div style={{ height: '1px', background: 'var(--border-2)' }}/>}

          {/* Forecast */}
          {device.lane_id && (
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                letterSpacing: '0.14em',
                color: 'var(--text-3)',
                marginBottom: '12px',
              }}>
                TRAFFIC FORECAST
              </div>
              <ForecastChart laneId={device.lane_id} laneName={device.lane_name} />
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default DeviceDetailPanel
