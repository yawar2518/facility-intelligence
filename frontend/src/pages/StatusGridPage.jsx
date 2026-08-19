import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityDeviceTree } from '../hooks/useFacilityDeviceTree'
import { useLiveEventListener } from '../hooks/useLiveUpdates'
import AreaPanel from '../components/StatusGrid/AreaPanel'
import DeviceDetailPanel from '../components/StatusGrid/DeviceDetailPanel'

function StatusGridPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedFacilityId, setSelectedFacilityId] = useState(
    searchParams.get('facility') || null
  )
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDevice, setSelectedDevice] = useState(null)

  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { tree, setTree, loading: treeLoading, error } = useFacilityDeviceTree(selectedFacilityId)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Set default facility if none selected
  useEffect(() => {
    if (!selectedFacilityId && facilities.length > 0 && !facilitiesLoading) {
      const firstId = facilities[0].id
      setSelectedFacilityId(firstId)
      setSearchParams({ facility: firstId })
    }
  }, [facilities, facilitiesLoading, selectedFacilityId, setSearchParams])

  // Live device-status events (from the shared connection in Layout) — only
  // apply the ones for the facility we're currently looking at. Toasts for
  // these same events are handled globally, not here.
  useLiveEventListener(useCallback((event) => {
    if (event.facility_id !== selectedFacilityId) return

    setTree((prevTree) => {
      if (!prevTree) return prevTree

      const updatedAreas = prevTree.areas.map((area) => ({
        ...area,
        lanes: area.lanes.map((lane) => ({
          ...lane,
          devices: lane.devices.map((device) =>
            device.id === event.device_id
              ? { ...device, status: event.new_status }
              : device
          ),
        })),
      }))

      return { ...prevTree, areas: updatedAreas }
    })

    setSelectedDevice((prev) => {
      if (!prev || prev.id !== event.device_id) return prev
      return { ...prev, status: event.new_status }
    })
  }, [selectedFacilityId, setTree]))

  const handleFacilityChange = (e) => {
    const facilityId = e.target.value
    setSelectedFacilityId(facilityId)
    setSearchParams({ facility: facilityId })
    setSelectedDevice(null)
  }

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const selectedFacility = facilities.find(f => f.id === selectedFacilityId)

  // Derived live from tree.areas on every render — not read from the tree's
  // top-level online/offline/degraded/health_score fields, which are only
  // a snapshot from whenever the tree was first fetched and never move as
  // live device-status events patch individual devices in place.
  const allDevices = tree?.areas.flatMap(area => area.lanes.flatMap(lane => lane.devices)) || []
  const onlineCount = allDevices.filter(d => d.status === 'ONLINE').length
  const degradedCount = allDevices.filter(d => d.status === 'DEGRADED').length
  const offlineCount = allDevices.filter(d => d.status === 'OFFLINE').length
  const healthScore = allDevices.length > 0
    ? Math.round(((allDevices.length - offlineCount) / allDevices.length) * 1000) / 10
    : 100

  return (
    <>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 34px',
        borderBottom: '1px solid var(--border)',
        flex: 'none',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'var(--text-4)',
        }}>
          STATUS GRID <span style={{ color: 'var(--text-light)' }}>/</span> LIVE
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          {/* Facility Selector */}
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '7px',
            padding: '6px 12px',
            cursor: 'pointer',
            position: 'relative',
          }}>
            {facilitiesLoading ? (
              'Loading...'
            ) : (
              <>
                <select
                  value={selectedFacilityId || ''}
                  onChange={handleFacilityChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} · {f.code}
                    </option>
                  ))}
                </select>
                {selectedFacility?.name || 'Select Facility'} · {selectedFacility?.code || ''}
                <span style={{ color: 'var(--accent)' }}>▾</span>
              </>
            )}
          </span>

          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: 'var(--text-2)',
          }}>
            {formatTime(currentTime)} PKT
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="fade-in" style={{
        flex: 1,
        overflow: 'auto',
        padding: '28px 34px 60px',
      }}>

        {/* Empty state */}
        {!selectedFacilityId && !facilitiesLoading && (
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

        {/* Facility Summary Bar */}
        {tree && !treeLoading && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '22px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '22px',
              animation: 'floatUp 0.4s ease-out both',
            }}>
              <div>
                <div style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                }}>
                  {tree.facility_name}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  marginTop: '2px',
                }}>
                  {tree.facility_code} · {tree.address || 'Location'}
                </div>
              </div>

              <div style={{
                width: '1px',
                height: '34px',
                background: 'var(--border)',
              }}/>

              <div>
                <div style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 800,
                  fontSize: '20px',
                  color: healthScore >= 95
                    ? 'var(--online)'
                    : healthScore >= 70
                    ? 'var(--degraded)'
                    : 'var(--critical)',
                }}>
                  {healthScore}%
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  marginTop: '2px',
                }}>
                  health
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '20px',
                marginLeft: 'auto',
                fontSize: '12px',
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-mid)',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--online)',
                  }}/>
                  <b style={{ fontWeight: 600 }}>{onlineCount}</b> online
                </span>

                {degradedCount > 0 && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-mid)',
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--degraded)',
                      animation: 'pulseA 2.4s infinite',
                    }}/>
                    <b style={{ fontWeight: 600 }}>{degradedCount}</b> degraded
                  </span>
                )}

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: offlineCount > 0 ? 'var(--text-mid)' : 'var(--text-3)',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: offlineCount > 0 ? 'var(--offline)' : 'var(--text-light)',
                  }}/>
                  <b style={{ fontWeight: 600 }}>{offlineCount}</b> offline
                </span>

                <span style={{ color: 'var(--text-3)' }}>
                  {tree.areas.length} areas · {tree.total_lanes || 0} lanes
                </span>
              </div>
            </div>

            {/* Area Panels */}
            {tree.areas.map((area, i) => (
              <div
                key={area.id}
                style={{
                  animation: `floatUp 0.4s ease-out ${0.08 + Math.min(i, 8) * 0.06}s both`,
                }}
              >
                <AreaPanel
                  area={area}
                  onDeviceClick={setSelectedDevice}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Device Detail Panel */}
      {selectedDevice && (
        <DeviceDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}

    </>
  )
}

export default StatusGridPage
