import { useState } from 'react'
import useAnomalies from '../hooks/useAnomalies'
import AnomalyFeed from '../components/AnomalyFeed'

const SEVERITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const TYPE_OPTIONS = [
  { value: '',               label: 'All Types'       },
  { value: 'TRAFFIC_SPIKE',  label: 'Traffic Spike'   },
  { value: 'TRAFFIC_DROP',   label: 'Traffic Drop'    },
  { value: 'DEVICE_FLAPPING',label: 'Device Flapping' },
  { value: 'ERROR_RATE',     label: 'Error Rate'      },
]

const filterStyle = {
  background:   'var(--surface-2)',
  border:       '1px solid var(--border)',
  borderRadius: '6px',
  padding:      '6px 10px',
  color:        'var(--text-1)',
  fontSize:     '12px',
  cursor:       'pointer',
  outline:      'none',
}

export default function AnomaliesPage() {
  const [severity,       setSeverity]       = useState('')
  const [anomalyType,    setAnomalyType]    = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  const filters = {}
  if (severity)    filters.severity     = severity
  if (anomalyType) filters.anomaly_type = anomalyType
  if (!showAcknowledged) filters.is_acknowledged = false

  const { anomalies, loading, error, refetch } = useAnomalies(filters)

  return (
    <div>
      {/* Page header */}
      <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px 0' }}>
        Anomalies
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 24px 0' }}>
        Detected traffic and device anomalies across all facilities
      </p>

      {/* Filters row */}
      <div style={{
        display:        'flex',
        gap:            '10px',
        alignItems:     'center',
        marginBottom:   '20px',
        flexWrap:       'wrap',
      }}>
        {/* Severity filter */}
        <select
          value={severity}
          onChange={e => setSeverity(e.target.value)}
          style={filterStyle}
        >
          <option value=''>All Severities</option>
          {SEVERITY_OPTIONS.filter(s => s).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={anomalyType}
          onChange={e => setAnomalyType(e.target.value)}
          style={filterStyle}
        >
          {TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Acknowledged toggle */}
        <label style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '6px',
          fontSize:   '12px',
          color:      'var(--text-2)',
          cursor:     'pointer',
        }}>
          <input
            type='checkbox'
            checked={showAcknowledged}
            onChange={e => setShowAcknowledged(e.target.checked)}
          />
          Show acknowledged
        </label>

        {/* Count */}
        <span style={{ fontSize: '12px', color: 'var(--text-2)', marginLeft: 'auto' }}>
          {loading ? '—' : `${anomalies.length} anomalies`}
        </span>
      </div>

      {/* Feed */}
      <div style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: '8px',
        padding:      '20px',
      }}>
        <AnomalyFeed
          anomalies={anomalies}
          loading={loading}
          error={error}
          onRefetch={refetch}
        />
      </div>
    </div>
  )
}