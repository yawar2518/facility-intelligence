function StatusChangeRow({ change }) {

  // Status badge colors
  const statusColors = {
    ONLINE:      'bg-green-900 text-green-400',
    OFFLINE:     'bg-red-900 text-red-400',
    DEGRADED:    'bg-yellow-900 text-yellow-400',
    UNKNOWN:     'bg-gray-800 text-gray-400',
    MAINTENANCE: 'bg-blue-900 text-blue-400',
  }

  // Reason labels — friendlier than the raw enum value
  const reasonLabels = {
    HEARTBEAT_TIMEOUT:   'Heartbeat timeout',
    HEARTBEAT_RECEIVED:  'Heartbeat resumed',
    ERROR_CODES_DETECTED:'Error codes detected',
    ERROR_CODES_CLEARED: 'Error codes cleared',
    MANUAL:              'Manual override',
    SYSTEM_STARTUP:      'System startup',
  }

  // Format timestamp to readable local time
  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Format duration — convert seconds to human readable
  const formatDuration = (seconds) => {
    if (!seconds) return null
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const prevStyle = statusColors[change.previous_status] || statusColors.UNKNOWN
  const newStyle = statusColors[change.new_status] || statusColors.UNKNOWN
  const duration = formatDuration(change.duration_seconds)

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-800 last:border-0">

      {/* Timestamp */}
      <div className="w-36 shrink-0">
        <p className="text-gray-400 text-xs font-mono">
          {formatTime(change.changed_at)}
        </p>
      </div>

      {/* Device info */}
      <div className="w-40 shrink-0">
        <p className="text-white text-sm font-mono font-bold">{change.device_code}</p>
        <p className="text-gray-500 text-xs">{change.device_name}</p>
        <p className="text-gray-600 text-xs">{change.area_name} / {change.lane_name}</p>
      </div>

      {/* Transition — previous → new */}
      <div className="flex items-center gap-2 w-48 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded ${prevStyle}`}>
          {change.previous_status}
        </span>
        <span className="text-gray-600 text-xs">→</span>
        <span className={`text-xs px-2 py-0.5 rounded ${newStyle}`}>
          {change.new_status}
        </span>
      </div>

      {/* Reason */}
      <div className="flex-1">
        <p className="text-gray-300 text-sm">
          {reasonLabels[change.reason] || change.reason}
        </p>
        {/* Show error codes if present */}
        {change.metadata?.error_codes?.length > 0 && (
          <p className="text-yellow-600 text-xs mt-0.5">
            {change.metadata.error_codes.join(', ')}
          </p>
        )}
      </div>

      {/* Duration in previous status */}
      {duration && (
        <div className="w-16 shrink-0 text-right">
          <p className="text-gray-600 text-xs">{duration}</p>
          <p className="text-gray-700 text-xs">in prev.</p>
        </div>
      )}

    </div>
  )
}

export default StatusChangeRow