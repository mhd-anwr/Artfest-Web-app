import { useState, useEffect } from 'react'
import { Shuffle, RefreshCw, Hash, Type, Dice5, UserCheck, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import { useToast } from '../../components/Toast'
import ThemeToggle from '../../components/ThemeToggle'
import { getProgrammes, getStudents, getCategories, getTeams, getCodeAssignments, saveCodeAssignments, PROGRAMME_CATEGORIES } from '../../supabase/queries'
import { CATEGORY_COLORS } from '../../components/TeamBreakdown'

const MAX_CARDS = 60
const MAX_CODE_LETTERS = 26

const MODES = [
  {
    id: 'topic',
    label: 'Topic',
    icon: Hash,
    desc: 'Reveal entry-order numbers 1 to N',
  },
  {
    id: 'code',
    label: 'Code Letter',
    icon: Type,
    desc: 'Reveal entry-order letters A to Nth',
  },
  {
    id: 'assign',
    label: 'Assign',
    icon: UserCheck,
    desc: 'Code letter to participant',
  },
]

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPool(mode, n) {
  return mode === 'code'
    ? Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))
    : Array.from({ length: n }, (_, i) => i + 1)
}

export default function AdminLots() {
  const [step, setStep] = useState('mode')
  const [mode, setMode] = useState('')
  const [count, setCount] = useState('')
  const [cards, setCards] = useState([])
  const [drawId, setDrawId] = useState(0)

  // Assignment Workflow state
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [categories, setCategories] = useState(PROGRAMME_CATEGORIES)
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedProg, setSelectedProg] = useState(null)
  const [assignmentsMap, setAssignmentsMap] = useState({})
  const [savingAssignments, setSavingAssignments] = useState(false)
  const [validationError, setValidationError] = useState('')

  const toast = useToast()

  const flippedCount = cards.filter(c => c.flipped).length
  const maxForMode = mode === 'code' ? MAX_CODE_LETTERS : MAX_CARDS

  useEffect(() => {
    getProgrammes().then(setProgrammes).catch(err => console.error(err))
    getStudents().then(setStudents).catch(err => console.error(err))
    getTeams().then(setTeams).catch(err => console.error(err))
    getCategories().then(({ programme }) => setCategories(programme)).catch(err => console.error(err))
  }, [])

  const teamMap = {}
  teams.forEach(t => {
    if (t.id) teamMap[t.id] = t
    if (t.name) teamMap[t.name] = t
  })

  const getTeamInfo = (cand) => {
    const raw = typeof cand === 'object' ? (cand.team || cand.team_id || cand.teamId) : cand
    if (!raw) return { name: 'No Team', color: null }
    const found = teamMap[raw] || teams.find(t => t.id === raw || t.name === raw)
    if (found && found.name) return { name: found.name, color: found.color || null }
    if (typeof raw === 'string' && (raw.startsWith('team_') || raw.startsWith('team-'))) {
      return { name: 'No Team', color: null }
    }
    return { name: raw || 'No Team', color: null }
  }

  const pickMode = (id) => {
    setMode(id)
    if (id === 'assign') {
      setSelectedCat('')
      setSelectedProg(null)
      setAssignmentsMap({})
      setValidationError('')
      getProgrammes().then(setProgrammes).catch(err => console.error(err))
      setStep('assign_cat')
      return
    }
    setCount('')
    setCards([])
    setStep('setup')
  }

  const goToModes = () => {
    setStep('mode')
    setCount('')
    setCards([])
    setSelectedCat('')
    setSelectedProg(null)
    setValidationError('')
  }

  const startDraw = () => {
    const n = parseInt(count, 10)
    if (!n || n < 1) return toast('Enter the number of candidates', 'error')
    if (n > maxForMode) {
      return toast(mode === 'code' ? 'Maximum 26 letters (A to Z)' : `Maximum ${MAX_CARDS} cards`, 'error')
    }
    const shuffled = shuffleArray(buildPool(mode, n))
    setCards(shuffled.map(value => ({ value, flipped: false })))
    setDrawId(id => id + 1)
    setStep('draw')
  }

  const flipCard = (index) => {
    setCards(prev => prev.map((c, i) => (i === index && !c.flipped ? { ...c, flipped: true } : c)))
  }

  const newDraw = () => {
    setCards([])
    setCount('')
    setDrawId(id => id + 1)
    setStep('setup')
  }

  // Assign Workflow helper methods
  const selectCategory = (cat) => {
    setSelectedCat(cat)
    setSelectedProg(null)
    setValidationError('')
    getProgrammes().then(setProgrammes).catch(err => console.error(err))
    setStep('assign_prog')
  }

  const selectProgramme = async (prog) => {
    setSelectedProg(prog)
    setValidationError('')
    const existing = await getCodeAssignments(prog.id)
    setAssignmentsMap(existing || {})
    setStep('assign_list')
  }

  const getProgCandidates = (prog) => {
    if (!prog) return []
    const registered = students.filter(s => (s.programmeIds || []).includes(prog.id))
    if (registered.length === 0) {
      return Array.from({ length: 6 }, (_, i) => {
        const letter = String.fromCharCode(65 + i)
        return { id: `anon_${prog.id}_${letter}`, name: `Performance ${letter}`, chestNo: '' }
      })
    }
    return [...registered].sort((a, b) => (a.chestNo || a.name || a.id).localeCompare(b.chestNo || b.name || b.id))
  }

  const handleAssignmentChange = (participantId, codeLetter) => {
    setValidationError('')
    setAssignmentsMap(prev => ({
      ...prev,
      [participantId]: codeLetter
    }))
  }

  const handleSaveAssignments = async () => {
    if (!selectedProg) return
    const candidates = getProgCandidates(selectedProg)
    if (candidates.length === 0) return toast('No candidates to assign', 'error')

    setValidationError('')

    // 1. Check for unassigned candidates
    const unassigned = candidates.filter(c => !assignmentsMap[c.id])
    if (unassigned.length > 0) {
      const msg = 'Please select a Code Letter for every participant before saving.'
      setValidationError(msg)
      return toast(msg, 'error')
    }

    // 2. Check for duplicate code letters in the same programme
    const usedLettersMap = {}
    for (const c of candidates) {
      const code = assignmentsMap[c.id]
      if (code) {
        if (usedLettersMap[code]) {
          const msg = `Code Letter ${code} is already assigned to another participant.`
          setValidationError(msg)
          return toast(msg, 'error')
        }
        usedLettersMap[code] = true
      }
    }

    setSavingAssignments(true)
    const payload = candidates.map(c => ({
      participantId: c.id,
      codeLetter: assignmentsMap[c.id]
    }))

    const success = await saveCodeAssignments(selectedProg.id, selectedCat, payload)
    setSavingAssignments(false)
    if (success) {
      toast('Code letters assigned successfully!')
    } else {
      toast('Failed to save code letter assignments.', 'error')
    }
  }

  const activeMode = MODES.find(m => m.id === mode)

  // Filter categories to only those containing active/unfinished programmes
  const progsByCategory = {}
  categories.forEach(c => { progsByCategory[c] = [] })
  programmes.forEach(p => {
    if (p.category && !p.isFinished) {
      if (!progsByCategory[p.category]) {
        progsByCategory[p.category] = []
      }
      progsByCategory[p.category].push(p)
    }
  })

  const availableCategories = categories.filter(c => (progsByCategory[c] || []).length > 0)
  const categoryProgs = selectedCat ? (progsByCategory[selectedCat] || []) : []

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Lot Draw & Green Room</h2>
        <ThemeToggle />
      </div>
      <p className="text-mutedText text-sm mb-6">
        Draw entry order or assign stage performance code letters to candidates per programme.
      </p>

      {/* Mode Selection */}
      {step === 'mode' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl">
          {MODES.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => pickMode(id)}
              className="bg-card rounded-2xl p-5 flex flex-col items-center gap-2 sm:gap-3 hover:bg-secondary/10 transition text-center shadow-lg border border-secondary/30 h-full"
            >
              <Icon size={28} className="sm:w-8 sm:h-8" color="#7FC3EA" />
              <span className="text-mainText font-medium text-sm sm:text-base">{label}</span>
              <span className="text-mutedText text-xs sm:text-sm">{desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Setup for Topic / Code Letter Shuffle */}
      {step === 'setup' && activeMode && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-2 bg-white/10 text-mainText px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold">
              <activeMode.icon size={14} className="sm:w-4 sm:h-4" /> {activeMode.label} mode
            </span>
            <button onClick={goToModes} className="text-mainText text-xs sm:text-sm underline hover:opacity-80 transition flex items-center gap-1">
              <ArrowLeft size={14} /> Change Mode
            </button>
          </div>

          <div className="bg-card rounded-2xl p-4 max-w-md shadow-lg border border-secondary/30">
            <label className="text-mutedText text-sm block mb-2">Number of candidates</label>
            <input
              type="number"
              min="1"
              max={maxForMode}
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/30 focus:border-mainText text-sm sm:text-base"
              placeholder="e.g. 5"
              value={count}
              onChange={e => setCount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') startDraw() }}
            />
            <button
              onClick={startDraw}
              className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-primary/90 transition"
            >
              <Shuffle size={16} className="sm:w-[18px] sm:h-[18px]" /> Shuffle Cards
            </button>
          </div>
        </>
      )}

      {/* Card Reveal Step */}
      {step === 'draw' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-mutedText text-sm">
              {flippedCount} of {cards.length} revealed
            </p>
            <button
              onClick={newDraw}
              className="flex items-center gap-2 bg-card text-mutedText px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-secondary/30 hover:bg-secondary/10 transition shadow-lg"
            >
              <RefreshCw size={14} className="sm:w-4 sm:h-4" /> New Lot
            </button>
          </div>

          <div key={drawId} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {cards.map((card, i) => (
              <div
                key={i}
                role="button"
                aria-label={card.flipped ? `Revealed value ${card.value}` : 'Face-down lot card'}
                className={`lot-card aspect-square ${card.flipped ? '' : 'lot-card-active'}`}
                onClick={() => flipCard(i)}
              >
                <div className={`lot-card-inner ${card.flipped ? 'is-flipped' : ''}`}>
                  <div className="lot-card-face lot-card-front">
                    <span className="lot-card-number">{card.value}</span>
                  </div>
                  <div className="lot-card-face lot-card-back">
                    <Dice5 size={26} className="lot-card-icon" />
                    <span className="lot-card-label">LOT</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── ASSIGN WORKFLOW: STEP 1 - SELECT CATEGORY ── */}
      {step === 'assign_cat' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={goToModes} className="flex items-center gap-1.5 text-mainText text-xs sm:text-sm font-semibold hover:opacity-80 transition bg-card px-3 py-1.5 rounded-xl border border-secondary/30">
              <ArrowLeft size={14} /> Back to Modes
            </button>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-lg border border-secondary/30 max-w-2xl">
            <h3 className="text-lg font-poppins font-bold text-mainText mb-1">Select Category</h3>
            <p className="text-mutedText text-xs sm:text-sm mb-4">Choose a category to view its registered programmes.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableCategories.map(cat => {
                const colors = CATEGORY_COLORS[cat] || { light: '#9CA3AF', dark: '#6B7280' }
                const count = progsByCategory[cat]?.length || 0
                return (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className="p-4 rounded-xl border border-secondary/30 bg-black/20 hover:bg-white/5 transition flex items-center justify-between group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: colors.light }} />
                      <span className="font-poppins font-bold text-mainText text-sm sm:text-base group-hover:text-accent transition truncate">
                        {cat}
                      </span>
                    </div>
                    <span className="text-mutedText text-xs font-semibold bg-secondary/20 px-2.5 py-1 rounded-full shrink-0">
                      {count} prog{count === 1 ? '' : 's'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── ASSIGN WORKFLOW: STEP 2 - SELECT PROGRAMME ── */}
      {step === 'assign_prog' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setStep('assign_cat')} className="flex items-center gap-1.5 text-mainText text-xs sm:text-sm font-semibold hover:opacity-80 transition bg-card px-3 py-1.5 rounded-xl border border-secondary/30">
              <ArrowLeft size={14} /> Change Category ({selectedCat})
            </button>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-lg border border-secondary/30 max-w-2xl">
            <h3 className="text-lg font-poppins font-bold text-mainText mb-1">Select Programme</h3>
            <p className="text-mutedText text-xs sm:text-sm mb-4">Showing programmes in <strong className="text-mainText font-bold">{selectedCat}</strong>.</p>

            <div className="flex flex-col gap-2.5">
              {categoryProgs.length === 0 ? (
                <p className="text-mutedText text-sm text-center py-6">No programmes found in this category.</p>
              ) : (
                categoryProgs.map(prog => {
                  const candidateCount = students.filter(s => (s.programmeIds || []).includes(prog.id)).length
                  const typeLabel = prog.programmeType || prog.type || ''
                  return (
                    <button
                      key={prog.id}
                      onClick={() => selectProgramme(prog)}
                      className="p-4 rounded-xl border border-secondary/30 bg-black/20 hover:bg-white/5 transition flex items-center justify-between text-left group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-poppins font-bold text-mainText text-sm sm:text-base group-hover:text-accent transition truncate">
                          {prog.name}
                        </p>
                        <p className="text-mutedText text-xs mt-0.5">
                          {selectedCat}{typeLabel ? ` · ${typeLabel}` : ''}
                        </p>
                      </div>
                      <span className="text-mainText text-xs font-semibold bg-accent/20 border border-accent/30 px-3 py-1.5 rounded-full shrink-0">
                        {candidateCount} candidate{candidateCount === 1 ? '' : 's'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ── ASSIGN WORKFLOW: STEP 3 - PARTICIPANT LIST & CODE ASSIGNMENT ── */}
      {step === 'assign_list' && selectedProg && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setStep('assign_prog')} className="flex items-center gap-1.5 text-mainText text-xs sm:text-sm font-semibold hover:opacity-80 transition bg-card px-3 py-1.5 rounded-xl border border-secondary/30">
              <ArrowLeft size={14} /> Change Programme
            </button>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-lg border border-secondary/30 max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-secondary/20 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-poppins font-bold text-mainText">{selectedProg.name}</h3>
                <p className="text-mutedText text-xs sm:text-sm">
                  Category: <strong className="text-mainText font-semibold">{selectedCat}</strong>
                </p>
              </div>
              <span className="text-xs font-bold bg-secondary/20 text-mainText px-3 py-1.5 rounded-full self-start sm:self-center">
                {getProgCandidates(selectedProg).length} Candidates
              </span>
            </div>

            {validationError && (
              <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm p-3.5 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 mb-6">
              {getProgCandidates(selectedProg).map((cand, idx) => {
                const currentCode = assignmentsMap[cand.id] || ''
                const allCandidates = getProgCandidates(selectedProg)
                const candidateCount = Math.max(1, allCandidates.length)
                const codeOptions = Array.from({ length: candidateCount }, (_, i) => String.fromCharCode(65 + i))
                if (currentCode && !codeOptions.includes(currentCode)) {
                  codeOptions.push(currentCode)
                  codeOptions.sort()
                }
                const teamInfo = getTeamInfo(cand)

                // Calculate letters taken by OTHER participants in this programme
                const otherAssignedLetters = new Set(
                  Object.entries(assignmentsMap)
                    .filter(([pId, code]) => pId !== cand.id && Boolean(code))
                    .map(([_, code]) => code)
                )

                return (
                  <div key={cand.id} className="p-3.5 sm:p-4 rounded-xl border border-secondary/30 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-mainText font-bold text-sm sm:text-base truncate">
                        {cand.chestNo ? <span className="text-accent font-extrabold mr-2">#{cand.chestNo}</span> : null}
                        {cand.name}
                      </p>
                      <p className="text-mutedText text-xs mt-0.5 flex items-center gap-1.5 font-medium">
                        {teamInfo.color && (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: teamInfo.color }} />
                        )}
                        <span>{teamInfo.name}</span>
                      </p>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <select
                        className="bg-card text-mainText rounded-xl px-3.5 py-2.5 outline-none border border-secondary/40 focus:border-mainText text-xs sm:text-sm font-bold cursor-pointer transition shadow-sm"
                        value={currentCode}
                        onChange={e => handleAssignmentChange(cand.id, e.target.value)}
                      >
                        <option value="" className="bg-card text-mutedText">Select Code Letter</option>
                        {codeOptions.map(letter => {
                          const isTakenByOther = otherAssignedLetters.has(letter)
                          return (
                            <option
                              key={letter}
                              value={letter}
                              disabled={isTakenByOther}
                              className={`bg-card ${isTakenByOther ? 'text-mutedText opacity-40 font-normal' : 'text-mainText font-bold'}`}
                            >
                              {letter}{isTakenByOther ? ' (Assigned)' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-2 border-t border-secondary/20">
              <button
                onClick={handleSaveAssignments}
                disabled={savingAssignments}
                className="flex-1 bg-primary text-white rounded-xl py-3 px-4 font-semibold text-sm sm:text-base hover:bg-primary/90 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
              >
                <Check size={18} />
                {savingAssignments ? 'Saving Assignments...' : 'Assign Code Letters'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

