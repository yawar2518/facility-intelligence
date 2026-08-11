function StatusChangeRow({ change, isLast }) {

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

  const formatTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '—'
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 160px 200px 1fr 80px',
        padding: '10px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: 'var(--surface)',
        alignItems: 'center',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
    >

      {/* Time */}
      <div>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
        }}>
          {formatDate(change.changed_at)} {formatTime(change.changed_at)}
        </p>
      </div>

      {/* Device */}
      <div>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-1)',
          marginBottom: '2px',
        }}>
          {change.device_code}
        </p>
        <p style={{ fontSize: '10px', color: 'var(--text-3)' }}>
          {change.area_name} · {change.lane_name}
        </p>
      </div>

      {/* Transition */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          color: statusColor[change.previous_status] || 'var(--unknown)',
        }}>
          {change.previous_status}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>→</span>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          color: statusColor[change.new_status] || 'var(--unknown)',
        }}>
          {change.new_status}
        </span>
      </div>

      {/* Reason */}
      <div>
        <p style={{ fontSize: '11px', color: 'var(--text-2)' }}>
          {reasonLabels[change.reason] || change.reason}
        </p>
        {change.metadata?.error_codes?.length > 0 && (
          <p style={{
            fontSize: '10px',
            color: 'var(--degraded)',
            marginTop: '2px',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {change.metadata.error_codes.join(', ')}
          </p>
        )}
      </div>

      {/* Duration */}
      <div style={{ textAlign: 'right' }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-3)',
        }}>
          {formatDuration(change.duration_seconds)}
        </p>
      </div>

    </div>
  )
}

export default StatusChangeRow