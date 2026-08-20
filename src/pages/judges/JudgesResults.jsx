import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient, verifyJudgeClient } from '../../supabase/client'
import { getProgrammes, getStudents, getAllResults, getCategories, getCodeAssignments, PROGRAMME_CATEGORIES } from '../../supabase/queries'
import { ArrowLeft, LogOut, Lock, ChevronDown, ChevronUp, Pencil, Eye, EyeOff, Award } from 'lucide-react'
import { useToast } from '../../components/Toast'
import FilterDropdown from '../../components/FilterDropdown'
import ThemeToggle from '../../components/ThemeToggle'
import { CATEGORY_COLORS } from '../../components/TeamBreakdown'

function calcGrade(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

export default function JudgesResults() {
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [savedResults, setSavedResults] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState(PROGRAMME_CATEGORIES)
  const [expandedId, setExpandedId] = useState(null)
  const [progAssignments, setProgAssignments] = useState({})

  // Edit flow state
  const [editProg, setEditProg] = useState(null)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [vName, setVName] = useState('')
  const [vPassword, setVPassword] = useState('')
  const [vShowPassword, setVShowPassword] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaExpiresAt, setCaptchaExpiresAt] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [vLoading, setVLoading] = useState(false)
  const [vCaptcha, setVCaptcha] = useState('')
  const [vError, setVError] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  const [entryRows, setEntryRows] = useState([])

  const navigate = useNavigate()
  const toast = useToast()

  const loadResults = () => {
    getAllResults().then(data => {
      setSavedResults(data || [])
    }).catch(err => {
      console.error('Failed to load results:', err)
      toast('Failed to load results: ' + err.message, 'error')
    })
  }

  useEffect(() => {
    getProgrammes().then(setProgrammes).catch(err => console.error('Failed to load programmes:', err))
    getStudents().then(setStudents).catch(err => console.error('Failed to load students:', err))
    getCategories().then(({ programme }) => setCategories(programme)).catch(err => console.error('Failed to load categories:', err))
    loadResults()
  }, [])

  const getCandidatesForProg = (prog) => {
    if (!prog) return []
    const registered = students.filter(s => (s.programmeIds || []).includes(prog.id))

    if (registered.length === 0) {
      return Array.from({ length: 6 }, (_, i) => {
        const letter = String.fromCharCode(65 + i)
        return { id: `anon_${prog.id}_${letter}`, name: `Performance ${letter}`, code: letter, candidateNo: i + 1 }
      })
    }

    const sorted = [...registered].sort((a, b) => (a.chestNo || a.name || a.id).localeCompare(b.chestNo || b.name || b.id))

    return sorted.map((cand, idx) => ({
      id: cand.id,
      name: cand.name,
      chestNo: cand.chestNo,
      code: progAssignments[cand.id] || cand.performanceCode || String.fromCharCode(65 + (idx % 26)),
      candidateNo: idx + 1,
    }))
  }

  const getStudentObj = (id) => {
    const s = students.find(s => s.id === id)
    return s ? { studentId: s.id, name: s.name, photoURL: s.photoURL } : null
  }

  const getProgrammeType = (prog) => prog?.programmeType || prog?.type || prog?.programme_type || ''

  const handleLogout = async () => {
    await judgeClient.auth.signOut()
    navigate('/judges/login')
  }

  const getResultNoMap = () => {
    const map = {}
    savedResults.forEach(r => {
      if (r.programmeId) map[r.programmeId] = r.resultNo
    })
    return map
  }

  const resultNoMap = getResultNoMap()

  const catCountByCategory = {}
  categories.forEach(c => { catCountByCategory[c] = 0 })
  programmes.forEach(p => {
    if (p.category && catCountByCategory[p.category] !== undefined) {
      catCountByCategory[p.category] += 1
    }
  })

  const catOptions = [
    { label: 'All Categories', value: '' },
    ...categories.map(c => ({
      label: `${c} (${catCountByCategory[c] || 0})`,
      value: c,
    }))
  ]

  const filteredProgrammes = categoryFilter
    ? programmes.filter(p => categoryFilter === 'General' ? p.category === 'General' : p.category === categoryFilter)
    : programmes

  const lockedProgrammeIds = new Set(savedResults.filter(r => r.locked).map(r => r.programmeId))

  const notSubmitted = filteredProgrammes
    .filter(p => !lockedProgrammeIds.has(p.id) && !p.isFinished)
    .sort((a, b) => (resultNoMap[a.id] || 999) - (resultNoMap[b.id] || 999) || a.name.localeCompare(b.name))

  const validProgrammeMap = new Map(programmes.map(p => [p.id, p]))
  const lockedResults = savedResults.filter(r => {
    const prog = validProgrammeMap.get(r.programmeId)
    return r.locked && prog && prog.isFinished
  })
  const filteredLockedResults = categoryFilter
    ? lockedResults.filter(r => {
      const prog = validProgrammeMap.get(r.programmeId)
      return categoryFilter === 'General' ? prog?.category === 'General' : prog?.category === categoryFilter
    })
    : lockedResults

  const resetPlacements = () => {
    setEntryRows([])
  }

  const updateRowField = (index, field, value) => {
    setEntryRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const openEditFlow = (prog) => {
    setIsFirstTime(false)
    setEditProg(prog)
    setPromptOpen(true)
  }

  const openNewEntry = async (prog) => {
    setIsFirstTime(true)
    setEditProg(prog)
    setEditError('')
    const assignmentsMap = await getCodeAssignments(prog.id)
    setProgAssignments(assignmentsMap || {})

    const cands = getCandidatesForProg(prog)
    const initialRows = cands.map((cand, idx) => ({
      studentId: cand.id,
      code: cand.code,
      candidateNo: idx + 1,
      place: '',
      points: '',
    }))

    setEntryRows(initialRows)
    setEditOpen(true)
  }

  const closePrompt = () => {
    setPromptOpen(false)
  }

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const clearCaptchaState = () => {
    setCaptcha('')
    setCaptchaId('')
    setCaptchaExpiresAt('')
    setVCaptcha('')
  }

  const loadCaptcha = async ({ retries = 2, delayMs = 450 } = {}) => {
    setVError('')
    setCaptchaLoading(true)

    const sessionResp = await judgeClient.auth.getSession()
    if (!sessionResp?.data?.session?.user) {
      const missingSessionError = new Error('No authenticated judge session available')
      missingSessionError.code = 'NO_AUTH_SESSION'
      setVError('Your session has expired. Please sign in again.')
      setCaptchaLoading(false)
      throw missingSessionError
    }

    let lastError = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await sleep(delayMs * attempt)
      }
      const { data, error } = await judgeClient.rpc('judge_create_captcha')
      if (!error && data?.captcha) {
        setCaptcha(data.captcha)
        setCaptchaId(data.id || '')
        setCaptchaExpiresAt(data.expiresAt || '')
        setCaptchaLoading(false)
        return data
      }
      lastError = error
    }

    console.error('judge_create_captcha RPC error:', lastError)
    const errMessage = lastError?.message || ''
    const is404 = lastError?.status === 404 || errMessage.includes('404') || errMessage.includes('Not Found')
    const isCrypt = errMessage.includes('crypt(') || errMessage.includes('42883') || errMessage.includes('does not exist')
    const msg =
      is404 ? 'Captcha service unavailable. Run judge_reverify_flow.sql in Supabase to create judge_create_captcha().' :
        isCrypt ? 'Server extension missing. Enable pgcrypto in Supabase extensions.' :
          (errMessage || 'Failed to load security verification code. Please try again.')

    setVError(msg)
    setCaptchaLoading(false)
    throw lastError || new Error(msg)
  }

  const openVerifyModal = async () => {
    setVError('')
    setVCaptcha('')
    setVName('')
    setVPassword('')
    setVerifyOpen(true)
    try {
      await loadCaptcha({ retries: 2, delayMs: 450 })
    } catch {
      // Error state handled inside loadCaptcha
    }
  }

  const closeVerify = () => {
    setVerifyOpen(false)
    clearCaptchaState()
  }

  const handleVerify = async () => {
    if (!vName.trim() || !vPassword) {
      setVError('Please enter your judge name/email and password.')
      return
    }
    if (!vCaptcha.trim()) {
      setVError('Please enter the 6-character security code shown above.')
      return
    }

    setVLoading(true)
    setVError('')

    const { data: authData, error: authError } = await judgeClient.rpc('judge_verify_credentials', {
      p_judge_email: vName.trim(),
      p_judge_password: vPassword,
    })

    setVLoading(false)

    if (authError || !authData?.valid) {
      const is404 = authError?.status === 404 || authError?.message?.includes('404')
      if (is404) {
        setVError('Judge credential service unavailable. Run judge_reverify_flow.sql in Supabase to create judge_verify_credentials().')
        return
      }
      setVError(authError?.message || 'Invalid judge name or password.')
      setVCaptcha('')
      await loadCaptcha()
      return
    }

    setVerifyOpen(false)
    await openEdit(editProg)
  }

  const openEdit = async (prog, preserveFields = false) => {
    const latest = savedResults.find(r => r.programmeId === prog.id)
    const assignmentsMap = await getCodeAssignments(prog.id)
    setProgAssignments(assignmentsMap || {})
    const cands = getCandidatesForProg(prog)

    if (!preserveFields) {
      const initialRows = cands.map((cand, idx) => {
        const existingEntry = Array.isArray(latest?.entries)
          ? latest.entries.find(e => e.studentId === cand.id)
          : null

        let savedPlace = existingEntry?.place || existingEntry?.label || ''
        let savedPoints = existingEntry?.points != null ? String(existingEntry.points) : ''

        if (!existingEntry && latest) {
          if (latest.first?.studentId === cand.id) {
            savedPlace = latest.first.label || '1st Place'
            savedPoints = String(latest.first.points || '')
          } else if (latest.second?.studentId === cand.id) {
            savedPlace = latest.second.label || '2nd Place'
            savedPoints = String(latest.second.points || '')
          } else if (latest.third?.studentId === cand.id) {
            savedPlace = latest.third.label || '3rd Place'
            savedPoints = String(latest.third.points || '')
          }
        }

        return {
          studentId: cand.id,
          code: cand.code,
          candidateNo: idx + 1,
          place: savedPlace,
          points: savedPoints,
        }
      })
      setEntryRows(initialRows)
    }
    setEditError('')
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setEditProg(null)
    clearCaptchaState()
    resetPlacements()
  }

  const handleSaveEdit = async () => {
    if (!editProg) return
    if (entryRows.length === 0) {
      setEditError('No candidates available to submit results for.')
      return
    }

    const candidates = getCandidatesForProg(editProg)
    const entries = entryRows.map((row, idx) => {
      const cand = candidates[idx] || candidates.find(c => c.id === row.studentId)
      const s = getStudentObj(row.studentId)
      const pts = Number(row.points) || 0
      const gr = calcGrade(row.points)
      return {
        studentId: row.studentId,
        name: s?.name || cand?.name || `Candidate ${row.candidateNo}`,
        code: cand?.code || String.fromCharCode(65 + (idx % 26)),
        candidateNo: row.candidateNo,
        place: row.place.trim(),
        label: row.place.trim() || '',
        points: pts,
        grade: gr,
      }
    })

    const sortedByRankOrPts = [...entries].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
    const firstEntry = entries.find(e => e.place.toLowerCase().includes('1st') || e.place === '1') || sortedByRankOrPts[0] || null
    const secondEntry = entries.find(e => e.place.toLowerCase().includes('2nd') || e.place === '2') || sortedByRankOrPts[1] || null
    const thirdEntry = entries.find(e => e.place.toLowerCase().includes('3rd') || e.place === '3') || sortedByRankOrPts[2] || null

    const payload = {
      programmeId: editProg.id,
      name: editProg.name,
      entries: entries,
      first: firstEntry,
      second: secondEntry,
      third: thirdEntry,
      updatedAt: new Date().toISOString(),
      locked: true,
    }

    setSaving(true)
    setEditError('')

    const { data: existingRow } = await judgeClient
      .from('results')
      .select('id')
      .eq('programmeId', editProg.id)
      .maybeSingle()

    let error = null
    if (existingRow) {
      const res = await judgeClient.from('results').update(payload).eq('id', existingRow.id)
      error = res.error
    } else {
      const res = await judgeClient.from('results').insert({
        ...payload,
        ...(resultNoMap[editProg.id] ? { resultNo: resultNoMap[editProg.id] } : {}),
      })
      error = res.error
    }

    if (error) {
      console.error('Result submit failed:', error)
      setEditError(error?.message || 'Failed to submit the result. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    closeEdit()
    toast('Result saved and locked!')
    loadResults()
  }

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-mainText hover:opacity-80 transition">
          <ArrowLeft size={18} /> Home
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-mainText px-3 py-1.5 rounded-xl font-semibold transition text-xs sm:text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 mb-6 shadow-sm border border-secondary/30">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-2">Judges Panel</h2>
        <p className="text-mutedText text-xs sm:text-sm">Submit results per programme. Locked results require judge authentication and captcha verification to edit.</p>
      </div>

      <div className="max-w-xs mx-auto mb-5">
        <FilterDropdown
          dark
          label="All Categories"
          options={catOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-poppins font-bold text-mainText mb-3 flex items-center gap-2">
          Pending Submissions ({notSubmitted.length})
        </h3>
        {notSubmitted.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 text-center text-mutedText text-sm border border-secondary/30">
            All programmes in this view have been submitted and locked.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notSubmitted.map(prog => (
              <div key={prog.id} className="bg-card rounded-xl p-4 shadow-sm border border-secondary/30 flex flex-col justify-between">
                <div className="mb-3">
                  <p className="text-mainText font-semibold text-sm sm:text-base truncate">
                    {resultNoMap[prog.id] ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{resultNoMap[prog.id]}</span> : null}
                    {prog.name}
                  </p>
                  <p className="text-mutedText text-xs mt-0.5">{prog.category}{getProgrammeType(prog) ? ` · ${getProgrammeType(prog)}` : ''}</p>
                </div>
                <button
                  onClick={() => openNewEntry(prog)}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-2 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
                >
                  <Award size={14} /> Submit Result
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-poppins font-bold text-mainText mb-3 flex items-center gap-2">
          <Lock size={16} className="text-success" /> Submitted & Locked ({filteredLockedResults.length})
        </h3>
        {filteredLockedResults.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 text-center text-mutedText text-sm border border-secondary/30">
            No locked results yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLockedResults.map(result => {
              const prog = validProgrammeMap.get(result.programmeId)
              const isExpanded = expandedId === result.id
              const displayEntries = (result.entries && result.entries.length > 0)
                ? result.entries
                : [
                    result.first && { ...result.first, place: result.first.label || '1st Place' },
                    result.second && { ...result.second, place: result.second.label || '2nd Place' },
                    result.third && { ...result.third, place: result.third.label || '3rd Place' },
                  ].filter(Boolean)

              return (
                <div key={result.id} className="bg-card rounded-xl p-4 shadow-sm border border-secondary/30">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : result.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-mainText font-semibold text-sm sm:text-base truncate">
                        {result.resultNo ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{result.resultNo}</span> : null}
                        {result.name || prog?.name}
                      </p>
                      <p className="text-mutedText text-xs">{prog?.category || ''}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-success/15 text-success border border-success/40 shrink-0">
                      <Lock size={11} /> LOCKED
                    </span>
                    <button className="text-mutedText shrink-0 ml-2">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-secondary/30 space-y-2">
                      {displayEntries.map((data, idx) => (
                        <div key={idx} className="bg-secondary/15 rounded-xl p-3 border border-secondary/30">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold min-w-[3rem] text-accent">
                              Candidate {data.candidateNo || idx + 1}
                            </span>
                            {data.place && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                                {data.place}
                              </span>
                            )}
                            <span className="text-accent font-bold text-sm sm:text-base ml-auto">{data.points || 0} pts</span>
                            {data.grade && data.grade !== '-' && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                data.grade === 'A+' ? 'bg-success/15 text-success' :
                                data.grade === 'A' ? 'bg-blue-500/15 text-blue-400' :
                                data.grade === 'B' ? 'bg-yellow-500/15 text-yellow-400' :
                                'bg-orange-500/15 text-orange-400'
                              }`}>
                                {data.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => openEditFlow(prog || { id: result.programmeId, name: result.name })}
                        className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl py-2 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-amber-500/30 mt-2"
                      >
                        <Pencil size={14} /> Re-verify & Edit
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {promptOpen && editProg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto" onClick={closePrompt}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md my-8 shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-poppins font-bold text-mainText mb-2">Judge Security Verification</h3>
            <p className="text-mutedText text-sm mb-4">Editing a locked result requires judge credentials and security code verification.</p>
            <div className="flex gap-2">
              <button onClick={() => { closePrompt(); openVerifyModal() }} className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold text-sm hover:bg-primary/90 transition">
                Proceed to Verify
              </button>
              <button onClick={closePrompt} className="bg-secondary/15 text-mainText rounded-xl p-3 font-semibold text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyOpen && editProg && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 overflow-y-auto" onClick={() => !vLoading && closeVerify()}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md my-8 shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-poppins font-bold text-mainText mb-1">Judge Credentials & Security Code</h3>
            <p className="text-mutedText text-xs sm:text-sm mb-4 truncate">{editProg.name} · {editProg.category}</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-mutedText text-xs mb-1 block">Judge Account Email</label>
                <input
                  type="email"
                  placeholder="Judge Name / Email"
                  className="w-full bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/30 focus:border-mainText text-sm font-semibold"
                  value={vName}
                  onChange={e => setVName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-mutedText text-xs mb-1 block">Judge Password</label>
                <input
                  type="password"
                  placeholder="Judge Password"
                  className="w-full bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/30 focus:border-mainText text-sm font-semibold"
                  value={vPassword}
                  onChange={e => setVPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-mutedText text-xs mb-1 block">Security Verification Code</label>
                <div className="bg-black/40 rounded-xl p-3 mb-2 flex items-center justify-between border border-secondary/30">
                  <span className="font-mono font-bold text-lg text-accent tracking-widest select-none">
                    {captchaLoading ? 'Loading...' : captcha || '------'}
                  </span>
                  <span className="text-xs text-mutedText">
                    {captchaLoading ? '' : captchaExpiresAt ? `Expires in ${formatTimeLeft(captchaExpiresAt)}` : ''}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  className="w-full bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/30 focus:border-mainText text-sm font-semibold tracking-widest text-center uppercase"
                  value={vCaptcha}
                  onChange={e => setVCaptcha(e.target.value.toUpperCase())}
                />
              </div>

              {vError && <p className="text-red-400 text-xs mt-1 font-semibold">{vError}</p>}
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={closeVerify} disabled={vLoading} className="bg-white/10 text-mainText rounded-xl p-3 font-semibold text-sm flex-1 hover:bg-white/15 transition">
                Cancel
              </button>
              <button onClick={handleVerify} disabled={vLoading} className="bg-primary text-white rounded-xl p-3 font-semibold text-sm flex-1 hover:bg-primary/90 transition">
                {vLoading ? 'Verifying...' : 'Verify & Edit'}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadCaptcha({ retries: 2, delayMs: 450 })}
                disabled={captchaLoading}
                className="flex-1 bg-secondary/15 text-mainText rounded-xl p-3 font-semibold text-sm hover:bg-secondary/20 transition"
              >
                {captchaLoading ? 'Refreshing...' : 'Reload security code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && editProg && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/70 overflow-y-auto" onClick={() => !saving && closeEdit()}>
          <div className="bg-card rounded-2xl p-5 sm:p-6 w-full max-w-xl my-8 shadow-2xl border border-secondary/30 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-poppins font-bold text-mainText mb-1">{isFirstTime ? 'Submit Result' : 'Edit Result'}</h3>
            <p className="text-mutedText text-sm mb-4 truncate">{editProg.name} · {editProg.category}{getProgrammeType(editProg) ? ` · ${getProgrammeType(editProg)}` : ''}</p>

            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-mutedText px-1 mb-2">
              <span className="col-span-3">Candidate</span>
              <span className="col-span-4">Place</span>
              <span className="col-span-3 text-center">Points</span>
              <span className="col-span-2 text-center">Grade</span>
            </div>

            <div className="overflow-y-auto max-h-[50vh] pr-1 space-y-2.5 my-1 custom-scrollbar">
              {entryRows.map((row, i) => {
                const grade = calcGrade(row.points)

                return (
                  <div key={row.studentId || i} className="grid grid-cols-12 gap-2 items-center bg-black/20 p-2.5 rounded-xl border border-secondary/20">
                    <div className="col-span-3 text-mainText font-bold text-xs sm:text-sm">
                      Candidate {row.candidateNo}
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Enter Place"
                        className="w-full bg-black/20 text-mainText rounded-xl p-2 outline-none border border-secondary/30 focus:border-mainText text-xs sm:text-sm font-semibold"
                        value={row.place}
                        onChange={e => updateRowField(i, 'place', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Pts"
                        min="0"
                        max="10"
                        className="w-full bg-black/20 text-mainText rounded-xl p-2 outline-none border border-secondary/30 focus:border-mainText text-center text-xs sm:text-sm font-bold"
                        value={row.points}
                        onChange={e => updateRowField(i, 'points', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <div className={`flex items-center justify-center w-full py-2 rounded-xl text-xs font-bold ${grade === '-' ? 'bg-secondary/15 border border-secondary/30 text-mutedText' :
                          grade === 'A+' ? 'bg-success/15 text-success border border-success/40' :
                            grade === 'A' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40' :
                              grade === 'B' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/40' :
                                'bg-orange-500/15 text-orange-400 border border-orange-500/40'
                        }`}>
                        {grade}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {editError && <p className="text-red-400 text-sm mt-2 font-semibold">{editError}</p>}
            <div className="flex gap-2 mt-4 pt-3 border-t border-secondary/30 shrink-0">
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition text-sm">
                {saving ? 'Saving...' : 'Save & Lock Result'}
              </button>
              <button onClick={() => !saving && closeEdit()} className="bg-secondary/15 text-mainText rounded-xl p-3 font-semibold transition">
                Cancel
              </button>
            </div >
          </div >
        </div >
      )}
    </div >
  )
}
