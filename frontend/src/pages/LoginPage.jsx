import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { login } from '../api/monitoring'
import { useCountUp } from '../hooks/useCountUp'

// A decorative "operations wall" — the same status-tile language as the
// Status Grid page, purely atmospheric here (not real device data). A
// couple of tiles run amber/red so it reads as a living fleet, not a
// static swatch.
const WALL_SIZE = 28
const WALL_FAULTS = { 5: 'degraded', 12: 'offline', 19: 'degraded', 23: 'offline' }
const TILE_COLOR = { online: '#1f9e7a', degraded: '#c2851a', offline: '#cc3b30' }

const GLOBAL_LABEL = {
  operational: 'All systems operational',
  limited:     'Minor disruptions reported',
  disrupted:   'Active service disruption',
}

function OpsWall() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '8px',
      width: '100%',
      maxWidth: '260px',
    }}>
      {Array.from({ length: WALL_SIZE }, (_, i) => {
        const state = WALL_FAULTS[i] || 'online'
        return (
          <span
            key={i}
            className="breathe"
            style={{
              aspectRatio: '1',
              borderRadius: '4px',
              background: TILE_COLOR[state],
              animationDelay: `${(i % 9) * 0.22}s`,
              animationDuration: `${3 + (i % 4) * 0.4}s`,
            }}
          />
        )
      })}
    </div>
  )
}

function LiveStat({ value, label }) {
  return (
    <div>
      <div style={{
        fontFamily: 'Archivo, sans-serif',
        fontWeight: 800,
        fontSize: '22px',
        color: 'var(--bg)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9.5px',
        letterSpacing: '0.1em',
        color: 'rgba(242, 236, 226, 0.5)',
        marginTop: '5px',
      }}>
        {label}
      </div>
    </div>
  )
}

