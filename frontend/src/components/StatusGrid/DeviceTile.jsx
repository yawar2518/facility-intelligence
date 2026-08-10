function DeviceTile({ device, onClick }) {

  // Status color mapping — background and text
  const statusStyles = {
    ONLINE:      'bg-green-900 border-green-700 text-green-400',
    OFFLINE:     'bg-red-900 border-red-700 text-red-400',
    DEGRADED:    'bg-yellow-900 border-yellow-700 text-yellow-400',
    UNKNOWN:     'bg-gray-800 border-gray-600 text-gray-400',
    MAINTENANCE: 'bg-blue-900 border-blue-700 text-blue-400',
  }

  // Status dot indicator
  const dotStyles = {
    ONLINE:      'bg-green-400',
    OFFLINE:     'bg-red-400',
    DEGRADED:    'bg-yellow-400',
    UNKNOWN:     'bg-gray-400',
    MAINTENANCE: 'bg-blue-400',
  }

  // Friendly device type labels
  const deviceTypeLabels = {
    BARRIER_GATE:     'Barrier Gate',
    LPR_CAMERA:       'LPR Camera',
    KIOSK:            'Kiosk',
    INTERCOM:         'Intercom',
    TICKET_DISPENSER: 'Ticket Disp.',
    SENSOR:           'Sensor',
  }

  const style = statusStyles[device.status] || statusStyles.UNKNOWN
  const dot = dotStyles[device.status] || dotStyles.UNKNOWN

  return (
    <div className={`border rounded-lg p-3 ${style} cursor-pointer hover:opacity-80 transition-opacity`} onClick={onClick}>

      {/* Top row — code and status dot */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-bold text-sm">{device.code}</span>
        <span className={`w-2 h-2 rounded-full ${dot}`}></span>
      </div>

      {/* Device type */}
      <p className="text-xs opacity-75 mb-1">
        {deviceTypeLabels[device.device_type] || device.device_type}
      </p>

      {/* Status label */}
      <p className="text-xs font-medium">{device.status}</p>
    </div>
    
  )
}

export default DeviceTile