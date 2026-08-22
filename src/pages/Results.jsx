import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProgrammes, getCategories, getAllResults, PROGRAMME_CATEGORIES } from '../supabase/queries'
import { CheckCircle2, Hourglass, Eye, ArrowLeft, ChevronDown, Check } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

const CATEGORY_COLORS = {
  Minor: '#55EFC4',
  HS: '#FF7675',
  Premier: '#74B9FF',
  'Sub Junior': '#A29BFE',
  Junior: '#FDCB6E',
  'General Cat-A': '#9CA3AF',
  'General Cat-B': '#D1D5DB',
}

function gradeFrom(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

export default function Results() {
  const [programmes, setProgrammes] = useState([])
  const [resultNoMap, setResultNoMap] = useState({})
  const [gradeMap, setGradeMap] = useState({})
  const [resultProgIds, setResultProgIds] = useState(new Set())
  const [orderedCategories, setOrderedCategories] = useState(PROGRAMME_CATEGORIES)
  const [category, setCategory] = useState('')
  const [unfinishedOnly, setUnfinishedOnly] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    getProgrammes().then(setProgrammes)
    getCategories().then(({ programme }) => setOrderedCategories(programme))
    getAllResults().then(results => {
      const noMap = {}
      const gMap = {}
      const progIds = new Set()
      results.forEach(r => {
        if (r.programmeId) {
          noMap[r.programmeId] = r.resultNo
          progIds.add(r.programmeId)
        }
        const points = r.first?.points
        gMap[r.programmeId] = points != null ? gradeFrom(points) : '-'
      })
      setResultNoMap(noMap)
      setGradeMap(gMap)
      setResultProgIds(progIds)
    })
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const categories = [
    { value: '', label: 'All Categories' },
    ...orderedCategories.map(c => ({ value: c, label: c })),
  ]

  const currentCatObj = categories.find(c => c.value === category) || categories[0]

  const filtered = programmes.filter(p => {
    if (unfinishedOnly) {
      return !p.isFinished && !resultProgIds.has(p.id)
    }
    if (!p.isFinished || !resultProgIds.has(p.id)) return false
    return category ? p.category === category : true
  })

  // Finished (resulted) programmes sort by result number, then pending ones.
  const sorted = [...filtered].sort((a, b) => {
    const ra = resultNoMap[a.id] || 0
    const rb = resultNoMap[b.id] || 0
    if (ra && rb) return rb - ra
    if (ra) return -1
    if (rb) return 1
    return (a.name || '').localeCompare(b.name || '')
  })

  return (
    <div className="min-h-screen bg-page">
      {/* Transparent Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 sm:px-8 lg:px-16 py-4 lg:py-5 pointer-events-none">
        <div className="flex items-center gap-2 tracking-tight select-none focus:outline-none" />
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            to="/"
            className="flex items-center gap-1 px-4 py-2 rounded-full bg-card border border-subtle text-mainText text-xs sm:text-sm font-semibold hover:bg-lavender transition"
          >
            <ArrowLeft size={16} /> Home
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="bg-page p-4 md:p-8 lg:p-12 max-w-6xl mx-auto relative z-20 pt-24 sm:pt-28">
        {/* Hero glossy glass reflection layer */}
        <div className="hero-glass-reflection" />

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 bg-lavender text-textDark text-xs md:text-sm font-semibold uppercase tracking-[0.24em] rounded-full px-4 py-1.5 mb-4">
            Result &amp; Poster
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-mainText leading-tight mb-3">
            Results
          </h1>
          <p className="text-textMute text-sm sm:text-base font-display max-w-xl">
            Every result in one place — preview a programme and download its poster
            in Classic, Vibrant or Minimal style.
          </p>
        </div>

        {/* Filter Controls: Horizontally Expanding Category Pill + Unfinished Button */}
        <div className="flex items-center gap-3 mb-8 relative z-30 max-w-full">
          {/* Expanding Category Pill Container */}
          <div ref={containerRef} className="relative flex items-center max-w-[calc(100vw-130px)] sm:max-w-none">
            {!expanded ? (
              /* CLOSED STATE: Compact Pill Button */
              <button
                onClick={() => setExpanded(true)}
                className={`filter-btn flex items-center gap-2 ${!unfinishedOnly ? 'active' : ''}`}
                title="Expand categories"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
                  style={{ backgroundColor: CATEGORY_COLORS[category] || '#9CA3AF' }}
                />
                <span className="font-semibold text-xs sm:text-sm">{currentCatObj.label}</span>
                <ChevronDown
                  size={15}
                  className="transition-transform duration-300 text-mutedText"
                />
              </button>
            ) : (
              /* EXPANDED STATE: Horizontal Segmented Glass Bar */
              <div className="inline-flex items-center gap-1 bg-card border border-subtle rounded-full p-1 shadow-lg backdrop-blur-md overflow-x-auto scrollbar-none max-w-full animate-fadeIn transition-all duration-300">
                {categories.map(cat => {
                  const isSelected = !unfinishedOnly && category === cat.value
                  const dotColor = CATEGORY_COLORS[cat.value] || '#9CA3AF'
                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setCategory(cat.value)
                        setUnfinishedOnly(false)
                        setExpanded(false)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#1D192B] text-white dark:bg-white dark:text-[#1D192B] font-bold shadow-sm'
                          : 'text-textMute hover:text-mainText hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1.5 rounded-full text-textMute hover:text-mainText hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0 ml-0.5"
                  title="Collapse categories"
                >
                  <ChevronDown size={15} className="rotate-180" />
                </button>
              </div>
            )}
          </div>

          {/* Unfinished Button */}
          <button
            onClick={() => {
              setUnfinishedOnly(u => !u)
              setExpanded(false)
            }}
            className={`filter-btn flex items-center gap-1.5 shrink-0 ${unfinishedOnly ? 'active' : ''}`}
          >
            <Hourglass size={14} /> Unfinished
          </button>
        </div>

        {/* Result grid */}
        {sorted.length === 0 ? (
          <p className="text-textMute text-center mt-10">No results found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-grid">
            {sorted.map(prog => {
              const no = resultNoMap[prog.id]
              return (
                <div key={prog.id} className="postergen-card flex flex-col">
                  <div className="preview-box px-5 py-4 flex items-center justify-between border-b border-subtle">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-textMute">
                      {prog.isFinished ? 'Result' : 'Pending'}
                    </span>
                    <span className="font-display font-extrabold text-2xl text-resultNavy leading-none">
                      {no ? `#${no}` : '—'}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <h3 className="font-display font-bold text-lg text-mainText leading-snug line-clamp-2">
                      {prog.name}
                    </h3>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs sm:text-sm text-textMute font-medium">
                        {prog.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          prog.isFinished
                            ? 'bg-accent-purple-soft text-accent-purple-deep'
                            : 'bg-card-lavender text-text-muted'
                        }`}
                      >
                        {prog.isFinished ? (
                          <>
                            <CheckCircle2 size={12} /> Grade {gradeMap[prog.id] || '-'}
                          </>
                        ) : (
                          <>
                            <Hourglass size={12} /> Unfinished
                          </>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/results/${prog.id}`)}
                      className="btn-result w-full"
                    >
                      {prog.isFinished ? (
                        <>
                          <Eye size={16} /> Preview &amp; Download
                        </>
                      ) : (
                        <>
                          <Eye size={16} /> View Programme
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}