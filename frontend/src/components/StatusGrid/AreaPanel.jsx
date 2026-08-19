import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import LaneRow from './LaneRow'

function AreaPanel({ area, onDeviceClick }) {
  const [isOpen, setIsOpen] = useState(true)
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)
  const mountedRef = useRef(false)

  useLayoutEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [area.lanes, isOpen])

  useEffect(() => {
    mountedRef.current = true
  }, [])

  const allDevices = area.lanes.flatMap(l => l.devices)
  const onlineCount = allDevices.filter(d => d.status === 'ONLINE').length
  const degradedCount = allDevices.filter(d => d.status === 'DEGRADED').length
  const offlineCount = allDevices.filter(d => d.status === 'OFFLINE').length

  const areaHealth = allDevices.length > 0
    ? Math.round((onlineCount / allDevices.length) * 100)
    : 100

  const hasIssues = offlineCount > 0 || degradedCount > 0
  const healthColor = areaHealth >= 95
    ? 'var(--online)'
    : areaHealth >= 70
    ? 'var(--degraded)'
    : 'var(--critical)'

  return (
    <div style={{
      border: hasIssues ? '1px solid rgba(194, 133, 26, 0.35)' : '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '14px',
      background: 'var(--surface)',
    }}>

      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '15px 20px',
          borderBottom: isOpen ? '1px solid var(--border-2)' : 'none',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            color: 'var(--accent)',
            fontSize: '11px',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            display: 'inline-block',
            transition: 'transform 150ms ease',
          }}>
            ▾
          </span>
          <div>
            <div style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 600,
              fontSize: '15px',
            }}>
              {area.name}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'var(--text-3)',
              marginTop: '1px',
            }}>
              {area.code} · {allDevices.length} devices
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <span style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            color: healthColor,
          }}>
            {areaHealth}%
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'var(--text-3)',
          }}>
            cap {area.capacity || 100}
          </span>
        </div>
      </button>

      {/* Content */}
      <div style={{
        maxHeight: isOpen ? `${contentHeight}px` : '0px',
        opacity: isOpen ? 1 : 0,
        overflow: 'hidden',
        transition: mountedRef.current
          ? 'max-height 280ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 200ms ease'
          : 'none',
      }}>
        <div ref={contentRef} style={{ padding: '16px 20px 20px' }}>
          {area.lanes.map((lane, i) => (
            <LaneRow
              key={lane.id}
              lane={lane}
              areaName={area.name}
              onDeviceClick={onDeviceClick}
              isLast={i === area.lanes.length - 1}
            />
          ))}
        </div>
      </div>

    </div>
  )
}

export default AreaPanel
