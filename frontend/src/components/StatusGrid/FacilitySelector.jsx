function FacilitySelector({ facilities, selectedId, onSelect }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Facility</span>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-2)',
          color: 'var(--text-1)',
          borderRadius: '5px',
          padding: '6px 10px',
          fontSize: '12px',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <option value="" disabled>Select facility...</option>
        {facilities.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.code})
          </option>
        ))}
      </select>
    </div>
  )
}

export default FacilitySelector