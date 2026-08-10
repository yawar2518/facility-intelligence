import DeviceTile from './DeviceTile'

function LaneRow({ lane, onDeviceClick }) {

  // Lane type badge colors
  const laneTypeBadge = {
    ENTRY:      'bg-blue-900 text-blue-300',
    EXIT:       'bg-purple-900 text-purple-300',
    PAY:        'bg-orange-900 text-orange-300',
    ENTRY_EXIT: 'bg-teal-900 text-teal-300',
  }

  const badge = laneTypeBadge[lane.lane_type] || 'bg-gray-800 text-gray-400'

  return (
    <div className="mb-4">

      {/* Lane header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400 text-sm font-medium">{lane.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>
          {lane.lane_type}
        </span>
        <span className="text-gray-600 text-xs">
          {lane.devices.length} device{lane.devices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Device tiles grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {lane.devices.map((device) => (
          <DeviceTile
            key={device.id}
            device={device}
            onClick={() => onDeviceClick(device)}
          />
        ))}
      </div>

    </div>
  )
}

export default LaneRow