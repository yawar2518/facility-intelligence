import { useState } from 'react'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityDeviceTree } from '../hooks/useFacilityDeviceTree'
import FacilitySelector from '../components/StatusGrid/FacilitySelector'
import AreaPanel from '../components/StatusGrid/AreaPanel'

function StatusGridPage() {
  // Which facility is currently selected
  const [selectedFacilityId, setSelectedFacilityId] = useState(null)

  // Get facility list for the dropdown
  const { facilities, loading: facilitiesLoading } = useFacilities()

  // Get device tree for the selected facility
  const { tree, loading: treeLoading, error } = useFacilityDeviceTree(selectedFacilityId)

  return (
    <div className="p-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Status Grid</h2>
          <p className="text-gray-500 mt-1">
            Live device status across all areas and lanes
          </p>
        </div>

        {/* Facility selector */}
        {!facilitiesLoading && (
          <FacilitySelector
            facilities={facilities}
            selectedId={selectedFacilityId}
            onSelect={setSelectedFacilityId}
          />
        )}
      </div>

      {/* Empty state — no facility selected yet */}
      {!selectedFacilityId && (
        <div className="text-center py-24">
          <p className="text-gray-600 text-lg">Select a facility to view device status</p>
        </div>
      )}

      {/* Loading state */}
      {treeLoading && (
        <div className="text-center py-24">
          <p className="text-gray-500">Loading device tree...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <p className="text-red-400">{error}</p>
      )}

      {/* Device tree — areas and their lanes */}
      {tree && !treeLoading && (
        <div>
          {/* Facility summary bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex items-center gap-6">
            <div>
              <p className="text-white font-semibold">{tree.facility_name}</p>
              <p className="text-gray-500 text-sm">{tree.facility_code}</p>
            </div>
            <div className="text-gray-600 text-sm">
              {tree.areas.length} areas
            </div>
          </div>

          {/* Area panels */}
          {tree.areas.map((area) => (
            <AreaPanel
              key={area.id}
              area={area}
            />
          ))}
        </div>
      )}

    </div>
  )
}

export default StatusGridPage