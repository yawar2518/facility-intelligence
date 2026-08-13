import { useState } from 'react'
import { useEffect, useRef } from 'react'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityDeviceTree } from '../hooks/useFacilityDeviceTree'
import FacilitySelector from '../components/StatusGrid/FacilitySelector'
import DeviceDetailPanel from '../components/StatusGrid/DeviceDetailPanel'
import AreaPanel from '../components/StatusGrid/AreaPanel'
import ForecastChart from '../components/ForecastChart'

function StatusGridPage() {
  // Which facility is currently selected
  const [selectedFacilityId, setSelectedFacilityId] = useState(null)

  // Get facility list for the dropdown
  const { facilities, loading: facilitiesLoading } = useFacilities()

  // Get device tree for the selected facility
  const { tree, setTree, loading: treeLoading, error } = useFacilityDeviceTree(selectedFacilityId)

  const [selectedDevice, setSelectedDevice] = useState(null)

  const [selectedLaneId, setSelectedLaneId] = useState(null)
  const [selectedLaneName, setSelectedLaneName] = useState('')

  // WebSocket connection for live updates
const wsRef = useRef(null)

useEffect(() => {
  setSelectedLaneId(null)
  setSelectedLaneName('')
  }, [selectedFacilityId])

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
      {/* Page header */}
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--border)',
}}>
  <div>
    <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }}>
      Status Grid
    </h1>
    <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
      Live device status across all areas and lanes
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

      {/* Empty state — no facility selected yet */}
      {/* Empty state */}
      {!selectedFacilityId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            Select a facility to view device status
          </p>
        </div>
      )}

      {/* Loading */}
      {treeLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: '12px', color: 'var(--offline)' }}>{error}</p>
      )}

      {/* Device tree */}
      {tree && !treeLoading && (
        <div>

          {/* Facility summary bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
              {tree.facility_name}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              {tree.facility_code}
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-3)',
              paddingLeft: '16px',
              borderLeft: '1px solid var(--border)',
            }}>
              {tree.areas.length} areas
            </span>
          </div>

          {/* Area panels */}
          {tree.areas.map((area) => (
            <AreaPanel
              key={area.id}
              area={area}
              onDeviceClick={setSelectedDevice}
            />
          ))}

        </div>
      )}

      {/* Device detail panel */}
      {selectedDevice && (
        <DeviceDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}

      {/* Forecast Chart */}

<div style={{

  marginTop: '24px',

  background: 'var(--surface)',

  border: '1px solid var(--border)',

  borderRadius: '8px',

  padding: '20px',

}}>

  <div style={{

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: '16px',

  }}>

    <div>

      <h2 style={{

        fontSize: '13px', fontWeight: 600,

        color: 'var(--text-1)', margin: '0 0 2px 0',

        textTransform: 'uppercase', letterSpacing: '0.05em',

      }}>

        Lane Forecast

      </h2>

      <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: 0 }}>

        Prophet 24-hour traffic prediction

      </p>

    </div>



    {/* Lane selector dropdown */}

    <select

      value={selectedLaneId ?? ''}

      onChange={e => {

        const lane = tree.areas

          .flatMap(a => a.lanes)

          .find(l => l.id === e.target.value)

        setSelectedLaneId(e.target.value || null)

        setSelectedLaneName(lane?.name ?? '')

      }}

      style={{

        background:   'var(--surface-2)',

        border:       '1px solid var(--border)',

        borderRadius: '6px',

        padding:      '6px 10px',

        color:        'var(--text-1)',

        fontSize:     '12px',

        cursor:       'pointer',

        outline:      'none',

      }}

    >

      <option value=''>Select a lane</option>

      {(tree?.areas ?? []).flatMap(area =>

        area.lanes.map(lane => (

          <option key={lane.id} value={lane.id}>

            {area.name} — {lane.name}

          </option>

        ))

      )}

    </select>

  </div>



  {selectedLaneId ? (

    <ForecastChart

      laneId={selectedLaneId}

      laneName={selectedLaneName}

    />

  ) : (

    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>

      Select a lane above to view its forecast.

    </p>

  )}

</div>

    </div>
  )

}

export default StatusGridPage