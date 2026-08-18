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
  const vesselRef = useRef(null)

  // Direct manipulation drag states
  const [dragProgress, setDragProgress] = useState(null) // null = not dragging
  const [isDragging, setIsDragging] = useState(false)
  const [animClass, setAnimClass] = useState('')

  const dragStartRef = useRef({ x: 0, time: 0, originIndex: 0, vesselWidth: 200 })
  const velocityRef = useRef(0)
  const lastPosRef = useRef({ x: 0, time: 0 })

  // Hide the shared bottom nav inside the Student, Judge and Admin panels.
  // Match on the first path segment so public pages keep the navbar — only
  // panel routes ('/student/...', '/judges/...', '/admin/...') hide it.
  const first = location.pathname.split('/')[1]
  const isPanel = first === 'admin' || first === 'student' || first === 'judges'
  if (isPanel) return null

  const activeIndex = tabs.findIndex(t => t.path === location.pathname)
  const effectiveIndex = activeIndex === -1 ? 0 : activeIndex

  // Sync dragProgress with effectiveIndex when not actively dragging
  const currentProgress = isDragging && dragProgress !== null ? dragProgress : (effectiveIndex === 1 ? 1 : 0)

  const handlePointerDown = (e) => {
    if (!vesselRef.current) return
    const rect = vesselRef.current.getBoundingClientRect()
    const width = rect.width
    const startX = e.clientX
    const now = performance.now()

    dragStartRef.current = {
      x: startX,
      time: now,
      originIndex: effectiveIndex,
      vesselWidth: width,
    }
    lastPosRef.current = { x: startX, time: now }
    velocityRef.current = 0

    setIsDragging(true)
    setDragProgress(effectiveIndex === 1 ? 1 : 0)

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (_) {}
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const { x: startX, originIndex, vesselWidth } = dragStartRef.current
    const currentX = e.clientX
    const now = performance.now()

    // Measure velocity in px/ms
    const timeDiff = now - lastPosRef.current.time
    if (timeDiff > 0) {
      velocityRef.current = (currentX - lastPosRef.current.x) / timeDiff
    }
    lastPosRef.current = { x: currentX, time: now }

    const deltaX = currentX - startX
    const trackWidth = vesselWidth / 2 // distance between Home (0) and Results (1)
    const deltaFraction = deltaX / trackWidth

    let rawProgress = (originIndex === 1 ? 1 : 0) + deltaFraction

    // Direction enforcement & Rubber-banding
    if (originIndex === 0) {
      // On Home: dragging left applies rubberband resistance
      if (rawProgress < 0) {
        rawProgress = rawProgress * 0.15
      }
      if (rawProgress > 1.08) {
        rawProgress = 1.08
      }
    } else {
      // On Results: dragging right applies rubberband resistance
      if (rawProgress > 1) {
        rawProgress = 1 + (rawProgress - 1) * 0.15
      }
      if (rawProgress < -0.08) {
        rawProgress = -0.08
      }
    }

    setDragProgress(rawProgress)
  }

  const handlePointerUp = (e) => {
    if (!isDragging) return
    setIsDragging(false)

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch (_) {}

    const { originIndex } = dragStartRef.current
    const finalProgress = dragProgress !== null ? dragProgress : (originIndex === 1 ? 1 : 0)
    const velocity = velocityRef.current

    let shouldCommit = false
    let targetIndex = originIndex

    if (originIndex === 0) {
      // Dragging from Home towards Results
      if (finalProgress > 0.35 || velocity > 0.3) {
        shouldCommit = true
        targetIndex = 1
      }
    } else {
      // Dragging from Results towards Home
      if (finalProgress < 0.65 || velocity < -0.3) {
        shouldCommit = true
        targetIndex = 0
      }
    }

    setDragProgress(null)

    if (shouldCommit && targetIndex !== originIndex) {
      const cls = targetIndex === 1 ? 'slide-to-results' : 'slide-to-home'
      setAnimClass(cls)
      setTimeout(() => setAnimClass(''), 440)
      navigate(tabs[targetIndex].path)
    } else {
      // Snap back to origin
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

  // Calculate liquid stretch factor while dragging
  const deltaFromOrigin = dragProgress !== null ? Math.abs(dragProgress - (effectiveIndex === 1 ? 1 : 0)) : 0
  const stretchX = isDragging ? 1 + Math.min(deltaFromOrigin, 1) * 0.16 : 1
  const scaleY = isDragging ? 1 - Math.min(deltaFromOrigin, 1) * 0.08 : 1

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
              className={`liquid-glass-lens ${isDragging ? 'is-dragging' : animClass}`}
              style={{
                transform: `translateX(${currentProgress * 100}%) scaleX(${stretchX}) scaleY(${scaleY})`,
              }}
            />
          )}
        </div>

        {/* Seamless Navigation Items */}
        <div className="relative z-10 flex w-full items-center">
          {tabs.map(({ path, icon: Icon, label }, index) => {
            const itemWeight = index === 0 ? 1 - Math.max(0, Math.min(1, currentProgress)) : Math.max(0, Math.min(1, currentProgress))
            const isActiveLabel = itemWeight > 0.5

            return (
              <Link
                key={path}
                to={path}
                onClick={(e) => handleTabClick(e, index)}
                className="flex flex-1 items-center justify-center gap-2 py-2.5 text-center text-xs font-semibold select-none transition-colors duration-200"
              >
                <Icon
                  size={18}
                  style={{ opacity: 0.5 + itemWeight * 0.5, transform: `scale(${1 + itemWeight * 0.1})` }}
                  className={isActiveLabel ? 'text-accent font-bold' : 'text-mutedText'}
                />
                <span
                  style={{ opacity: 0.6 + itemWeight * 0.4 }}
                  className={`tracking-wide ${isActiveLabel ? 'text-mainText font-bold' : 'text-mutedText font-medium'}`}
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