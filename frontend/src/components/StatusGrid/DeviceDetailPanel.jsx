import { useDeviceDetail } from '../../hooks/useDeviceDetail'
import { X } from 'lucide-react'

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
    if (h === 0 && m === 0) return `${d}d`
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
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100%',
        width: '360px',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '16px',
              fontWeight: 500,
              color: 'var(--text-1)',
              marginBottom: '3px',
            }}>
              {device.code}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {device.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <X size={16} strokeWidth={1.5}/>
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Status */}
          <div>
            <p style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-3)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              Current Status
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}/>
                <span style={{ fontSize: '13px', fontWeight: 500, color }}>
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
          <div style={{ height: '1px', background: 'var(--border)' }}/>

          {/* Device info */}
          <div>
            <p style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-3)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              Device Info
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Type', value: device.device_type },
                { label: 'Timeout', value: `${device.heartbeat_timeout_seconds}s` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{label}</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color: 'var(--text-2)',
                  }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)' }}/>

          {/* Uptime */}
          {loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Loading uptime...</p>
          )}

          {uptime && (
            <div>
              <p style={{
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--text-3)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}>
                Uptime — Last 7 Days
              </p>

              {/* Big number */}
              <p style={{
                fontSize: '28px',
                fontWeight: 600,
                color: 'var(--text-1)',
                lineHeight: 1,
                marginBottom: '10px',
              }}>
                {uptime.uptime_pct}
                <span style={{ fontSize: '14px', color: 'var(--text-3)', marginLeft: '3px' }}>%</span>
              </p>

              {/* Progress bar */}
              <div style={{
                height: '2px',
                background: 'var(--border)',
                borderRadius: '1px',
                marginBottom: '16px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${uptime.uptime_pct}%`,
                  background: 'var(--online)',
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
                  { label: 'Offline', value: formatDuration(uptime.offline_seconds), color: 'var(--offline)' },
                  { label: 'Degraded', value: formatDuration(uptime.degraded_seconds), color: 'var(--degraded)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '5px',
                    padding: '8px',
                    textAlign: 'center',
                  }}>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12px',
                      fontWeight: 500,
                      color,
                      marginBottom: '3px',
                    }}>
                      {value}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--text-3)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default DeviceDetailPanel