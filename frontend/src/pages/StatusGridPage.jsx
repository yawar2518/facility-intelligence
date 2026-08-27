import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityDeviceTree } from '../hooks/useFacilityDeviceTree'
import { useLiveEventListener } from '../hooks/useLiveUpdates'
import AreaPanel from '../components/StatusGrid/AreaPanel'
import DeviceDetailPanel from '../components/StatusGrid/DeviceDetailPanel'
import LaneForecastPanel from '../components/StatusGrid/LaneForecastPanel'
import Dropdown from '../components/Dropdown'

const MOBILE_STYLES = `
  @media (max-width: 768px) {
    .sg-header {
      padding: 10px 16px !important;
      flex-wrap: wrap;
      gap: 8px;
    }
    .sg-header-right {
      gap: 8px !important;
    }
    .sg-header-clock {
      display: none !important;
    }
    .sg-content {
      padding: 16px 16px 60px !important;
    }
    .sg-summary-bar {
      flex-wrap: wrap !important;
      gap: 12px !important;
      padding: 14px 16px !important;
    }
    .sg-summary-divider {
      display: none !important;
    }
    .sg-summary-stats {
      width: 100% !important;
      margin-left: 0 !important;
      flex-wrap: wrap;
      gap: 12px !important;
    }
  }
`

// A shimmering placeholder block — the same skeletonPulse animation
// used across the rest of the app in place of bare "Loading..." text.
function Skeleton({ width, height = '1em', style }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'inline-block', width, height, ...style }}
    />
  )
}

