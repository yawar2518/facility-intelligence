import ForecastChart from '../ForecastChart'

// On mobile the panel goes full-width instead of the fixed 460px drawer.
const PANEL_STYLES = `
  .lfp-panel {
    width: 460px;
  }
  @media (max-width: 768px) {
    .lfp-panel {
      width: 100% !important;
      max-width: 100vw !important;
      top: 52px !important;
      height: calc(100% - 52px) !important;
    }
  }
`

// Same slide-in drawer shell as DeviceDetailPanel — kept as a separate
// component (rather than reusing DeviceDetailPanel with an optional
// "lane mode") because what it's showing is conceptually different: a
// forecast belongs to the lane as a whole, not to any one device in it.
function LaneForecastPanel({ lane, onClose }) {
  if (!lane) return null

  return (
    <>
      <style>{PANEL_STYLES}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(33, 29, 23, 0.28)',
          animation: 'backdropIn 0.32s ease-out both',
        }}
      />

      {/* Panel */}
      <div className="lfp-panel" style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        background: '#f7f2e9',
        borderLeft: '1px solid rgba(33, 29, 23, 0.14)',
        boxShadow: '-16px 0 40px rgba(33, 29, 23, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'drawerIn 0.32s cubic-bezier(0.2, 0.7, 0.2, 1) both',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '22px',
          borderBottom: '1px solid var(--border-2)',
        }}>
          <div>
            <div style={{
              fontFamily: 'Archivo, sans-serif',
              fontSize: '17px',
              fontWeight: 700,
            }}>
              {lane.name}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: 'var(--text-3)',
              marginTop: '4px',
            }}>
              {lane.code}
              {lane.area_name && ` · ${lane.area_name}`}
            </div>
          </div>
          <div
            onClick={onClose}
            style={{
              fontSize: '16px',
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)' }}
          >
            ✕
          </div>
        </div>

        <div style={{ padding: '22px', overflow: 'auto', flex: 1 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            letterSpacing: '0.14em',
            color: 'var(--text-3)',
            marginBottom: '14px',
          }}>
            TRAFFIC FORECAST
          </div>
          <ForecastChart laneId={lane.id} laneName={lane.name} />
        </div>
      </div>
    </>
  )
}

export default LaneForecastPanel