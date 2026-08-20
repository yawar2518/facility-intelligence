import { useEffect, useRef, useState } from 'react'

export function useCountUp(end, duration = 800, start = 0) {
  const [count, setCount] = useState(start)
  const prevEndRef = useRef(start)

  useEffect(() => {
    const from = prevEndRef.current
    prevEndRef.current = end

    if (end === from) {
      setCount(end)
      return
    }

    let startTime
    let rafId
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setCount(from + (end - from) * easeProgress)

      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [end, duration])

  return count
}
