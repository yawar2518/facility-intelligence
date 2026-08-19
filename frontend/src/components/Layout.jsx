import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { LiveUpdatesProvider, useLiveUpdates } from '../hooks/useLiveUpdates'
import GlobalToasts from './GlobalToasts'

// Badge counts over 50 collapse to "50+" — the API itself only ever loads
// 50 anomalies per page, so an exact number past that point would be
// misleading (it'd silently stop climbing at 50 instead of showing the
// real count), and a three-digit badge doesn't fit the nav well anyway.
function formatBadgeCount(count) {
  return count > 50 ? '50+' : String(count)
}

// Both of these are separate components (not inline in Layout) because
// they need to consume LiveUpdatesContext, which Layout itself renders —
// a component can't read a context it's the one providing.
function StatusGridBadge({ isActive }) {
  const { offlineCount } = useLiveUpdates()
  if (!offlineCount) return null

  return (
    <span style={{
      marginLeft: 'auto',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '9.5px',
      fontWeight: 600,
      color: isActive ? '#ffb3ac' : 'var(--critical)',
      transition: 'color 150ms ease-out',
    }}>
      {offlineCount}↓
    </span>
  )
}

function AnomaliesBadge({ isActive }) {
  const { unacknowledgedAnomalyCount } = useLiveUpdates()
  if (!unacknowledgedAnomalyCount) return null

  return (
    <span style={{
      marginLeft: 'auto',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '9px',
      background: isActive ? 'rgba(255, 156, 148, 0.22)' : 'rgba(204, 59, 48, 0.14)',
      color: isActive ? '#ffb3ac' : 'var(--critical)',
      padding: '1px 6px',
      borderRadius: '8px',
      transition: 'all 150ms ease-out',
    }}>
      {formatBadgeCount(unacknowledgedAnomalyCount)}
    </span>
  )
}

const ROLE_LABELS = {
  ADMIN:            'Admin',
  REGIONAL_MANAGER: 'Regional Manager',
  FACILITY_OWNER:   'Facility Owner',
}

