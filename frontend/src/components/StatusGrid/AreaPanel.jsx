  import { useState } from 'react'
  import LaneRow from './LaneRow'

  function AreaPanel({ area, onDeviceClick }) {
    // Track whether this area is expanded or collapsed
    const [isOpen, setIsOpen] = useState(true)

    // Health score color
    const getHealthColor = (score) => {
      if (score >= 90) return 'text-green-400'
      if (score >= 70) return 'text-yellow-400'
      return 'text-red-400'
    }

    const allDevices = area.lanes.flatMap(l => l.devices)
    const offlineCount = allDevices.filter(d => d.status === 'OFFLINE').length
    const areaHealth = allDevices.length > 0
      ? Math.round(((allDevices.length - offlineCount) / allDevices.length) * 100)
      : 100


    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl mb-4">

        {/* Area header — clicking toggles collapse */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Collapse arrow */}
            <span className="text-gray-500 text-sm">
              {isOpen ? '▼' : '▶'}
            </span>

            {/* Area name and code */}
            <div>
              <h3 className="text-white font-semibold">{area.name}</h3>
              <p className="text-gray-500 text-xs">{area.code}</p>
            </div>
          </div>

          {/* Health score + capacity */}
          <div className="text-right">
            <p className={`font-bold text-lg ${getHealthColor(areaHealth)}`}>
              {areaHealth}%
            </p>
            <p className="text-gray-600 text-xs">
              capacity {area.capacity}
            </p>
          </div>
        </button>

        {/* Lanes — only rendered when open */}
        {isOpen && (
          <div className="px-4 pb-4">
            <div className="border-t border-gray-800 pt-4">
              {area.lanes.map((lane) => (
                <LaneRow
                  key={lane.id}
                  lane={lane}
                  onDeviceClick={onDeviceClick}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    )
  }

  export default AreaPanel