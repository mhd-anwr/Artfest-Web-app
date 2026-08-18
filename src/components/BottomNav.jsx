import { Link, useLocation } from 'react-router-dom'
import { Home, BookOpen } from 'lucide-react'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/results', icon: BookOpen, label: 'Results' },
]

export default function BottomNav() {
  const location = useLocation()
  // Hide the shared bottom nav inside the Student, Judge and Admin panels.
  // Match on the first path segment so public pages keep the navbar — only
  // panel routes ('/student/...', '/judges/...', '/admin/...') hide it.
  const first = location.pathname.split('/')[1]
  const isPanel = first === 'admin' || first === 'student' || first === 'judges'
  if (isPanel) return null

  const activeIndex = tabs.findIndex(t => t.path === location.pathname)

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[20rem] -translate-x-1/2 sm:hidden pb-[env(safe-area-inset-bottom,0px)] select-none">
      <div className="liquid-glass-nav relative flex items-center p-1.5">
        {/* Sliding Liquid-Glass Active Capsule */}
        {activeIndex !== -1 && (
          <div
            className="liquid-glass-active-pill absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
            style={{
              transform: activeIndex === 1 ? 'translateX(calc(100% + 0.375rem))' : 'translateX(0)',
            }}
          />
        )}

        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-center text-xs font-semibold transition-colors duration-200 ${
                active
                  ? 'text-mainText font-bold'
                  : 'text-mutedText hover:text-mainText font-medium'
              }`}
            >
              <Icon
                size={18}
                className={`transition-all duration-200 ${
                  active ? 'scale-110 text-accent' : 'scale-100 opacity-70'
                }`}
              />
              <span className="tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}