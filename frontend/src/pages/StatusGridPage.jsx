import { useState } from 'react'
import { useEffect, useRef } from 'react'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityDeviceTree } from '../hooks/useFacilityDeviceTree'
import FacilitySelector from '../components/StatusGrid/FacilitySelector'
import DeviceDetailPanel from '../components/StatusGrid/DeviceDetailPanel'
import AreaPanel from '../components/StatusGrid/AreaPanel'

function StatusGridPage() {
  // Which facility is currently selected
  const [selectedFacilityId, setSelectedFacilityId] = useState(null)

  // Get facility list for the dropdown
  const { facilities, loading: facilitiesLoading } = useFacilities()

  // Get device tree for the selected facility
  const { tree, setTree, loading: treeLoading, error } = useFacilityDeviceTree(selectedFacilityId)

  const [selectedDevice, setSelectedDevice] = useState(null)

  // WebSocket connection for live updates
const wsRef = useRef(null)

useEffect(() => {
  // Only connect when a facility is selected and tree is loaded
  if (!selectedFacilityId) return

  // Open WebSocket connection
  const ws = new WebSocket(
    `ws://localhost:8000/ws/facility/${selectedFacilityId}/`
  )

  ws.onopen = () => {
    console.log('WebSocket connected for facility:', selectedFacilityId)
  }

  ws.onmessage = (e) => {
    const update = JSON.parse(e.data)
    console.log('Live update received:', update)

    // Update the device status in the tree without refetching
    // We find the device in the nested tree and update just its status
    setTree((prevTree) => {
      if (!prevTree) return prevTree

      const updatedAreas = prevTree.areas.map((area) => ({
        ...area,
        lanes: area.lanes.map((lane) => ({
          ...lane,
          devices: lane.devices.map((device) =>
            device.id === update.device_id
              ? { ...device, status: update.new_status }
              : device
          ),
        })),
      }))

      return { ...prevTree, areas: updatedAreas }
    })

    // If the updated device is currently open in the side panel,
    // update its status there too
    setSelectedDevice((prev) => {
      if (!prev || prev.id !== update.device_id) return prev
      return { ...prev, status: update.new_status }
    })
  }

  ws.onerror = (e) => {
    console.error('WebSocket error:', e)
  }

  wsRef.current = ws

  // Cleanup — close WebSocket when facility changes or component unmounts
  return () => {
    ws.close()
  }
}, [selectedFacilityId])

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
              onDeviceClick={setSelectedDevice}
            />
          ))}
          {selectedDevice && (
            <DeviceDetailPanel
              device={selectedDevice}
              onClose={() => setSelectedDevice(null)}
            />
          )}
        </div>
      )}

    </div>
  )
}

export default StatusGridPage