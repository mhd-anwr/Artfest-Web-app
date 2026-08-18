import { useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen } from 'lucide-react'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/results', icon: BookOpen, label: 'Results' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  // DOM Refs for 60fps zero-rerender direct updates
  const vesselRef = useRef(null)
  const lensRef = useRef(null)
  const homeIconRef = useRef(null)
  const homeLabelRef = useRef(null)
  const resultsIconRef = useRef(null)
  const resultsLabelRef = useRef(null)

  const rafIdRef = useRef(null)
  const isDraggingRef = useRef(false)
  const [animClass, setAnimClass] = useState('')

  const dragRef = useRef({
    startX: 0,
    latestX: 0,
    originIndex: 0,
    trackWidth: 100,
    currentProgress: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  })

  // Hide the shared bottom nav inside Student, Judge and Admin panels
  const first = location.pathname.split('/')[1]
  const isPanel = first === 'admin' || first === 'student' || first === 'judges'
  if (isPanel) return null

  const activeIndex = tabs.findIndex(t => t.path === location.pathname)
  const effectiveIndex = activeIndex === -1 ? 0 : activeIndex

  // Direct 60fps DOM updater inside requestAnimationFrame
  const updateDOMTransforms = () => {
    rafIdRef.current = null
    if (!isDraggingRef.current || !lensRef.current) return

    const { startX, latestX, originIndex, trackWidth } = dragRef.current
    const deltaX = latestX - startX
    const deltaFraction = trackWidth > 0 ? deltaX / trackWidth : 0
    let rawProgress = (originIndex === 1 ? 1 : 0) + deltaFraction

    // Rubber-band resistance at boundaries
    if (originIndex === 0) {
      if (rawProgress < 0) rawProgress *= 0.15
      if (rawProgress > 1.08) rawProgress = 1.08
    } else {
      if (rawProgress > 1) rawProgress = 1 + (rawProgress - 1) * 0.15
      if (rawProgress < -0.08) rawProgress = -0.08
    }

    const clamped = Math.max(-0.08, Math.min(1.08, rawProgress))
    dragRef.current.currentProgress = clamped

    // Lightweight liquid deformation scale calculations
    const deltaFromOrigin = Math.abs(clamped - (originIndex === 1 ? 1 : 0))
    const stretchX = 1 + Math.min(deltaFromOrigin, 1) * 0.16
    const scaleY = 1 - Math.min(deltaFromOrigin, 1) * 0.08

    // GPU-accelerated transform update without layout reflow
    lensRef.current.style.transform = `translate3d(${clamped * 100}%, 0, 0) scale3d(${stretchX}, ${scaleY}, 1)`

    // Progressive label & icon highlight interpolation
    const homeWeight = 1 - Math.max(0, Math.min(1, clamped))
    const resultsWeight = Math.max(0, Math.min(1, clamped))

    if (homeIconRef.current && homeLabelRef.current) {
      homeIconRef.current.style.opacity = String(0.5 + homeWeight * 0.5)
      homeIconRef.current.style.transform = `scale(${1 + homeWeight * 0.1})`
      homeLabelRef.current.style.opacity = String(0.6 + homeWeight * 0.4)
    }

    if (resultsIconRef.current && resultsLabelRef.current) {
      resultsIconRef.current.style.opacity = String(0.5 + resultsWeight * 0.5)
      resultsIconRef.current.style.transform = `scale(${1 + resultsWeight * 0.1})`
      resultsLabelRef.current.style.opacity = String(0.6 + resultsWeight * 0.4)
    }
  }

  const handlePointerDown = (e) => {
    if (!vesselRef.current) return
    const rect = vesselRef.current.getBoundingClientRect()
    const trackWidth = rect.width / 2
    const startX = e.clientX
    const now = performance.now()

    dragRef.current = {
      startX,
      latestX: startX,
      originIndex: effectiveIndex,
      trackWidth,
      currentProgress: effectiveIndex === 1 ? 1 : 0,
      lastX: startX,
      lastTime: now,
      velocity: 0,
    }

    isDraggingRef.current = true
    if (lensRef.current) {
      lensRef.current.classList.add('is-dragging')
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (_) {}
  }

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return
    const currentX = e.clientX
    const now = performance.now()

    // Calculate instantaneous velocity
    const timeDiff = now - dragRef.current.lastTime
    if (timeDiff > 0) {
      dragRef.current.velocity = (currentX - dragRef.current.lastX) / timeDiff
    }
    dragRef.current.lastX = currentX
    dragRef.current.lastTime = now
    dragRef.current.latestX = currentX

    // Batch DOM updates in requestAnimationFrame
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(updateDOMTransforms)
    }
  }

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch (_) {}

    if (lensRef.current) {
      lensRef.current.classList.remove('is-dragging')
      lensRef.current.style.transform = ''
    }

    // Reset inline label/icon opacity & transform styles to let CSS classes govern resting state
    if (homeIconRef.current) { homeIconRef.current.style.opacity = ''; homeIconRef.current.style.transform = '' }
    if (homeLabelRef.current) { homeLabelRef.current.style.opacity = '' }
    if (resultsIconRef.current) { resultsIconRef.current.style.opacity = ''; resultsIconRef.current.style.transform = '' }
    if (resultsLabelRef.current) { resultsLabelRef.current.style.opacity = '' }

    const { originIndex, currentProgress, velocity } = dragRef.current
    let shouldCommit = false
    let targetIndex = originIndex

    if (originIndex === 0) {
      if (currentProgress > 0.35 || velocity > 0.3) {
        shouldCommit = true
        targetIndex = 1
      }
    } else {
      if (currentProgress < 0.65 || velocity < -0.3) {
        shouldCommit = true
        targetIndex = 0
      }
    }

    if (shouldCommit && targetIndex !== originIndex) {
      const cls = targetIndex === 1 ? 'slide-to-results' : 'slide-to-home'
      setAnimClass(cls)
      setTimeout(() => setAnimClass(''), 440)
      navigate(tabs[targetIndex].path)
    } else {
      const cls = originIndex === 1 ? 'slide-to-results' : 'slide-to-home'
      setAnimClass(cls)
      setTimeout(() => setAnimClass(''), 440)
    }
  }

  const handleTabClick = (e, targetIndex) => {
    if (targetIndex !== effectiveIndex) {
      const cls = targetIndex === 1 ? 'slide-to-results' : 'slide-to-home'
      setAnimClass(cls)
      setTimeout(() => setAnimClass(''), 440)
    }
  }

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[19rem] -translate-x-1/2 sm:hidden pb-[env(safe-area-inset-bottom,0px)] select-none">
      <div
        ref={vesselRef}
        className="liquid-glass-vessel relative flex items-center p-[0.35rem] overflow-hidden cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Equal Inset Lens Track Container */}
        <div className="liquid-glass-track">
          {effectiveIndex !== -1 && (
            <div
              ref={lensRef}
              className={`liquid-glass-lens ${animClass}`}
              style={{
                transform: effectiveIndex === 1 ? 'translate3d(100%, 0, 0)' : 'translate3d(0%, 0, 0)',
              }}
            />
          )}
        </div>

        {/* Seamless Navigation Items */}
        <div className="relative z-10 flex w-full items-center">
          {tabs.map(({ path, icon: Icon, label }, index) => {
            const active = location.pathname === path
            const isHome = index === 0

            return (
              <Link
                key={path}
                to={path}
                onClick={(e) => handleTabClick(e, index)}
                className="flex flex-1 items-center justify-center gap-2 py-2.5 text-center text-xs font-semibold select-none transition-colors duration-300"
              >
                <div
                  ref={isHome ? homeIconRef : resultsIconRef}
                  className="flex items-center justify-center transition-all duration-300"
                >
                  <Icon
                    size={18}
                    className={active ? 'text-accent font-bold scale-110' : 'text-mutedText opacity-60 scale-100'}
                  />
                </div>
                <span
                  ref={isHome ? homeLabelRef : resultsLabelRef}
                  className={`transition-all duration-300 tracking-wide ${
                    active ? 'text-mainText font-bold' : 'text-mutedText opacity-75 font-medium'
                  }`}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}