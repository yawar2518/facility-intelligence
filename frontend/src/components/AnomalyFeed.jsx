import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { acknowledgeAnomaly } from '../api/monitoring'

// Severity config — icon, color, label
const SEVERITY = {
  CRITICAL: { icon: AlertCircle,   color: 'var(--offline)',  label: 'Critical' },
  HIGH:     { icon: AlertTriangle, color: 'var(--degraded)', label: 'High'     },
  MEDIUM:   { icon: AlertTriangle, color: '#B45309',         label: 'Medium'   },
  LOW:      { icon: Info,          color: 'var(--text-2)',   label: 'Low'      },
}

const TYPE_LABEL = {
  TRAFFIC_SPIKE:   'Traffic Spike',
  TRAFFIC_DROP:    'Traffic Drop',
  DEVICE_FLAPPING: 'Device Flapping',
  ERROR_RATE:      'Error Rate',
}

function AnomalyRow({ anomaly, onAcknowledge }) {
  const cfg      = SEVERITY[anomaly.severity] ?? SEVERITY.LOW
  const Icon     = cfg.icon
  const time     = new Date(anomaly.detected_at).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  })
  const date     = new Date(anomaly.detected_at).toLocaleDateString([], {
    month: 'short', day: 'numeric'
  })

  return (
    <div style={{
      display:        'flex',
      gap:            '12px',
      padding:        '12px 0',
      borderBottom:   '1px solid var(--border)',
      opacity:        anomaly.is_acknowledged ? 0.45 : 1,
    }}>
      {/* Severity icon */}
      <div style={{ paddingTop: '2px', flexShrink: 0 }}>
        <Icon size={16} color={cfg.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '8px',
          marginBottom: '4px',
        }}>
          {/* Type badge */}
          <span style={{
            fontSize:        '11px',
            fontWeight:      600,
            color:           cfg.color,
            textTransform:   'uppercase',
            letterSpacing:   '0.05em',
          }}>
            {TYPE_LABEL[anomaly.anomaly_type] ?? anomaly.anomaly_type}
          </span>

          {/* Sigma score */}
          <span style={{
            fontSize:    '11px',
            color:       'var(--text-2)',
            fontFamily:  'var(--font-mono)',
          }}>
            {Math.abs(anomaly.sigma_score).toFixed(1)}σ
          </span>

          {/* Facility + lane */}
          <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>
            {anomaly.facility_code} / {anomaly.lane_name ?? '—'}
          </span>
        </div>

        {/* Explanation */}
        <p style={{
          fontSize: '12px',
          color:    'var(--text-2)',
          margin:   0,
          lineHeight: 1.5,
        }}>
          {anomaly.explanation}
        </p>
      </div>

      {/* Right side — time + acknowledge */}
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'flex-end',
        gap:            '6px',
        flexShrink:     0,
      }}>
        <span style={{
          fontSize:   '11px',
          color:      'var(--text-3)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
        }}>
          {date} {time}
        </span>

        {!anomaly.is_acknowledged && (
          <button
            onClick={() => onAcknowledge(anomaly.id)}
            style={{
              fontSize:     '11px',
              color:        'var(--text-2)',
              background:   'none',
              border:       '1px solid var(--border-2)',
              borderRadius: '4px',
              padding:      '2px 8px',
              cursor:       'pointer',
            }}
          >
            Ack
          </button>
        )}

        {anomaly.is_acknowledged && (
          <CheckCircle size={12} color='var(--text-3)' />
        )}
      </div>
    </div>
  )
}

export default function AnomalyFeed({ anomalies, loading, error, onRefetc, limit = 10  }) {

  async function handleAcknowledge(id) {
    try {
      await acknowledgeAnomaly(id)
      onRefetch()
    } catch (err) {
      console.error('Failed to acknowledge:', err)
    }
  }

  if (loading) return (
    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
      Loading anomalies...
    </p>
  )

  if (error) return (
    <p style={{ fontSize: '13px', color: 'var(--offline)' }}>{error}</p>
  )

  if (anomalies.length === 0) return (
    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
      No anomalies detected.
    </p>
  )

  return (
    <div>
      {(limit ? anomalies.slice(0, limit) : anomalies).map(a => (
        <AnomalyRow
          key={a.id}
          anomaly={a}
          onAcknowledge={handleAcknowledge}
        />
      ))}
    </div>
  )
}