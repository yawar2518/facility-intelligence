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
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
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
            Timeline
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
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

      {/* Empty */}
      {!selectedFacilityId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            Select a facility to view events
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
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
      {error && <p style={{ fontSize: '12px', color: 'var(--offline)' }}>{error}</p>}

      {/* Table */}
      {changes.length > 0 && !loading && (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '140px 160px 200px 1fr 80px',
            gap: '0',
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
          }}>
            {['Time', 'Device', 'Transition', 'Reason', 'Duration'].map(col => (
              <span key={col} style={{
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--text-3)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}>
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {changes.map((change, i) => (
            <StatusChangeRow
              key={change.id}
              change={change}
              isLast={i === changes.length - 1}
            />
          ))}

        </div>
      )}

      {/* No results */}
      {selectedFacilityId && !loading && changes.length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            No events recorded yet
          </p>
        </div>
      )}

    </div>
  )
}

export default TimelinePage