// Mirrors DeviceTile's exact layout so the real grid doesn't jump in
// size once it replaces this.
function SkeletonDeviceTile() {
  return (
    <div style={{
      width: '158px',
      background: 'var(--surface-white)',
      border: '1px solid rgba(33, 29, 23, 0.1)',
      borderLeft: '3px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '11px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <Skeleton width="52px" height="12px" />
        <Skeleton width="7px" height="7px" style={{ borderRadius: '50%' }} />
      </div>
      <Skeleton width="72px" height="10.5px" style={{ marginBottom: '7px' }} />
      <Skeleton width="50px" height="11px" />
    </div>
  )
}

function SkeletonLaneRow({ tileCount, isLast }) {
  return (
    <div style={{ marginBottom: isLast ? 0 : '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
        <Skeleton width="40px" height="10px" />
        <Skeleton width="92px" height="12.5px" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {Array.from({ length: tileCount }, (_, i) => <SkeletonDeviceTile key={i} />)}
      </div>
    </div>
  )
}

// Mirrors AreaPanel's header + lane layout.
function SkeletonAreaPanel({ delay, lanes }) {
  return (
    <div className="fade-in" style={{
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '14px',
      background: 'var(--surface)',
      animationDelay: `${delay}s`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 20px', borderBottom: '1px solid var(--border-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width="11px" height="11px" />
          <div>
            <Skeleton width="120px" height="15px" style={{ marginBottom: '7px' }} />
            <Skeleton width="94px" height="10px" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Skeleton width="34px" height="14px" />
          <Skeleton width="50px" height="10px" />
        </div>
      </div>
      <div style={{ padding: '16px 20px 20px' }}>
        {lanes.map((tileCount, i) => (
          <SkeletonLaneRow key={i} tileCount={tileCount} isLast={i === lanes.length - 1} />
        ))}
      </div>
    </div>
  )
}

// Mirrors the Facility Summary Bar.
function SkeletonSummaryBar() {
  return (
    <div className="fade-in" style={{
      display: 'flex', alignItems: 'center', gap: '22px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '16px 20px', marginBottom: '22px',
    }}>
      <div>
        <Skeleton width="150px" height="18px" style={{ marginBottom: '7px' }} />
        <Skeleton width="190px" height="10px" />
      </div>
      <div style={{ width: '1px', height: '34px', background: 'var(--border)' }} />
      <div>
        <Skeleton width="46px" height="20px" style={{ marginBottom: '5px' }} />
        <Skeleton width="36px" height="10px" />
      </div>
      <div style={{ display: 'flex', gap: '20px', marginLeft: 'auto' }}>
        <Skeleton width="66px" height="12px" />
        <Skeleton width="66px" height="12px" />
        <Skeleton width="90px" height="12px" />
      </div>
    </div>
  )
}

function StatusGridPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedFacilityId, setSelectedFacilityId] = useState(
    searchParams.get('facility') || null
  )
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDevice, setSelectedDevice] = useState(null)
  // Which lane's forecast panel is open — a forecast is per-lane, not
  // per-device, so it's a separate selection from selectedDevice above
  // rather than something shown inside every device in the lane.
  const [selectedLaneForecast, setSelectedLaneForecast] = useState(null)

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

  const handleFacilityChange = (facilityId) => {
    setSelectedFacilityId(facilityId)
    setSearchParams({ facility: facilityId })
    setSelectedDevice(null)
  }

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Derived live from tree.areas on every render — not read from the tree's
  // top-level online/offline/degraded/health_score fields, which are only
  // a snapshot from whenever the tree was first fetched and never move as
  // live device-status events patch individual devices in place.
  const allDevices = tree?.areas.flatMap(area => area.lanes.flatMap(lane => lane.devices)) || []
  const onlineCount   = allDevices.filter(d => d.status === 'ONLINE').length
  const degradedCount = allDevices.filter(d => d.status === 'DEGRADED').length
  const offlineCount  = allDevices.filter(d => d.status === 'OFFLINE').length
  const healthScore   = allDevices.length > 0
    ? Math.round(((allDevices.length - offlineCount) / allDevices.length) * 1000) / 10
    : 100

  return (
    <>
      <style>{MOBILE_STYLES}</style>

      {/* Header Bar */}
      <div className="sg-header" style={{
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
          whiteSpace: 'nowrap',
        }}>
          STATUS GRID <span style={{ color: 'var(--text-light)' }}>/</span> LIVE
        </div>

        <div className="sg-header-right" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          {/* Facility Selector */}
          {facilitiesLoading ? (
            <span style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--surface)', border: '1px solid var(--border-strong)',
              borderRadius: '7px', padding: '7px 12px',
            }}>
              <Skeleton width="140px" height="13px" />
            </span>
          ) : (
            <Dropdown
              value={selectedFacilityId || ''}
              onChange={handleFacilityChange}
              options={facilities.map(f => ({ value: f.id, label: `${f.name} · ${f.code}` }))}
              placeholder="Select Facility"
              width="220px"
            />
          )}

          {/* Clock — hidden on mobile via .sg-header-clock */}
          <span className="sg-header-clock" style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: 'var(--text-2)',
            whiteSpace: 'nowrap',
          }}>
            {formatTime(currentTime)} PKT
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="fade-in sg-content" style={{
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

        {/* Loading — mirrors the real summary bar + area panels below
            instead of a bare centered "Loading..." string, so the page
            never goes blank while the tree fetches. */}
        {treeLoading && (
          <>
            <SkeletonSummaryBar />
            <SkeletonAreaPanel delay={0}    lanes={[4, 3]} />
            <SkeletonAreaPanel delay={0.08} lanes={[3]} />
          </>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: '12px', color: 'var(--offline)' }}>{error}</p>
        )}

        {/* Facility Summary Bar */}
        {tree && !treeLoading && (
          <>
            <div className="sg-summary-bar" style={{
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
              {/* Facility name + address */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {tree.facility_name}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {tree.facility_code} · {tree.address || 'Location'}
                </div>
              </div>

              {/* Divider — hidden on mobile */}
              <div className="sg-summary-divider" style={{
                width: '1px',
                height: '34px',
                background: 'var(--border)',
                flex: 'none',
              }}/>

              {/* Health score */}
              <div style={{ flex: 'none' }}>
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

              {/* Online / degraded / offline counts + areas/lanes */}
              <div className="sg-summary-stats" style={{
                display: 'flex',
                gap: '20px',
                marginLeft: 'auto',
                fontSize: '12px',
                flexWrap: 'wrap',
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-mid)',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{
                    width: '8px', height: '8px',
                    borderRadius: '50%',
                    background: 'var(--online)',
                    flex: 'none',
                  }}/>
                  <b style={{ fontWeight: 600 }}>{onlineCount}</b> online
                </span>

                {degradedCount > 0 && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-mid)',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      background: 'var(--degraded)',
                      animation: 'pulseA 2.4s infinite',
                      flex: 'none',
                    }}/>
                    <b style={{ fontWeight: 600 }}>{degradedCount}</b> degraded
                  </span>
                )}

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: offlineCount > 0 ? 'var(--text-mid)' : 'var(--text-3)',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{
                    width: '8px', height: '8px',
                    borderRadius: '50%',
                    background: offlineCount > 0 ? 'var(--offline)' : 'var(--text-light)',
                    flex: 'none',
                  }}/>
                  <b style={{ fontWeight: 600 }}>{offlineCount}</b> offline
                </span>

                <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
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
                  onForecastClick={setSelectedLaneForecast}
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

      {/* Lane Forecast Panel — one per lane, opened from the lane
          header, instead of duplicating the same chart inside every
          device in that lane. */}
      {selectedLaneForecast && (
        <LaneForecastPanel
          lane={selectedLaneForecast}
          onClose={() => setSelectedLaneForecast(null)}
        />
      )}

    </>
  )
}

export default StatusGridPage