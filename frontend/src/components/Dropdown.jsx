import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'

// How long the closing transition runs — the menu stays mounted for
// exactly this long after `open` goes false so it can animate out
// instead of just vanishing.
const CLOSE_ANIMATION_MS = 160

// A custom-styled, animated replacement for a bare `<select>` — the
// native control can't be styled (no way to theme its option list) and
// has no open/close transition at all. Used anywhere the app needs a
// dropdown: pass `options` as [{ value, label }], `value`/`onChange`
// like a controlled input, and an optional fixed `width` so the
// trigger doesn't jitter as the selected label changes length.
export default function Dropdown({ value, onChange, options, placeholder = 'Select…', width, triggerStyle }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef(null)
  const closeTimerRef = useRef(null)

  const selected = options.find(o => o.value === value)

  function openMenu() {
    clearTimeout(closeTimerRef.current)
    setMounted(true)
    setOpen(true)
  }

  function closeMenu() {
    setOpen(false)
  }

  // Keep the menu mounted a moment after closing so its exit transition
  // can actually play, instead of the DOM node disappearing instantly.
  // (Mounting happens synchronously in openMenu() above, not here —
  // only the delayed unmount belongs in an effect.)
  useEffect(() => {
    if (open || !mounted) return
    closeTimerRef.current = setTimeout(() => setMounted(false), CLOSE_ANIMATION_MS)
    return () => clearTimeout(closeTimerRef.current)
  }, [open, mounted])

  // Close on outside click or Escape — standard dropdown behavior the
  // native <select> gave us for free.
  useEffect(() => {
    if (!open) return

    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeMenu()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeMenu()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', width }}>
      <button
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          background: 'var(--surface)',
          border: `1px solid ${open ? 'var(--text-1)' : 'var(--border-strong)'}`,
          borderRadius: '7px',
          padding: '7px 11px',
          cursor: 'pointer',
          color: 'var(--text-1)',
          textAlign: 'left',
          transition: 'border-color 150ms ease-out',
          ...triggerStyle,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={13}
          color="var(--accent)"
          style={{
            flex: 'none',
            transition: 'transform 180ms cubic-bezier(.2,.9,.3,1)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {mounted && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: '100%',
          width: 'max-content',
          maxWidth: '320px',
          maxHeight: '280px',
          overflowY: 'auto',
          background: 'var(--surface-white)',
          border: '1px solid var(--border-strong)',
          borderRadius: '10px',
          boxShadow: '0 12px 30px rgba(33, 29, 23, 0.16)',
          padding: '6px',
          zIndex: 40,
          transformOrigin: 'top',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
          transition: 'opacity 160ms ease-out, transform 160ms cubic-bezier(.2,.9,.3,1)',
        }}>
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); closeMenu() }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? 'rgba(33, 29, 23, 0.06)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 120ms ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(33, 29, 23, 0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(33, 29, 23, 0.06)' : 'transparent' }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={13} color="var(--accent)" style={{ flex: 'none' }} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