function Layout() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ''
  const facilityText = user?.role !== 'ADMIN' && user?.facilities?.length > 0
    ? user.facilities.map(f => f.code).join(', ')
    : 'all sites'

  return (
    <LiveUpdatesProvider>
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ===== SIDEBAR ===== */}
      <aside style={{
        width: '216px',
        flex: 'none',
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Logo */}
        <div style={{
          padding: '22px 20px 16px',
          borderBottom: '1px solid var(--border-2)',
        }}>
          <div style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 900,
            fontSize: '24px',
            letterSpacing: '-0.02em',
          }}>
            Argus
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8.5px',
            letterSpacing: '0.24em',
            color: 'var(--text-4)',
            marginTop: '5px',
          }}>
            PARKING&nbsp;INTELLIGENCE
          </div>
        </div>

        {/* WebSocket Status */}
        <div style={{
          padding: '11px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-2)',
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--online)',
            animation: 'pulseG 2.6s infinite',
            flex: 'none',
          }}/>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9.5px',
            letterSpacing: '0.12em',
            color: 'var(--text-2)',
          }}>
            LIVE&nbsp;·&nbsp;WEBSOCKET
          </span>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          padding: '16px 14px',
          overflow: 'auto',
        }}>
          {/* MONITOR Section */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8.5px',
            letterSpacing: '0.2em',
            color: 'var(--text-3)',
            padding: '0 8px 8px',
          }}>
            MONITOR
          </div>

          <NavLink to="/" end style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            marginBottom: isActive ? '3px' : '1px',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <span style={{
                fontSize: '12.5px',
                color: isActive ? 'var(--bg)' : 'var(--text-2)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 150ms ease-out',
              }}>
                Overview
              </span>
            )}
          </NavLink>

          <NavLink to="/status" style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            marginBottom: isActive ? '3px' : '1px',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <>
                <span style={{
                  fontSize: '12.5px',
                  whiteSpace: 'nowrap',
                  color: isActive ? 'var(--bg)' : 'var(--text-2)',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'color 150ms ease-out',
                }}>
                  Status Grid
                </span>
                <StatusGridBadge isActive={isActive} />
              </>
            )}
          </NavLink>

          <NavLink to="/timeline" style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            marginBottom: isActive ? '3px' : '1px',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <span style={{
                fontSize: '12.5px',
                color: isActive ? 'var(--bg)' : 'var(--text-2)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 150ms ease-out',
              }}>
                Timeline
              </span>
            )}
          </NavLink>

          {/* DETECT Section */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8.5px',
            letterSpacing: '0.2em',
            color: 'var(--text-3)',
            padding: '16px 8px 8px',
          }}>
            DETECT
          </div>

          <NavLink to="/anomalies" style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            marginBottom: isActive ? '3px' : '1px',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <>
                <span style={{
                  fontSize: '12.5px',
                  color: isActive ? 'var(--bg)' : 'var(--text-2)',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'color 150ms ease-out',
                }}>
                  Anomalies
                </span>
                <AnomaliesBadge isActive={isActive} />
              </>
            )}
          </NavLink>

          <NavLink to="/alert-logs" style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            marginBottom: isActive ? '3px' : '1px',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <span style={{
                fontSize: '12.5px',
                whiteSpace: 'nowrap',
                color: isActive ? 'var(--bg)' : 'var(--text-2)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 150ms ease-out',
              }}>
                Alert Logs
              </span>
            )}
          </NavLink>

          {/* PREDICT Section */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8.5px',
            letterSpacing: '0.2em',
            color: 'var(--text-3)',
            padding: '16px 8px 8px',
          }}>
            PREDICT
          </div>

          <NavLink to="/maintenance" style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            marginBottom: isActive ? '3px' : '1px',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <span style={{
                fontSize: '12.5px',
                color: isActive ? 'var(--bg)' : 'var(--text-2)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 150ms ease-out',
              }}>
                Maintenance
              </span>
            )}
          </NavLink>

          <NavLink to="/sla" style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            marginBottom: isActive ? '3px' : '1px',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <span style={{
                fontSize: '12.5px',
                whiteSpace: 'nowrap',
                color: isActive ? 'var(--bg)' : 'var(--text-2)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 150ms ease-out',
              }}>
                SLA Dashboard
              </span>
            )}
          </NavLink>

          {/* REPLAY Section */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8.5px',
            letterSpacing: '0.2em',
            color: 'var(--text-3)',
            padding: '16px 8px 8px',
          }}>
            REPLAY
          </div>

          <NavLink to="/playback" style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '7px',
            background: isActive ? 'var(--text-1)' : 'transparent',
            transition: 'all 150ms ease-out',
          })}>
            {({ isActive }) => (
              <span style={{
                fontSize: '12.5px',
                color: isActive ? 'var(--bg)' : 'var(--text-2)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 150ms ease-out',
              }}>
                Playback
              </span>
            )}
          </NavLink>
        </nav>

        {/* Public Status Page Link — served by the Django backend (a
            standalone, unauthenticated page, not a React route), reached
            through the same-origin `/public-status/` proxy so this link
            works identically in dev and behind a real reverse proxy.
            Deliberately not `/status` — that's the SPA's own Status
            Grid route. */}
        <a
          href="/public-status/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            margin: '0 14px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            border: '1px dashed rgba(33, 29, 23, 0.2)',
            borderRadius: '7px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(33, 29, 23, 0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--online)',
            flex: 'none',
          }}/>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-2)',
          }}>
            Public status page
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: '11px',
            color: 'var(--text-3)',
          }}>
            ↗
          </span>
        </a>

        {/* User Profile */}
        {user && (
          <div style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border-2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--text-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 800,
              fontSize: '12px',
              color: 'var(--bg)',
              flex: 'none',
            }}>
              {user.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div style={{
                fontSize: '11.5px',
                fontWeight: 500,
              }}>
                {user.username || 'A. Rehman'}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--text-4)',
              }}>
                {roleLabel} · {facilityText}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        position: 'relative',
      }}>
        <Outlet />
      </main>
    </div>
    <GlobalToasts />
    </LiveUpdatesProvider>
  )
}

export default Layout
