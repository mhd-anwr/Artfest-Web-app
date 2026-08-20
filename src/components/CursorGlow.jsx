import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function CursorGlow() {
  const location = useLocation()
  const ref = useRef(null)
  const isHome = location.pathname === '/'

  useEffect(() => {
    if (!isHome) return
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (el) {
          el.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`
        }
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [isHome])

  if (!isHome) return null

  return (
    <div className="cursor-glow-layer pointer-events-none" aria-hidden="true">
      <div ref={ref} className="cursor-glow" />
    </div>
  )
}