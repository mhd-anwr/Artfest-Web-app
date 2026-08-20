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
    <div className="min-h-screen bg-[#F6FAF4] dark:bg-[#061A0D] text-[#115F32] dark:text-[#D4FFB8]">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#115F32] backdrop-blur border-b border-[#228C22]/30">
        <button onClick={() => setOpen(true)} aria-label="Open navigation" className="p-1.5 text-[#FFFFFF]">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2.5">
          <Link to="/" className="flex items-center select-none">
            <img
              src="/rendezvous-logo.png"
              alt="Rendezvous'26"
              className="h-8 w-auto object-contain"
              style={{ filter: 'none', opacity: 1, mixBlendMode: 'normal', background: 'transparent' }}
            />
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
        <div className="relative flex items-center justify-center pt-6 pb-4 px-6 border-b border-[#228C22]/30">
          <Link to="/" className="flex items-center justify-center select-none w-full">
            <img
              src="/rendezvous-logo.png"
              alt="Rendezvous'26"
              className="h-12 sm:h-14 w-auto max-w-[240px] object-contain"
              style={{ filter: 'none', opacity: 1, mixBlendMode: 'normal', background: 'transparent' }}
            />
          </Link>
          <button onClick={closeDrawer} aria-label="Close navigation" className="lg:hidden absolute right-4 top-6 p-1.5 text-[#C8F7A8] hover:text-[#FFFFFF] transition">
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
                    ? 'bg-[#228C22] text-[#FFFFFF] border border-[#C8F7A8]/30 shadow-sm font-bold'
                    : 'text-[#FFFFFF] hover:bg-[#228C22]/40 hover:text-[#FFFFFF]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-[#FFFFFF] shrink-0' : 'text-[#C8F7A8] group-hover:text-[#FFFFFF] shrink-0'} />
                  <span className={isActive ? 'flex-1 truncate font-bold text-[#FFFFFF]' : 'flex-1 truncate text-[#FFFFFF]'}>{label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#C8F7A8]' : 'bg-transparent'}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin user */}
        <div className="admin-user-footer p-4 border-t border-[#228C22]/30 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#228C22] text-[#FFFFFF] flex items-center justify-center font-bold text-sm shrink-0 border border-[#C8F7A8]/40">
              {(adminEmail || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#FFFFFF] truncate">{adminEmail || 'Admin'}</p>
            </div>
            <button onClick={handleLogout} aria-label="Logout" title="Logout" className="p-2 rounded-lg text-[#C8F7A8] hover:text-[#FFFFFF] hover:bg-[#228C22]/40 transition">
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
                className="inline-flex items-center gap-2 bg-white hover:bg-[#F1F8EE] dark:bg-[#0B2A17] dark:hover:bg-[#123D22] border border-[#115F32]/14 dark:border-[#71C247]/25 rounded-xl px-4 py-2 text-sm sm:text-base font-semibold text-[#115F32] dark:text-[#D4FFB8] shadow-sm transition"
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
