import { useState } from 'react'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityStatusChanges } from '../hooks/useFacilityStatusChanges'
import FacilitySelector from '../components/StatusGrid/FacilitySelector'
import StatusChangeRow from '../components/Timeline/StatusChangeRow'

function TimelinePage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState(null)

  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { changes, loading, error } = useFacilityStatusChanges(selectedFacilityId, 100)

  return (
    <div className="p-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Event Timeline</h2>
          <p className="text-gray-500 mt-1">
            Status change history across all devices
          </p>
        </div>

        {!facilitiesLoading && (
          <FacilitySelector
            facilities={facilities}
            selectedId={selectedFacilityId}
            onSelect={setSelectedFacilityId}
          />
        )}
      </div>

      {/* Empty state */}
      {!selectedFacilityId && (
        <div className="text-center py-24">
          <p className="text-gray-600 text-lg">Select a facility to view events</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-24">
          <p className="text-gray-500">Loading events...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400">{error}</p>
      )}

      {/* Timeline */}
      {changes.length > 0 && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">

          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
            <div className="w-36 text-gray-600 text-xs uppercase tracking-wider">Time</div>
            <div className="w-40 text-gray-600 text-xs uppercase tracking-wider">Device</div>
            <div className="w-48 text-gray-600 text-xs uppercase tracking-wider">Transition</div>
            <div className="flex-1 text-gray-600 text-xs uppercase tracking-wider">Reason</div>
            <div className="w-16 text-gray-600 text-xs uppercase tracking-wider text-right">Duration</div>
          </div>

          {/* Rows */}
          <div className="px-4">
            {changes.map((change) => (
              <StatusChangeRow
                key={change.id}
                change={change}
              />
            ))}
          </div>

        </div>
      )}

      {/* Empty results */}
      {selectedFacilityId && !loading && changes.length === 0 && (
        <div className="text-center py-24">
          <p className="text-gray-600">No status changes recorded yet for this facility</p>
        </div>
      )}

    </div>
  )
}

export default TimelinePage