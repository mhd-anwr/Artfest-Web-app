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
  Frame,
  ChevronDown,
  LayoutTemplate,
  PanelBottom,
} from 'lucide-react'
import IsraLogo from '../../components/IsraLogo'

const navItems = [
  { label: 'Dashboard', path: '/admin', end: true, icon: LayoutDashboard },
  { label: 'Programmes', path: '/admin/programmes', icon: BookOpen },
  { label: 'Categories', path: '/admin/categories', icon: Layers },
  { label: 'Teams', path: '/admin/teams', icon: Trophy },
  { label: 'Participants', path: '/admin/students', icon: Users },
  { label: 'Gallery', path: '/admin/spotlight', icon: GalleryHorizontalEnd },
  { label: 'Results', path: '/admin/results', icon: FileText },
  {
    label: 'Frames',
    path: '/admin/frames',
    icon: Frame,
    children: [
      { label: 'Templates', path: '/admin/frames/templates', icon: LayoutTemplate },
      { label: 'Footer', path: '/admin/frames/footer', icon: PanelBottom },
    ],
  },
  { label: 'Print', path: '/admin/print', icon: Printer },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const isDashboard = location.pathname === '/admin'
  const isFramesActive = location.pathname.startsWith('/admin/frames')
  const [framesExpanded, setFramesExpanded] = useState(isFramesActive)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email || ''))
  }, [])

  useEffect(() => {
    if (isFramesActive) setFramesExpanded(true)
  }, [location.pathname, isFramesActive])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const closeDrawer = () => setOpen(false)

  return (
    <div className="min-h-screen bg-[#F5FAF3] dark:bg-[#061A0D] text-[#115F32] dark:text-[#D4FFB8]">
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
          {navItems.map((item) => {
            const Icon = item.icon
            if (item.children) {
              const active = isFramesActive
              return (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={() => {
                      if (!isFramesActive) {
                        navigate('/admin/frames/templates')
                        setFramesExpanded(true)
                      } else {
                        setFramesExpanded(v => !v)
                      }
                    }}
                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-gradient-to-r from-[#19BB47] to-[#AEE515] text-[#011D33] font-bold shadow-md'
                        : 'text-[#D8EDE4] hover:bg-[#017D8B]/30 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-[#011D33] shrink-0' : 'text-[#01B998] group-hover:text-white shrink-0'} />
                    <span className={active ? 'flex-1 truncate text-left font-bold text-[#011D33]' : 'flex-1 truncate text-left text-white'}>{item.label}</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${framesExpanded ? 'rotate-180 text-[#011D33]' : 'text-[#01B998]'}`} />
                  </button>
                  {framesExpanded && (
                    <div className="pl-4 space-y-1 border-l border-[#017D8B]/40 ml-3">
                      {item.children.map(sub => {
                        const SubIcon = sub.icon
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={closeDrawer}
                            className={({ isActive }) =>
                              `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-[#19BB47] text-[#011D33] font-bold'
                                  : 'text-[#D8EDE4] hover:bg-[#017D8B]/30 hover:text-white'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <SubIcon size={14} className={isActive ? 'text-[#011D33] shrink-0' : 'text-[#01B998] group-hover:text-white shrink-0'} />
                                <span className="flex-1 truncate">{sub.label}</span>
                              </>
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={closeDrawer}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#19BB47] to-[#AEE515] text-[#011D33] font-bold shadow-md'
                      : 'text-[#D8EDE4] hover:bg-[#017D8B]/30 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={isActive ? 'text-[#011D33] shrink-0' : 'text-[#01B998] group-hover:text-white shrink-0'} />
                    <span className={isActive ? 'flex-1 truncate font-bold text-[#011D33]' : 'flex-1 truncate text-white'}>{item.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#011D33]' : 'bg-transparent'}`} />
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Admin user */}
        <div className="admin-user-footer p-4 border-t border-[#017D8B]/30 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#01B998] to-[#19BB47] text-[#011D33] flex items-center justify-center font-bold text-sm shrink-0 border border-[#AEE515]/40">
              {(adminEmail || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{adminEmail || 'Admin'}</p>
            </div>
            <button onClick={handleLogout} aria-label="Logout" title="Logout" className="p-2 rounded-lg text-[#01B998] hover:text-white hover:bg-[#017D8B]/40 transition">
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
                className="inline-flex items-center gap-2 bg-[#013157] hover:bg-[#012847] border border-[#017D8B] rounded-xl px-4 py-2 text-sm sm:text-base font-semibold text-white shadow-sm transition"
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
