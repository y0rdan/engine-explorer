import { useEffect, useState } from 'react'

function motionQuery(): MediaQueryList | null {
  if (typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(prefers-reduced-motion: reduce)')
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => motionQuery()?.matches ?? false)

  useEffect(() => {
    const media = motionQuery()
    if (media === null) return
    const onChange = () => {
      setReduced(media.matches)
    }
    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [])

  return reduced
}
