import { useEffect, useRef, useState } from 'react'

function Toast({ title, statusText, detail, type = 'info', duration = 4000, onClose }) {
  const [isExiting, setIsExiting] = useState(false)

  // onClose is passed as a fresh inline function on every parent re-render
  // (the parent pages re-render every second on their clock tick). Reading
  // it through a ref keeps the dismiss timer keyed only to `duration`, so
  // it isn't cleared and restarted before it ever gets to fire.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onCloseRef.current(), 300) // Wait for fade-out to finish
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const accent = {
    info: 'var(--text-3)',
    success: 'var(--online)',
    warning: 'var(--degraded)',
    error: 'var(--offline)',
  }[type] || 'var(--text-3)'

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '13px 16px',
        minWidth: '270px',
        maxWidth: '380px',
        boxShadow: '0 8px 24px rgba(33, 29, 23, 0.14)',
        animation: isExiting ? 'toastFadeOut 0.3s ease-out forwards' : 'toastSlideIn 0.3s ease-out',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '11px',
      }}
    >
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: accent,
        marginTop: '5px',
        flex: 'none',
        animation: 'breathe 1.8s ease-in-out infinite',
      }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-1)',
          lineHeight: 1.4,
        }}>
          {title} <span style={{ color: accent, fontWeight: 700 }}>{statusText}</span>
        </div>
        {detail && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10.5px',
            color: 'var(--text-3)',
            marginTop: '4px',
          }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  )
}

export default Toast
