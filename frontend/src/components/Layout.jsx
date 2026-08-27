import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
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

// Injected once — responsive rules that can't be expressed in inline styles.
// Only touches elements scoped to .argus-layout so there's zero bleed risk.
const MOBILE_STYLES = `
  /* ── Mobile top bar ── */
  .argus-topbar {
    display: none;
  }

  /* ── Sidebar overlay backdrop ── */
  .argus-backdrop {
    display: none;
  }

  @media (max-width: 768px) {
    /* Show the top bar, hide nothing by default */
    .argus-topbar {
      display: flex;
    }

    /* Sidebar slides in from the left as a fixed overlay */
    .argus-sidebar {
      position: fixed !important;
      top: 0;
      left: 0;
      height: 100dvh !important;
      z-index: 300;
      transform: translateX(-100%);
      transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1),
                  box-shadow 220ms ease-out;
      box-shadow: none;
    }

    .argus-sidebar.is-open {
      transform: translateX(0);
      box-shadow: 8px 0 32px rgba(33, 29, 23, 0.18);
    }

    /* Semi-transparent backdrop behind the open sidebar */
    .argus-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 299;
      background: rgba(33, 29, 23, 0.4);
      animation: backdropIn 180ms ease-out;
    }

    /* Main content fills full width; top bar takes space */
    .argus-main {
      padding-top: 52px;
    }
  }
`

function Layout({ onLogout }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user }   = useCurrentUser()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close sidebar whenever the route changes (nav link was tapped)
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Prevent body scroll while sidebar overlay is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileOpen])

  const handleLogout = () => {
    if (onLogout) onLogout()
    navigate('/login')
  }

  const roleLabel   = user ? (ROLE_LABELS[user.role] ?? user.role) : ''
  const facilityText = user?.role !== 'ADMIN' && user?.facilities?.length > 0
    ? user.facilities.map(f => f.code).join(', ')
    : 'all sites'

  return (
    <LiveUpdatesProvider>
      {/* Inject responsive rules once */}
      <style>{MOBILE_STYLES}</style>

      <div className="argus-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ===== MOBILE TOP BAR ===== */}
        {/* Hidden on desktop via .argus-topbar { display: none } above 768px */}
        <div className="argus-topbar" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '52px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          zIndex: 200,
          alignItems: 'center',
          padding: '0 16px',
          gap: '12px',
        }}>
          {/* Hamburger */}
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsMobileOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'none',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-2)',
              cursor: 'pointer',
              flex: 'none',
            }}
          >
            <Menu size={20} />
          </button>

          {/* Wordmark centred in the bar */}
          <div style={{
            flex: 1,
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 900,
            fontSize: '20px',
            letterSpacing: '-0.02em',
            color: 'var(--text-1)',
          }}>
            Argus
          </div>
        </div>

        {/* ===== SIDEBAR BACKDROP (mobile only, when open) ===== */}
        {isMobileOpen && (
          <div
            className="argus-backdrop"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ===== SIDEBAR ===== */}
        <aside
          className={`argus-sidebar${isMobileOpen ? ' is-open' : ''}`}
          style={{
            width: '216px',
            flex: 'none',
            background: 'var(--surface-2)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            // Desktop: static in flow. Mobile: overridden to position:fixed by CSS class.
          }}
        >
          {/* Logo row — on mobile shows a close button on the right */}
          <div style={{
            padding: '22px 20px 16px',
            borderBottom: '1px solid var(--border-2)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <div>
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

            {/* Close button — only useful/visible when sidebar is overlaid on mobile */}
            {isMobileOpen && (
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '7px',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  flex: 'none',
                  marginTop: '2px',
                }}
              >
                <X size={16} />
              </button>
            )}
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

          {/* Public Status Page Link */}
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
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '11.5px',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.username || 'A. Rehman'}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'var(--text-4)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {roleLabel} · {facilityText}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                style={{
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--text-4)',
                  cursor: 'pointer',
                  transition: 'background 150ms ease-out, color 150ms ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(204, 59, 48, 0.1)'
                  e.currentTarget.style.color = 'var(--critical)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'var(--text-4)'
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main
          className="argus-main"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            position: 'relative',
          }}
        >
          <Outlet />
        </main>
      </div>

      <GlobalToasts />
    </LiveUpdatesProvider>
  )
}

export default Layout