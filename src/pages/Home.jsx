import { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { getFeaturedSpotlight, getSpotlight, getTeamCategoryPoints } from '../supabase/queries'
import { ArrowRight, ExternalLink, Users, CalendarDays, UserCheck, Layers } from 'lucide-react'
import HeroAnimation from '../components/HeroAnimation'
import useScrollReveal from '../hooks/useScrollReveal'
import ThemeToggle from '../components/ThemeToggle'
import LoginControl from '../components/LoginControl'

// Toggle for the hero background photo-flash card animation.
// Set to true to re-enable it (no other changes needed).
const HERO_ANIMATION_ENABLED = false

const stats = [
  { value: '3', label: 'Teams', icon: Users },
  { value: '3', label: 'Days', icon: CalendarDays },
  { value: '120+', label: 'Participants', icon: UserCheck },
  { value: '150+', label: 'Programmes', icon: Layers },
]

const teamMembers = [
  { name: 'Anwar Ahmed', role: 'Festival Chairman', initials: 'AA', tint: 'from-[#115F32] to-[#228C22]', photo: '/team/Anwar.jpg' },
  { name: 'Muhammed AbdulQadar', role: 'Festival Convenor', initials: 'MA', tint: 'from-[#228C22] to-[#4EBA16]', photo: '/team/Mohammed.jpeg' },
  { name: 'Sayyid Mueenudheen ', role: 'Finance Convenor', initials: 'SM', tint: 'from-[#4EBA16] to-[#71C247]', photo: '/team/Moinu.jpeg' },
  { name: 'Shammas Mujeeb', role: 'Vice Chairman', initials: 'SM', tint: 'from-[#115F32] to-[#4EBA16]', photo: '/team/Shammas.jpeg' },
  { name: 'Midlaj Moideen', role: 'Vice Chairman', initials: 'MM', tint: 'from-[#228C22] to-[#71C247]', photo: '/team/midlaj moideen.jpg' },
  { name: 'Afsal Sharafudheen', role: 'Joint Convenor', initials: 'AS', tint: 'from-[#4EBA16] to-[#8ED06C]', photo: '/team/Afsal.jpg' },
  { name: 'Vahid', role: 'Joint Convenor', initials: 'v', tint: 'from-[#71C247] to-[#D4FFB8]', photo: '/team/vahid.jpg' },
  { name: 'Farhan Musthafa', role: 'Software Developer', initials: 'FM', tint: 'from-[#115F32] to-[#71C247]', photo: '/team/faruuunn.jpg' }
]

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [allImages, setAllImages] = useState([])
  const [teamData, setTeamData] = useState([])
  const [scrollY, setScrollY] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const aboutRef = useRef(null)
  const teamsReveal = useScrollReveal()
  const statsReveal = useScrollReveal()
  const galleryReveal = useScrollReveal()
  const aboutReveal = useScrollReveal()
  const teamReveal = useScrollReveal()

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  )

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollY(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 10 + 8,
        delay: Math.random() * 12,
      })),
    []
  )

  const embers = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1.5,
        duration: Math.random() * 7 + 7,
        delay: Math.random() * 10,
      })),
    []
  )

  useEffect(() => {
    getFeaturedSpotlight().then(setFeatured)
    getSpotlight().then(setAllImages)
    getTeamCategoryPoints().then(({ teamData: data }) => {
      const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
      setTeamData(sorted)
    })
  }, [])

  useEffect(() => {
    if (location.state?.scrollTo === 'about') {
      setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [location.state])

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Floating Top Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-3 sm:px-8 pt-3 sm:pt-4 pointer-events-none">
        <div className={`floating-nav pointer-events-auto flex items-center justify-between sm:grid sm:grid-cols-[1fr_auto_1fr] w-full max-w-3xl px-3 py-2 sm:px-5 ${scrollY > 20 ? 'scrolled-nav' : ''}`}>
          <Link
            to="/"
            aria-label="Go to the festival home"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-1 sm:gap-2 tracking-tight select-none focus:outline-none justify-self-start font-sora shrink-0"
          >
            <span className="nav-brand-title font-bold text-xl sm:text-3xl leading-none uppercase">ISRA</span>
            <div className="nav-brand-subtitle flex flex-col text-[9px] sm:text-[11px] font-semibold leading-tight uppercase tracking-wider border-l-0 pl-0.5">
              <span>LIFE</span>
              <span>FESTIVAL</span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="nav-link active">
              Home
            </button>
            <button onClick={() => navigate('/results')} className="nav-link">
              Results
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 justify-self-end shrink-0">
            <LoginControl />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Full-Viewport Hero ── */}
      <section className="relative h-screen w-full overflow-hidden">
        {HERO_ANIMATION_ENABLED && (
          <HeroAnimation spotlightImages={featured.length > 0 ? featured : allImages} />
        )}

        <div className="aurora-layer" style={!prefersReduced ? { transform: `translateY(${Math.min(scrollY * 0.05, 30)}px)` } : {}}>
          <div className="aurora-blob aurora-a" />
          <div className="aurora-blob aurora-b" />
          <div className="aurora-blob aurora-c" />
        </div>

        <div className="sparkle-field">
          {sparkles.map(s => (
            <span
              key={s.id}
              className="sparkle"
              style={{
                left: `${s.left}%`,
                width: s.size,
                height: s.size,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <div
            className="mb-4 flex justify-center w-full"
            style={!prefersReduced ? {
              transform: `translateY(${-Math.min(scrollY * 0.15, 28)}px) scale(${1 - Math.min(scrollY * 0.0003, 0.04)})`,
              opacity: Math.max(1 - scrollY * 0.0018, 0.5)
            } : {}}
          >
            <div
              role="img"
              aria-label="ISRA Rendezvous'26 logo"
              className="hero-logo-mask w-full max-w-[280px] sm:max-w-md md:max-w-xl lg:max-w-2xl h-16 sm:h-24 md:h-32 lg:h-40 select-none"
            />
          </div>
          <p
            className="text-lg md:text-xl text-textMute font-display italic mb-10 max-w-xl"
            style={!prefersReduced ? {
              transform: `translateY(${-Math.min(scrollY * 0.12, 22)}px)`,
              opacity: Math.max(1 - scrollY * 0.0022, 0.4)
            } : {}}
          >
            - Decoding Phytolore -
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4"
            style={!prefersReduced ? {
              transform: `translateY(${-Math.min(scrollY * 0.08, 16)}px)`,
              opacity: Math.max(1 - scrollY * 0.0026, 0.3)
            } : {}}
          >
            <button
              onClick={() => navigate('/results')}
              className="cta-gradient px-8 py-3 font-semibold font-inter"
            >
              Results
            </button>
            <button
              onClick={() => scrollTo(aboutRef)}
              className="px-8 py-3 bg-card border border-subtle text-mainText rounded-full font-semibold font-inter hover:bg-lavender transition"
            >
              About
            </button>
          </div>
        </div>
      </section>

      {/* ── Content Below Hero ── */}
      <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto relative z-20">

        {/* Team Standings — ranked list only */}
        <div
          ref={teamsReveal.ref}
          className={`bento-standings-card p-6 md:p-10 w-full mb-12 scroll-mt-24 reveal ${teamsReveal.visible ? 'reveal-visible' : ''
            }`}
        >
          <div className="ember-field">
            {embers.map(e => (
              <span
                key={e.id}
                className="ember"
                style={{
                  left: `${e.left}%`,
                  width: e.size,
                  height: e.size,
                  animationDuration: `${e.duration}s`,
                  animationDelay: `${e.delay}s`,
                }}
              />
            ))}
          </div>
          <h2 className="relative z-10 text-2xl md:text-4xl font-brand font-black text-mainText mb-10 text-center tracking-tight uppercase">
            Team Standings
          </h2>

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-4">
            {teamData.map((team, i) => (
              <div
                key={team.id}
                className={`lb-item ${i < 3 ? `lb-${i + 1}` : 'lb-other'} px-5 py-5 flex items-center justify-center gap-6 text-center`}
              >
                <span className="lb-rank font-display font-extrabold text-3xl w-12 shrink-0">
                  {i + 1}
                </span>
                <span className={`font-display font-bold text-xl md:text-2xl truncate flex-1 ${i < 3 ? 'text-[#1D192B]' : 'text-white/90'}`}>
                  {team.name}
                </span>
                <span className="lb-points font-display font-extrabold text-2xl md:text-3xl whitespace-nowrap">
                  {team.totalPoints || 0}
                  <span className="text-sm font-medium opacity-70 ml-1">pts</span>
                </span>
              </div>
            ))}
            {teamData.length === 0 && (
              <p className="text-center text-sm text-white/60 py-6">Loading standings…</p>
            )}
          </div>
        </div>

        {/* Stats Blocks */}
        <div
          ref={statsReveal.ref}
          className={`mb-12 reveal ${statsReveal.visible ? 'reveal-visible' : ''}`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 stagger-grid">
            {stats.map(stat => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bento-white-card p-6 text-center"
                >
                  <Icon size={22} className="mx-auto mb-3 text-accent" />
                  <div className="stat-number font-display font-bold text-4xl md:text-5xl leading-none">
                    {stat.value}
                  </div>
                  <div className="stat-subtext mt-2 text-xs md:text-sm uppercase tracking-[0.18em] font-semibold">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gallery */}
        {allImages.length > 0 && (
          <div
            ref={galleryReveal.ref}
            className={`mb-12 reveal ${galleryReveal.visible ? 'reveal-visible' : ''}`}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-accent text-xs md:text-sm font-semibold uppercase tracking-[0.28em] mb-2">
                  From the Fest
                </p>
                <h3 className="text-4xl md:text-5xl font-display font-bold text-mainText leading-tight">
                  Gallery
                </h3>
                <p className="mt-2 text-sm md:text-base text-mutedText font-display italic max-w-md">
                  Scenes from ISRA life Festival 2026 as it unfolds.
                </p>
              </div>
              <button
                onClick={() => navigate('/gallery')}
                className="group flex items-center gap-2 text-accent text-xs md:text-sm font-semibold uppercase tracking-[0.22em] whitespace-nowrap mt-1 hover:opacity-80 transition"
              >
                View All
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 stagger-grid">
              {allImages.slice(0, 8).map(img => (
                <div key={img.id} className="relative overflow-hidden rounded-xl aspect-[4/3]">
                  <img
                    src={img.imageURL}
                    alt={img.caption || ''}
                    className="w-full h-full object-cover transition-transform duration-300 ease-out hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About the Fest */}
        <div
          ref={(el) => {
            aboutRef.current = el
            aboutReveal.ref(el)
          }}
          id="about"
          className={`mb-16 scroll-mt-24 reveal ${aboutReveal.visible ? 'reveal-visible' : ''}`}
        >
          {/* Main Title & Subtitle */}
          <div className="text-center mb-8 sm:mb-10 px-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-[#115F32] dark:text-[#D4FFB8] opacity-100 tracking-tight mb-2 sm:mb-3">
              Rendezvous’26
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-[#115F32] dark:text-[#D4FFB8] opacity-100 tracking-wide">
              Jamia Madeenathunnoor Life Festival
            </p>
          </div>

          {/* Description Block */}
          <div className="max-w-4xl lg:max-w-5xl mx-auto px-5 sm:px-8">
            <p className="text-base sm:text-lg md:text-xl font-normal text-[#174D2A] dark:text-[#D4FFB8] opacity-100 not-italic leading-relaxed sm:leading-loose text-left">
              Rendezvous'26, the 26th edition of Jamia Madeenathunnoor's Life Festival, stands as a landmark moment in the institution's long-standing commitment to shaping well-rounded students. What began as a purely artistic gathering has, over time, grown into a dynamic space where academic achievement and creative talent come together. The festival continues its mission to build a thoughtful, ethical appreciation for the arts — recognizing their essential part in shaping character, personal growth, and intellectual maturity. Across 26 remarkable years, Rendezvous has left its mark on generations of students, refining their talents with a strong sense of purpose and preparing them to carry its values into the world beyond campus.
            </p>
          </div>

          {/* Action Links */}
          <div className="mt-8 sm:mt-10 flex items-center justify-center gap-3 flex-wrap">
            <a
              href="https://www.youtube.com/@isra_media"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 cta-gradient px-8 py-3 font-semibold font-inter"
            >
              Explore <ExternalLink size={16} />
            </a>
            <a
              href="https://www.instagram.com/isralifefestival_26/?utm_source=ig_web_button_share_sheet"
              target="_blank"
              rel="noreferrer"
              aria-label="ISRA life Festival Instagram"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-card border border-subtle text-mainText shadow-sm hover:bg-lavender transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" /></svg>
            </a>
          </div>
        </div>

        {/* Our Team */}
        <div
          ref={teamReveal.ref}
          className={`mb-12 text-center reveal ${teamReveal.visible ? 'reveal-visible' : ''}`}
        >
          <span className="inline-block text-[#115F32] dark:text-[#8ED06C] text-xs md:text-sm font-semibold uppercase tracking-[0.28em] border border-[#115F32]/30 dark:border-[#8ED06C]/40 rounded-full px-4 py-1.5 mb-5">
            Our Team
          </span>
          <h3 className="corvion-name text-3xl sm:text-4xl md:text-5xl mb-4 text-[#115F32] dark:text-[#D4FFB8]">
            Corvion
          </h3>
          <p className="max-w-2xl mx-auto text-[#174D2A] dark:text-[#8ED06C] text-sm sm:text-base leading-loose mb-12 px-2">
            A passionate crew of organizers, coordinators, and volunteers who bring the festival
            to life — from Stage lights to score sheets.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10 place-items-center max-w-6xl mx-auto px-4 stagger-grid">
            {teamMembers.map(member => (
              <div key={member.name} className="w-full max-w-[301px] text-center flex flex-col items-center">
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="mx-auto mb-3 sm:mb-4 aspect-[301/280] w-full max-w-[301px] rounded-[18px] sm:rounded-[24px] object-cover object-top shadow-lg"
                  />
                ) : (
                  <div
                    className={`mx-auto mb-3 sm:mb-4 aspect-[301/280] w-full max-w-[301px] rounded-[18px] sm:rounded-[24px] bg-gradient-to-br ${member.tint} flex items-center justify-center font-display text-xl sm:text-2xl font-bold text-white shadow-lg`}
                  >
                    {member.initials}
                  </div>
                )}
                <p className="team-profile-name text-center w-full">{member.name}</p>
                <p className="team-profile-role text-center w-full">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 mb-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-mutedText text-xs sm:text-sm font-inter">
          <p className="font-bold text-mainText shrink-0">Rendezvous '26</p>
          <p className="text-center">© ISRA Vatanappally • <span className="font-corvion">Corvion</span> • Festival Collective. All rights reserved.</p>
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="https://www.instagram.com/isralifefestival_26?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="hover:text-accent transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
            </a>
            <a
              href="https://www.youtube.com/@isra_media"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="hover:text-accent transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></svg>
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}