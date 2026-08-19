import { useLiveUpdates } from '../hooks/useLiveUpdates'
import Toast from './Toast'

// Rendered once in Layout so every page gets the same toast stream,
// positioned consistently, no matter which route is active.
function GlobalToasts() {
  const { toasts, dismissToast } = useLiveUpdates()

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            bottom: `${24 + index * 80}px`,
            right: '24px',
            zIndex: 9999,
            transition: 'bottom 250ms ease',
          }}
        >
          <Toast
            title={toast.title}
            statusText={toast.statusText}
            detail={toast.detail}
            type={toast.type}
            onClose={() => dismissToast(toast.id)}
          />
        </div>
      ))}
    </>
  )
}

export default GlobalToasts
