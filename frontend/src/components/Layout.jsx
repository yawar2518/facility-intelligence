import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Grid2x2, Activity, LogOut, Eye,
  AlertTriangle, Bell, Wrench, Trophy, User,
} from 'lucide-react'
import { useCurrentUser } from '../hooks/useCurrentUser'

const navItems = [
  { to: '/',            label: 'Overview',      icon: LayoutDashboard, exact: true },
  { to: '/status',      label: 'Status Grid',   icon: Grid2x2 },
  { to: '/timeline',    label: 'Timeline',      icon: Activity },
  { to: '/anomalies',   label: 'Anomalies',     icon: AlertTriangle },
  { to: '/alert-logs',  label: 'Alert Logs',    icon: Bell },
  { to: '/maintenance', label: 'Maintenance',   icon: Wrench },
  { to: '/sla',         label: 'SLA Dashboard', icon: Trophy },
]

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

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>

        {/* Logo */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '5px',
            background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Eye size={12} color="#707070" strokeWidth={1.5}/>
          </div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
            Argus
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px' }}>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '5px', marginBottom: '1px',
                fontSize: '13px', fontWeight: 400,
                color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                background: isActive ? 'var(--surface-2)' : 'transparent',
                textDecoration: 'none', cursor: 'pointer',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={14} strokeWidth={1.5} color={isActive ? '#EDEDED' : '#444'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile */}
        {user && (
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={13} color="var(--text-2)" />
              <div>
                <div style={{ color: 'var(--text-1)', fontSize: '12px', fontWeight: 500 }}>
                  {user.username}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: '11px' }}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </div>
                {user.role !== 'ADMIN' && user.facilities?.length > 0 && (
                  <div style={{
                    color: 'var(--text-3)', fontSize: '10px',
                    fontFamily: 'JetBrains Mono, monospace', marginTop: '2px',
                  }}>
                    {user.facilities.map(f => f.code).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div style={{ padding: '6px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 10px', background: 'transparent', border: 'none',
              borderRadius: '5px', color: 'var(--text-3)', fontSize: '13px',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-2)'
              e.currentTarget.style.color = 'var(--text-2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-3)'
            }}
          >
            <LogOut size={14} strokeWidth={1.5} color="#555"/>
            Sign out
          </button>
        </div>

      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>

    </div>
  )
}

export default Layout