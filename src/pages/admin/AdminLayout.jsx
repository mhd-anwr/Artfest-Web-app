import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Users,
  GalleryHorizontalEnd,
  FileText,
  Printer,
  Layers,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react'
import IsraLogo from '../../components/IsraLogo'

const navItems = [
  { label: 'Dashboard', path: '/admin', end: true, icon: LayoutDashboard },
  { label: 'Programmes', path: '/admin/programmes', icon: BookOpen },
  { label: 'Categories', path: '/admin/categories', icon: Layers },
  { label: 'Teams', path: '/admin/teams', icon: Trophy },
  { label: 'Participants', path: '/admin/students', icon: Users },
  { label: 'Spotlight / Gallery', path: '/admin/spotlight', icon: GalleryHorizontalEnd },
  { label: 'Results', path: '/admin/results', icon: FileText },
  { label: 'Print', path: '/admin/print', icon: Printer },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const isDashboard = location.pathname === '/admin'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email || ''))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const closeDrawer = () => setOpen(false)

  return (
    <div className="min-h-screen bg-mainBackground text-mainText">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-primary/95 backdrop-blur border-b border-white/10">
        <button onClick={() => setOpen(true)} aria-label="Open navigation" className="p-1.5 text-mainText">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2.5">
          <Link to="/" className="flex items-center select-none">
            <img src="/rendezvous-logo.png" alt="Rendezvous'26" className="h-7 w-auto object-contain drop-shadow-sm" />
          </Link>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={closeDrawer} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col admin-sidebar shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="relative flex items-center justify-center pt-6 pb-4 px-6">
          <Link to="/" className="flex items-center justify-center select-none w-full">
            <img
              src="/rendezvous-logo.png"
              alt="Rendezvous'26"
              className="h-11 sm:h-12 w-auto max-w-[220px] object-contain drop-shadow-sm transition-transform hover:scale-105"
            />
          </Link>
          <button onClick={closeDrawer} aria-label="Close navigation" className="lg:hidden absolute right-4 top-6 p-1.5 text-white/80 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ label, path, end, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'admin-nav-item-active'
                    : 'admin-nav-item'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'admin-nav-icon-active shrink-0' : 'admin-nav-icon shrink-0'} />
                  <span className={isActive ? 'flex-1 truncate font-bold text-white' : 'flex-1 truncate'}>{label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'admin-nav-dot-active' : 'bg-transparent'}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin user */}
        <div className="admin-user-footer p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#228C22] text-[#D4FFB8] flex items-center justify-center font-bold text-sm shrink-0 border border-[#8ED06C]/40">
              {(adminEmail || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold admin-user-text truncate">{adminEmail || 'Admin'}</p>
            </div>
            <button onClick={handleLogout} aria-label="Logout" title="Logout" className="p-2 rounded-lg admin-logout-btn">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-72 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          {!isDashboard && (
            <div className="mb-4">
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center gap-2 bg-card border border-secondary/40 rounded-xl px-4 py-2 text-sm sm:text-base font-semibold text-mainText shadow-sm hover:bg-white/10 hover:border-mainText/40 transition"
              >
                <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> Back to Dashboard
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
