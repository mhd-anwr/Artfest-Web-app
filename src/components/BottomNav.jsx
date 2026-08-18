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
  const [isSliding, setIsSliding] = useState(false)
  const touchStartX = useRef(null)

  // Hide the shared bottom nav inside the Student, Judge and Admin panels.
  // Match on the first path segment so public pages keep the navbar — only
  // panel routes ('/student/...', '/judges/...', '/admin/...') hide it.
  const first = location.pathname.split('/')[1]
  const isPanel = first === 'admin' || first === 'student' || first === 'judges'
  if (isPanel) return null

  const activeIndex = tabs.findIndex(t => t.path === location.pathname)

  const handleTabClick = (targetIndex) => {
    if (targetIndex !== activeIndex) {
      setIsSliding(true)
      setTimeout(() => setIsSliding(false), 380)
    }
  }

  // Touch Swipe Gesture Handling
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchEndX - touchStartX.current
    touchStartX.current = null

    if (Math.abs(diff) > 35) {
      if (diff > 0 && activeIndex === 1) {
        // Swiped Right -> Home
        handleTabClick(0)
        navigate('/')
      } else if (diff < 0 && activeIndex === 0) {
        // Swiped Left -> Results
        handleTabClick(1)
        navigate('/results')
      }
    }
  }

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[19rem] -translate-x-1/2 sm:hidden pb-[env(safe-area-inset-bottom,0px)] select-none">
      <div
        className="liquid-glass-vessel relative flex items-center p-[0.35rem]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ONE Physical Liquid Glass Lens Sliding inside Container */}
        {activeIndex !== -1 && (
          <div
            className="liquid-glass-lens"
            style={{
              transform: activeIndex === 1
                ? (isSliding ? 'translateX(calc(100% + 0.35rem)) scaleX(1.12) scaleY(0.92)' : 'translateX(calc(100% + 0.35rem)) scaleX(1) scaleY(1)')
                : (isSliding ? 'translateX(0) scaleX(1.12) scaleY(0.92)' : 'translateX(0) scaleX(1) scaleY(1)'),
            }}
          />
        )}

        {/* Seamless Navigation Items (No button borders or card boxes) */}
        <div className="relative z-10 flex w-full items-center">
          {tabs.map(({ path, icon: Icon, label }, index) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                onClick={() => handleTabClick(index)}
                className="flex flex-1 items-center justify-center gap-2 py-2.5 text-center text-xs font-semibold select-none transition-colors duration-300"
              >
                <Icon
                  size={18}
                  className={`transition-all duration-300 ${
                    active ? 'scale-110 text-accent font-bold' : 'scale-100 opacity-60 text-mutedText'
                  }`}
                />
                <span
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