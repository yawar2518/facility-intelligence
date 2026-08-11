function FacilityCard({ facility }) {
  const health = facility.health

  const healthColor = health.health_score >= 90
    ? 'var(--online)'
    : health.health_score >= 70
    ? 'var(--degraded)'
    : 'var(--offline)'

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px 20px',
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >

      {/* Top row — name + health score inline */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
            {facility.name}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
            {facility.code} · {health.total_devices} devices
          </p>
        </div>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: healthColor,
          background: `${healthColor}15`,
          padding: '2px 8px',
          borderRadius: '4px',
        }}>
          {health.health_score}%
        </span>
      </div>

      {/* Thin progress bar */}
      <div style={{
        height: '2px',
        background: 'var(--border)',
        borderRadius: '2px',
        marginBottom: '14px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${health.health_score}%`,
          background: healthColor,
          borderRadius: '2px',
        }}/>
      </div>

      {/* Stats row — inline, not boxed */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {[
          { label: 'Online', value: health.online, color: '#22C55E' },
          { label: 'Degraded', value: health.degraded, color: '#F59E0B' },
          { label: 'Offline', value: health.offline, color: '#EF4444' },
          { label: 'Unknown', value: health.unknown, color: '#444' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p style={{ fontSize: '16px', fontWeight: 600, color, lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>
              {label}
            </p>
          </div>
        ))}
      </div>

    </div>
  )
}

export default FacilityCard