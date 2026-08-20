const statusColor = {
  ONLINE:   'var(--online)',
  OFFLINE:  'var(--offline)',
  DEGRADED: 'var(--degraded)',
  UNKNOWN:  'var(--unknown)',
}

const reasonLabels = {
  HEARTBEAT_TIMEOUT:    'Heartbeat timeout',
  HEARTBEAT_RECEIVED:   'Heartbeat resumed',
  ERROR_CODES_DETECTED: 'Error detected',
  ERROR_CODES_CLEARED:  'Error cleared',
  MANUAL:               'Manual override',
  SYSTEM_STARTUP:       'System startup',
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(seconds) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}

// "held 22m" (was degraded before recovering), "down 45s" (was offline
// before recovering), "manual" (an operator forced it) — only relevant
// when there's actually something to report; other transitions show
// nothing here, matching the mockup.
function metaLabel(change) {
  if (change.reason === 'MANUAL') return 'manual'
  if (change.new_status === 'ONLINE' && change.previous_status === 'DEGRADED') {
    return `held ${formatDuration(change.duration_seconds)}`
  }
  if (change.new_status === 'ONLINE' && change.previous_status === 'OFFLINE') {
    return `down ${formatDuration(change.duration_seconds)}`
  }
  return null
}

function StatusPill({ status }) {
  const color = statusColor[status] || statusColor.UNKNOWN
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      color,
      border: `1px solid ${color}`,
      borderRadius: '4px',
      padding: '1px 7px',
    }}>
      {status}
    </span>
  )
}

function StatusChangeRow({ change, index, isLast }) {
  const isRecovery = change.new_status === 'ONLINE'
  const dotColor = isRecovery ? 'var(--online)' : (statusColor[change.new_status] || statusColor.UNKNOWN)
  const meta = metaLabel(change)
  const operator = change.metadata?.user || change.metadata?.operator

  return (
    <div
      style={{
        display: 'flex',
        gap: '18px',
        animation: `floatUp 0.4s ease-out ${Math.min(index, 14) * 0.035}s both`,
      }}
    >
      {/* Time */}
      <div style={{ width: '58px', flex: 'none', paddingTop: '2px' }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          color: 'var(--text-2)',
        }}>
          {formatTime(change.changed_at)}
        </span>
      </div>

      {/* Dot + connecting line */}
      <div style={{ width: '10px', flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          flex: 'none',
          marginTop: '4px',
          boxSizing: 'border-box',
          background: isRecovery ? 'var(--bg)' : dotColor,
          border: `2px solid ${dotColor}`,
        }}/>
        {!isLast && (
          <div style={{ width: '2px', flex: 1, background: 'var(--border-2)', marginTop: '6px' }}/>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? '4px' : '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-1)',
          }}>
            {change.device_code}
          </span>
          <StatusPill status={change.previous_status} />
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>→</span>
          <StatusPill status={change.new_status} />

          {meta && (
            <span style={{
              marginLeft: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10.5px',
              color: 'var(--text-3)',
            }}>
              {meta}
            </span>
          )}
        </div>

        <p style={{
          fontSize: '12.5px',
          color: 'var(--text-2)',
          marginTop: '5px',
        }}>
          {[change.area_name, change.lane_name].filter(Boolean).join(' / ')}
          {' · '}
          {reasonLabels[change.reason] || change.reason}
          {change.reason === 'MANUAL' && operator && ` by ${operator}`}
          {change.metadata?.error_codes?.length > 0 && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--degraded)',
            }}>
              {' '}{change.metadata.error_codes.join(', ')}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

export default StatusChangeRow
