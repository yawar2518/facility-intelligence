import { useDeviceDetail } from '../../hooks/useDeviceDetail'

function DeviceDetailPanel({ device, onClose }) {
  const { uptime, loading, error } = useDeviceDetail(device?.id)

  // Status colors
  const statusColors = {
    ONLINE:      'bg-green-900 text-green-400',
    OFFLINE:     'bg-red-900 text-red-400',
    DEGRADED:    'bg-yellow-900 text-yellow-400',
    UNKNOWN:     'bg-gray-800 text-gray-400',
    MAINTENANCE: 'bg-blue-900 text-blue-400',
  }

  // Format seconds into hours and minutes
  const formatDuration = (seconds) => {
    if (!seconds) return '0h'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  // How long ago was the last heartbeat
  const formatLastSeen = (isoString) => {
    if (!isoString) return 'Never'
    const diff = (Date.now() - new Date(isoString)) / 1000
    if (diff < 60) return `${Math.round(diff)}s ago`
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
    return `${Math.round(diff / 86400)}d ago`
  }

  if (!device) return null

  const statusStyle = statusColors[device.status] || statusColors.UNKNOWN

  return (
    <>
      {/* Backdrop — clicking it closes the panel */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-white font-bold text-lg font-mono">{device.code}</h3>
            <p className="text-gray-400 text-sm">{device.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Current status */}
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Current Status</p>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusStyle}`}>
                {device.status}
              </span>
              <span className="text-gray-500 text-sm">
                {formatLastSeen(device.last_heartbeat)}
              </span>
            </div>
          </div>

          {/* Device info */}
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Device Info</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Type</span>
                <span className="text-gray-300 text-sm">{device.device_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Timeout</span>
                <span className="text-gray-300 text-sm">{device.heartbeat_timeout_seconds}s</span>
              </div>
            </div>
          </div>

          {/* Uptime section */}
          {loading && (
            <p className="text-gray-500 text-sm">Loading uptime data...</p>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {uptime && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">
                Uptime — Last 7 Days
              </p>

              {/* Big uptime percentage */}
              <div className="text-center mb-4">
                <span className="text-4xl font-bold text-white">
                  {uptime.uptime_pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${uptime.uptime_pct}%` }}
                />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-green-400 font-bold text-sm">
                    {formatDuration(uptime.online_seconds)}
                  </p>
                  <p className="text-gray-600 text-xs">Online</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-red-400 font-bold text-sm">
                    {formatDuration(uptime.offline_seconds)}
                  </p>
                  <p className="text-gray-600 text-xs">Offline</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-yellow-400 font-bold text-sm">
                    {formatDuration(uptime.degraded_seconds)}
                  </p>
                  <p className="text-gray-600 text-xs">Degraded</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default DeviceDetailPanel