// A field with an icon, a label that floats up out of the way once
// it's focused or filled, and a focus glow — replaces the plain
// bordered `<input>` the page used to have.
function AuthField({ icon: Icon, label, type, value, onChange, autoFocus, endAdornment }) {
  const [focused, setFocused] = useState(false)
  // The browser doesn't fire onChange when it autofills a field, so
  // `value` alone can't be trusted to know the label should float up —
  // this catches Chrome/Safari's autofill via the CSS-animation trick
  // below (`.auth-input:-webkit-autofill` triggers `onAutoFillStart`).
  const [autofilled, setAutofilled] = useState(false)
  const active = focused || autofilled || value.length > 0

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'var(--surface-white)',
      border: `1.5px solid ${focused ? 'var(--text-1)' : 'var(--border-strong)'}`,
      borderRadius: '10px',
      padding: '0 13px',
      transition: 'border-color 180ms ease-out, box-shadow 180ms ease-out',
      boxShadow: focused ? '0 0 0 4px rgba(33, 29, 23, 0.07)' : '0 0 0 0 rgba(33, 29, 23, 0)',
    }}>
      <Icon size={15} color={focused ? 'var(--text-1)' : 'var(--text-3)'} style={{ flex: 'none', transition: 'color 180ms ease-out' }} />

      <div style={{ position: 'relative', flex: 1 }}>
        <label style={{
          position: 'absolute',
          left: 0,
          top: active ? '6px' : '50%',
          transform: active ? 'translateY(0) scale(0.76)' : 'translateY(-50%) scale(1)',
          transformOrigin: 'left center',
          fontSize: '13.5px',
          color: focused ? 'var(--text-1)' : 'var(--text-3)',
          pointerEvents: 'none',
          transition: 'top 180ms cubic-bezier(.2,.9,.3,1), transform 180ms cubic-bezier(.2,.9,.3,1), color 180ms ease-out',
        }}>
          {label}
        </label>
        <input
          className="auth-input"
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onAnimationStart={(e) => {
            if (e.animationName === 'onAutoFillStart') setAutofilled(true)
            if (e.animationName === 'onAutoFillCancel') setAutofilled(false)
          }}
          autoFocus={autoFocus}
          required
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '13.5px',
            color: 'var(--text-1)',
            padding: active ? '20px 0 7px' : '13px 0',
            transition: 'padding 180ms cubic-bezier(.2,.9,.3,1)',
          }}
        />
      </div>

      {endAdornment}
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [shakeKey, setShakeKey]         = useState(0)
  const navigate = useNavigate()

  // Pulled from the public, unauthenticated status endpoint — real
  // numbers, not placeholders, animating in the moment they arrive.
  const [liveStats, setLiveStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/public-status/?format=json')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setLiveStats(data) })
      .catch(() => { /* the login page still works without this */ })
    return () => { cancelled = true }
  }, [])

  const facilityCount = liveStats?.facilities?.length ?? 0
  const avgUptime = liveStats?.facilities?.length
    ? liveStats.facilities.reduce((s, f) => s + (f.period_uptime_pct ?? 100), 0) / liveStats.facilities.length
    : 0

  const facilityCountDisplay = Math.round(useCountUp(facilityCount, 900))
  const avgUptimeDisplay     = useCountUp(avgUptime, 900).toFixed(1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await login(username, password)
      localStorage.setItem('access_token', response.data.access)
      localStorage.setItem('refresh_token', response.data.refresh)
      onLogin()
      navigate('/')
    } catch {
      setError('Invalid username or password')
      setShakeKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @media (max-width: 860px) {
          .login-brand-panel { display: none !important; }
        }

        /* Neutralize the browser's own autofill background (Chrome's
           pale yellow, or a saved-address blue) — background-color on
           an autofilled input can't be overridden directly, so this is
           the standard trick: paint over it with a huge inset shadow
           in the app's own field color instead, and push the
           background-color transition out far enough that it never
           visibly happens. Also drives the floating label up when a
           password manager fills the field, which fires no onChange.  */
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px var(--surface-white) inset;
          box-shadow: 0 0 0px 1000px var(--surface-white) inset;
          -webkit-text-fill-color: var(--text-1);
          caret-color: var(--text-1);
          transition: background-color 9999s ease-in-out 0s, color 9999s ease-in-out 0s;
          animation-name: onAutoFillStart;
        }
        .auth-input:not(:-webkit-autofill) {
          animation-name: onAutoFillCancel;
        }
        .auth-input:autofill {
          box-shadow: 0 0 0px 1000px var(--surface-white) inset;
        }
        @keyframes onAutoFillStart { from {} to {} }
        @keyframes onAutoFillCancel { from {} to {} }
      `}</style>

      {/* ── Left — brand + live pulse ── */}
      <div className="login-brand-panel fade-in" style={{
        flex: '1 1 46%',
        background: 'var(--text-1)',
        color: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '28px', letterSpacing: '-0.02em' }}>
            Argus
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9.5px',
            letterSpacing: '0.26em',
            color: 'rgba(242, 236, 226, 0.5)',
            marginTop: '6px',
          }}>
            PARKING&nbsp;INTELLIGENCE
          </div>
        </div>

        <div className="slide-up" style={{ animationDelay: '0.1s', maxWidth: '380px' }}>
          <h1 style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 800,
            fontSize: '30px',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            margin: '0 0 14px',
          }}>
            Every lane, gate, and kiosk — watched live.
          </h1>
          <p style={{
            fontSize: '13.5px',
            color: 'rgba(242, 236, 226, 0.62)',
            lineHeight: 1.6,
            margin: '0 0 32px',
          }}>
            Anomaly detection, predictive maintenance, and SLA reporting
            across every facility, updated in real time.
          </p>
          <OpsWall />
        </div>

        <div className="slide-up" style={{
          animationDelay: '0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '30px',
          paddingTop: '28px',
          borderTop: '1px solid rgba(242, 236, 226, 0.14)',
        }}>
          <LiveStat value={facilityCountDisplay} label="FACILITIES LIVE" />
          <LiveStat value={`${avgUptimeDisplay}%`} label="UPTIME · 7D AVG" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--online)', animation: 'pulseG 2.6s infinite', flex: 'none',
            }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(242, 236, 226, 0.6)' }}>
              {liveStats ? GLOBAL_LABEL[liveStats.global_status] : 'Connecting…'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right — sign in ── */}
      <div style={{
        flex: '1 1 54%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div
          key={shakeKey}
          className="fade-in"
          style={{
            width: '100%',
            maxWidth: '380px',
            animation: error ? 'shake 0.4s ease-in-out' : undefined,
          }}
        >
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 800,
              fontSize: '26px',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
              color: 'var(--text-1)',
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
              Enter your credentials to reach the operations console.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <AuthField
                icon={User}
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <AuthField
                icon={Lock}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      color: 'var(--text-3)',
                      flex: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </div>

            {error && (
              <p style={{
                fontSize: '12.5px',
                color: 'var(--critical)',
                margin: '0 0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--critical)', flex: 'none' }} />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'var(--text-1)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 16px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.65 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = '1' }}
            >
              {loading && (
                <span style={{
                  width: '13px', height: '13px', borderRadius: '50%',
                  border: '2px solid rgba(242, 236, 226, 0.35)',
                  borderTopColor: 'var(--bg)',
                  animation: 'spin 0.7s linear infinite',
                }} />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <a
            href="/public-status/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              border: '1px dashed var(--border-strong)',
              borderRadius: '8px',
              transition: 'background 150ms ease-out',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(33, 29, 23, 0.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--online)', flex: 'none' }} />
            <span style={{ fontSize: '11.5px', color: 'var(--text-2)' }}>
              Just checking facility status? Visit the public status page
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)' }}>↗</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
