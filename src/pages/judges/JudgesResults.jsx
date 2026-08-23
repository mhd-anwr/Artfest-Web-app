import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient, verifyJudgeClient } from '../../supabase/client'
import { getProgrammes, getStudents, getAllResults, getCategories, getCodeAssignments, getTeams, PROGRAMME_CATEGORIES } from '../../supabase/queries'
import { ArrowLeft, LogOut, Lock, ChevronDown, ChevronUp, Pencil, Eye, EyeOff, Award } from 'lucide-react'
import { useToast } from '../../components/Toast'
import FilterDropdown from '../../components/FilterDropdown'
import ThemeToggle from '../../components/ThemeToggle'
import { CATEGORY_COLORS } from '../../components/TeamBreakdown'

class JudgesErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('JudgesResults rendering error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-mainBackground flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="bg-card rounded-2xl p-6 sm:p-8 max-w-md w-full border border-red-500/40 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-mainText">Judge Panel Error</h2>
            <p className="text-mutedText text-sm leading-relaxed">
              An unexpected display error occurred while rendering the Judge Panel.
            </p>
            {this.state.error?.message && (
              <div className="bg-black/30 p-3 rounded-xl text-left border border-red-500/20">
                <p className="text-xs font-mono text-red-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary text-white py-2.5 px-4 rounded-xl font-semibold text-sm hover:opacity-90 transition shadow-sm"
              >
                Reload Page
              </button>
              <button
                onClick={async () => {
                  await judgeClient.auth.signOut().catch(() => {})
                  window.location.href = '/judges/login'
                }}
                className="flex-1 bg-secondary/20 text-mainText py-2.5 px-4 rounded-xl font-semibold text-sm hover:bg-secondary/30 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function calcGrade(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

function getOrdinalLabel(index) {
  const n = index + 1
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${(s[(v - 20) % 10] || s[v] || s[0])}`
}

function JudgesResultsInner() {
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
  const [teams, setTeams] = useState([])

  const navigate = useNavigate()
  const toast = useToast()

  const loadResults = () => {
    getAllResults().then(data => {
      setSavedResults(Array.isArray(data) ? data : [])
    }).catch(err => {
      console.error('Failed to load results:', err)
      toast('Failed to load results: ' + err.message, 'error')
    })
  }

  useEffect(() => {
    getProgrammes().then(data => setProgrammes(Array.isArray(data) ? data : [])).catch(err => console.error('Failed to load programmes:', err))
    getStudents().then(data => setStudents(Array.isArray(data) ? data : [])).catch(err => console.error('Failed to load students:', err))
    getTeams().then(data => setTeams(Array.isArray(data) ? data : [])).catch(err => console.error('Failed to load teams:', err))
    getCategories().then(res => {
      if (res && Array.isArray(res.programme)) setCategories(res.programme)
    }).catch(err => console.error('Failed to load categories:', err))
    loadResults()
  }, [])

  const safeCategories = Array.isArray(categories) && categories.length > 0 ? categories : PROGRAMME_CATEGORIES
  const safeProgrammes = Array.isArray(programmes) ? programmes : []
  const safeStudents = Array.isArray(students) ? students : []
  const safeSavedResults = Array.isArray(savedResults) ? savedResults : []

  const getCandidatesForProg = (prog, currentAssignments = null) => {
    if (!prog) return []
    const map = currentAssignments !== null ? currentAssignments : (progAssignments || {})
    const registered = safeStudents.filter(s => s && Array.isArray(s.programmeIds) && s.programmeIds.includes(prog.id))
    const baseCandidates = registered.length > 0
      ? [...registered].sort((a, b) => (a.chestNo || a.name || a.id || '').localeCompare(b.chestNo || b.name || b.id || ''))
      : []

    const mapKeys = Object.keys(map)

    if (mapKeys.length > 0) {
      const assignedCandidates = []

      if (baseCandidates.length > 0) {
        baseCandidates.forEach(cand => {
          const code = map[cand.id]
          if (code) {
            assignedCandidates.push({
              id: cand.id,
              name: cand.name || 'Candidate',
              chestNo: cand.chestNo || '',
              code: String(code),
            })
          }
        })
      } else {
        mapKeys.forEach(key => {
          const code = map[key]
          if (code) {
            assignedCandidates.push({
              id: key,
              name: `Performance ${code}`,
              chestNo: '',
              code: String(code),
            })
          }
        })
      }

      if (assignedCandidates.length > 0) {
        return assignedCandidates.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }))
      }
    }

    if (baseCandidates.length > 0) {
      return baseCandidates.map((cand, idx) => ({
        id: cand.id,
        name: cand.name || 'Candidate',
        chestNo: cand.chestNo || '',
        code: cand.performanceCode || String.fromCharCode(65 + (idx % 26)),
      }))
    }

    return []
  }

  const getStudentObj = (id) => {
    const s = safeStudents.find(s => s && s.id === id)
    return s ? { studentId: s.id, name: s.name, photoURL: s.photoURL } : null
  }

  const getProgrammeType = (prog) => prog?.programmeType || prog?.type || prog?.programme_type || ''

  const handleLogout = async () => {
    await judgeClient.auth.signOut()
    navigate('/judges/login')
  }

  const getResultNoMap = () => {
    const map = {}
    safeSavedResults.forEach(r => {
      if (r && r.programmeId) map[r.programmeId] = r.resultNo
    })
    return map
  }

  const resultNoMap = getResultNoMap()

  const catCountByCategory = {}
  safeCategories.forEach(c => { catCountByCategory[c] = 0 })
  safeProgrammes.forEach(p => {
    if (p && p.category && catCountByCategory[p.category] !== undefined) {
      catCountByCategory[p.category] += 1
    }
  })

  const catOptions = [
    { label: 'All Categories', value: '' },
    ...safeCategories.map(c => ({
      label: `${c} (${catCountByCategory[c] || 0})`,
      value: c,
    }))
  ]

  const filteredProgrammes = categoryFilter
    ? safeProgrammes.filter(p => p && (categoryFilter === 'General' ? p.category === 'General' : p.category === categoryFilter))
    : safeProgrammes

  const lockedProgrammeIds = new Set(safeSavedResults.filter(r => r && r.locked).map(r => r.programmeId))

  const notSubmitted = filteredProgrammes
    .filter(p => p && p.id && !lockedProgrammeIds.has(p.id) && !p.isFinished)
    .sort((a, b) => (resultNoMap[a.id] || 999) - (resultNoMap[b.id] || 999) || (a.name || '').localeCompare(b.name || ''))

  const validProgrammeMap = new Map(safeProgrammes.filter(Boolean).map(p => [p.id, p]))
  const lockedResults = safeSavedResults.filter(r => {
    if (!r) return false
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

    const cands = getCandidatesForProg(prog, assignmentsMap || {})
    const initialRows = cands.map((_, idx) => ({
      place: getOrdinalLabel(idx),
      code: '',
      points: '',
      grade: '',
    }))

    setEntryRows(initialRows)
    setEditOpen(true)
  }

  const closePrompt = () => {
    setPromptOpen(false)
  }

  const formatTimeLeft = (dateStr) => {
    const diff = new Date(dateStr) - new Date()
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
      setVError('Your session has expired. Please sign in again.')
      setCaptchaLoading(false)
      throw new Error('No session')
    }

    let lastError = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await new Promise(res => setTimeout(res, delayMs * attempt))
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

    setVError('Captcha service unavailable.')
    setCaptchaLoading(false)
    throw lastError
  }

  const openVerifyModal = async () => {
    setVError('')
    setVCaptcha('')
    setVName('')
    setVPassword('')
    setVerifyOpen(true)
    try { await loadCaptcha() } catch { }
  }

  const closeVerify = () => {
    setVerifyOpen(false)
    clearCaptchaState()
  }

  const verifyJudgeCredentials = async (email, password) => {
    try {
      const { data, error } = await judgeClient.rpc('judge_credentials', {
        p_judge_email: email,
        p_judge_password: password,
      })
      if (!error && data) {
        return { valid: Boolean(data.valid), message: data.valid ? '' : 'Invalid judge credentials.' }
      }
    } catch (e) {
      console.warn('judge_credentials RPC fallback:', e)
    }

    try {
      const { data, error } = await judgeClient.rpc('judge_verify_credentials', {
        p_judge_email: email,
        p_judge_password: password,
      })
      if (!error && data) {
        return { valid: Boolean(data.valid), message: data.valid ? '' : 'Invalid judge credentials.' }
      }
    } catch (e) {
      console.warn('judge_verify_credentials RPC fallback:', e)
    }

    try {
      const { data, error } = await verifyJudgeClient.auth.signInWithPassword({
        email: email,
        password: password,
      })
      if (!error && data?.user) {
        return { valid: true }
      }
    } catch (e) {
      console.warn('verifyJudgeClient signIn fallback:', e)
    }

    return { valid: false, message: 'Invalid judge credentials.' }
  }

  const handleVerify = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    if (!vName.trim() || !vPassword) {
      setVError('Please enter your judge name/email and password.')
      return
    }
    if (!vCaptcha.trim()) {
      setVError('Please enter the security code.')
      return
    }

    setVLoading(true)
    setVError('')

    const credResult = await verifyJudgeCredentials(vName.trim(), vPassword)
    if (!credResult.valid) {
      setVError('Invalid judge credentials.')
      setVCaptcha('')
      setVLoading(false)
      return
    }

    if (vCaptcha.trim().toUpperCase() !== (captcha || '').trim().toUpperCase()) {
      setVError('Invalid security code.')
      setVCaptcha('')
      setVLoading(false)
      return
    }

    setVLoading(false)
    setVerifyOpen(false)
    await openEdit(editProg)
  }

  const openEdit = async (prog, preserveFields = false) => {
    const latest = savedResults.find(r => r.programmeId === prog.id)
    const assignmentsMap = await getCodeAssignments(prog.id)
    setProgAssignments(assignmentsMap || {})
    const cands = getCandidatesForProg(prog, assignmentsMap || {})

    if (!preserveFields) {
      const initialRows = cands.map((cand, idx) => {
        let savedCode = ''
        let savedPlace = getOrdinalLabel(idx)
        let savedPoints = ''
        let savedGrade = ''

        if (latest) {
          if (Array.isArray(latest.entries) && latest.entries.length > 0) {
            const matchedEntry = latest.entries[idx] || latest.entries.find(
              e => (e.code && e.code === cand.code) ||
                (e.codeLetter && e.codeLetter === cand.code) ||
                (e.studentId && e.studentId === cand.id)
            )

            if (matchedEntry) {
              savedPlace = matchedEntry.place || matchedEntry.label || getOrdinalLabel(idx)
              savedPoints = matchedEntry.points != null ? String(matchedEntry.points) : ''
              savedCode = matchedEntry.code || matchedEntry.codeLetter || ''
              savedGrade = matchedEntry.grade || ''
            }
          } else {
            if (idx === 0 && latest.first) {
              savedCode = latest.first.code || latest.first.codeLetter || ''
              savedPlace = latest.first.label || '1st'
              savedPoints = latest.first.points != null ? String(latest.first.points) : ''
              savedGrade = latest.first.grade || ''
            } else if (idx === 1 && latest.second) {
              savedCode = latest.second.code || latest.second.codeLetter || ''
              savedPlace = latest.second.label || '2nd'
              savedPoints = latest.second.points != null ? String(latest.second.points) : ''
              savedGrade = latest.second.grade || ''
            } else if (idx === 2 && latest.third) {
              savedCode = latest.third.code || latest.third.codeLetter || ''
              savedPlace = latest.third.label || '3rd'
              savedPoints = latest.third.points != null ? String(latest.third.points) : ''
              savedGrade = latest.third.grade || ''
            }
          }
        }

        return {
          place: savedPlace,
          code: savedCode,
          points: savedPoints,
          grade: savedGrade,
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

    const cands = getCandidatesForProg(editProg, progAssignments || {})
    const validCodesSet = new Set(cands.map(c => (c.code || '').trim().toUpperCase()).filter(Boolean))

    // Filter entryRows to only rows where a code letter was selected
    const activeRows = entryRows.filter(r => (r.code || '').trim() !== '')

    if (activeRows.length === 0) {
      const msg = 'Please select at least one Code Letter before submitting.'
      setEditError(msg)
      return toast(msg, 'error')
    }

    const enteredCodes = activeRows.map(r => (r.code || '').trim().toUpperCase())
    const duplicateCodes = enteredCodes.filter((item, index) => enteredCodes.indexOf(item) !== index)
    if (duplicateCodes.length > 0) {
      const msg = `Code Letter "${duplicateCodes[0]}" is selected in multiple positions.`
      setEditError(msg)
      return toast(msg, 'error')
    }

    for (const r of activeRows) {
      const trimmedCode = (r.code || '').trim().toUpperCase()
      if (trimmedCode && validCodesSet.size > 0 && !validCodesSet.has(trimmedCode)) {
        const msg = `Code Letter "${trimmedCode}" is invalid for this programme.`
        setEditError(msg)
        return toast(msg, 'error')
      }
    }

    const teamMap = {}
    teams.forEach(t => { teamMap[t.id] = t.name; teamMap[t.name] = t.name })

    const entries = activeRows.map((row, idx) => {
      const trimmedCode = (row.code || '').trim().toUpperCase()

      let studentId = null
      let studentName = ''

      if (progAssignments) {
        const matchPid = Object.keys(progAssignments).find(pid => (progAssignments[pid] || '').toUpperCase() === trimmedCode)
        if (matchPid) {
          studentId = matchPid
          const sObj = getStudentObj(matchPid)
          if (sObj) studentName = sObj.name
        }
      }

      if (!studentId) {
        const cand = cands.find(c => (c.code || '').trim().toUpperCase() === trimmedCode)
        if (cand) {
          studentId = cand.id
          studentName = cand.name
        }
      }

      if (!studentId) {
        studentId = `anon_${editProg.id}_${trimmedCode}`
        studentName = `Participant ${trimmedCode}`
      }

      const pts = Number(row.points) || 0
      const gr = (row.grade || '').trim() || 'No Grade'
      const placeStr = row.place && row.place.trim() ? row.place.trim() : getOrdinalLabel(idx)

      const sObj = getStudentObj(studentId) || cands.find(c => c.id === studentId)
      const teamId = sObj?.team || sObj?.teamId || null
      const teamName = teamId ? (teamMap[teamId] || teamId) : ''

      return {
        candidateId: studentId,
        studentId: studentId,
        name: studentName,
        team: teamName,
        teamName: teamName,
        teamId: teamId,
        codeLetter: trimmedCode,
        code: trimmedCode,
        candidateNo: idx + 1,
        place: placeStr,
        label: placeStr,
        points: pts,
        grade: gr,
      }
    })

    const firstEntry = entries.find(e => (e.place || '').toLowerCase().includes('1st') || e.place === '1') || entries[0] || null
    const secondEntry = entries.find(e => (e.place || '').toLowerCase().includes('2nd') || e.place === '2') || entries[1] || null
    const thirdEntry = entries.find(e => (e.place || '').toLowerCase().includes('3rd') || e.place === '3') || entries[2] || null

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
      console.error('Result save error:', error)
      const errorMsg = error?.message || 'Failed to submit the result.'
      setEditError(errorMsg)
      toast(errorMsg, 'error')
      setSaving(false)
      return
    }

    // Sync programme.isFinished = true in database so all result listings & previews display the result
    await judgeClient.from('programmes').update({ isFinished: true }).eq('id', editProg.id).catch(err => console.error('Prog update error:', err))
    await supabase.from('programmes').update({ isFinished: true }).eq('id', editProg.id).catch(err => console.error('Prog update error:', err))

    // Update local programmes state
    setProgrammes(prev => prev.map(p => p.id === editProg.id ? { ...p, isFinished: true } : p))

    toast(isFirstTime ? 'Result submitted successfully!' : 'Result updated successfully!')
    setSaving(false)
    closeEdit()

    // Reload all programmes & results to keep everything 100% in sync
    getProgrammes().then(setProgrammes).catch(err => console.error('Failed to load programmes:', err))
    loadResults()
  }

  return (
    <div className="min-h-screen bg-[#01233D] text-white p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Atmospheric radial background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#017D8B]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#01B998]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-[#19BB47]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* ── Top Header Bar ── */}
        <div className="flex items-center justify-between mb-6 border-b border-[#017D8B]/30 pb-4">
          <button onClick={() => navigate('/judges')} className="flex items-center gap-2 bg-[#013157] hover:bg-[#012847] border border-[#017D8B] text-white font-semibold transition text-sm px-4 py-2 rounded-xl shadow-sm">
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 font-semibold text-xs sm:text-sm transition bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-poppins font-bold text-white flex items-center gap-3">
            Judge Panel — Submit Results <span className="w-2.5 h-2.5 rounded-full bg-[#01B998] inline-block animate-pulse" />
          </h2>
          <p className="text-[#D8EDE4] text-xs sm:text-sm mt-1">Select code letter, points, and grade for each programme participant.</p>
        </div>

        {/* Category filter */}
        <div className="max-w-xs mx-auto mb-6">
          <FilterDropdown
            dark
            label="All Categories"
            options={catOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>

        {/* ── Not Submitted / Pending Programmes ── */}
        <div className="mb-8">
          <h3 className="text-lg font-poppins font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-5 rounded-full bg-gradient-to-b from-[#01B998] to-[#19BB47]" />
            Pending Submissions ({notSubmitted.length})
          </h3>
          {notSubmitted.length === 0 ? (
            <div className="bg-[#013157]/80 rounded-2xl p-6 text-center text-[#D8EDE4] text-sm border border-[#017D8B]/40">
              All programmes in this view have been submitted and locked.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notSubmitted.map(prog => (
                <div key={prog.id} className="bg-[#013157]/90 hover:bg-[#013157] rounded-xl p-5 shadow-lg border border-[#017D8B]/40 hover:border-[#19BB47]/60 transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between group">
                  <div className="mb-4">
                    <p className="text-white font-bold text-sm sm:text-base truncate group-hover:text-[#64D431] transition">
                      {resultNoMap[prog.id] ? <span className="text-[#01B998] font-black text-base sm:text-lg mr-2">#{resultNoMap[prog.id]}</span> : null}
                      {prog.name}
                    </p>
                    <p className="text-[#01B998] text-xs mt-1 font-medium">{prog.category}{getProgrammeType(prog) ? ` · ${getProgrammeType(prog)}` : ''}</p>
                  </div>
                  <button
                    onClick={() => openNewEntry(prog)}
                    className="w-full bg-gradient-to-r from-[#01B998] via-[#19BB47] to-[#AEE515] text-[#011D33] rounded-xl py-2.5 font-extrabold text-xs sm:text-sm hover:opacity-95 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Award size={15} /> Submit Result
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* ── Locked / Saved Results ── */}
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
                ? result.entries.slice(0, 3)
                : [
                  result.first && { ...result.first, place: result.first.label || '1st' },
                  result.second && { ...result.second, place: result.second.label || '2nd' },
                  result.third && { ...result.third, place: result.third.label || '3rd' },
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
                              {data.place || getOrdinalLabel(idx)}
                            </span>
                            <span className="text-mainText font-medium text-sm sm:text-base">
                              Code Letter {data.code || data.codeLetter || ''}
                            </span>
                            <span className="text-accent font-bold text-sm sm:text-base ml-auto">{data.points || 0} pts</span>
                            {data.grade && data.grade !== '-' && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${data.grade === 'A+' ? 'bg-success/15 text-success' :
                                  data.grade === 'A' ? 'bg-[#71C247]/20 text-[#71C247]' :
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

      {/* Security Prompt Modal */}
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

      {/* Judge Credentials & Security Code Verification Modal */}
      {verifyOpen && editProg && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 overflow-y-auto" onClick={() => !vLoading && closeVerify()}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md my-8 shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleVerify}>
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
                <button type="button" onClick={closeVerify} disabled={vLoading} className="bg-white/10 text-mainText rounded-xl p-3 font-semibold text-sm flex-1 hover:bg-white/15 transition">
                  Cancel
                </button>
                <button type="submit" disabled={vLoading} className="bg-primary text-white rounded-xl p-3 font-semibold text-sm flex-1 hover:bg-primary/90 transition">
                  {vLoading ? 'Verifying...' : 'Verify & Edit'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadCaptcha()}
                  disabled={captchaLoading}
                  className="flex-1 bg-secondary/15 text-mainText rounded-xl p-3 font-semibold text-sm hover:bg-secondary/20 transition"
                >
                  {captchaLoading ? 'Refreshing...' : 'Reload security code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Submit / Edit result modal ── */}
      {editOpen && editProg && (() => {
        const cands = getCandidatesForProg(editProg, progAssignments || {})
        const hasCandidates = cands.length > 0 && entryRows.length > 0

        return (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/70 overflow-y-auto" onClick={() => !saving && closeEdit()}>
            <div className="bg-card rounded-2xl p-6 w-full max-w-lg my-8 shadow-2xl border border-secondary/30 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-poppins font-bold text-mainText mb-1">{isFirstTime ? 'Submit Result' : 'Edit Result'}</h3>
              <p className="text-mutedText text-sm mb-4 truncate">
                {editProg.name} · {editProg.category}{getProgrammeType(editProg) ? ` · ${getProgrammeType(editProg)}` : ''}
                <span className="ml-2 font-mono text-xs text-accent">({cands.length} registered candidate{cands.length === 1 ? '' : 's'})</span>
              </p>

              {!hasCandidates ? (
                <div className="bg-secondary/15 rounded-xl p-6 text-center text-mutedText text-sm border border-secondary/30 my-4">
                  No registered candidates for this programme.
                </div>
              ) : (
                <>
                  {/* Column Headers: Place header removed completely */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-mutedText px-1 mb-2">
                    <span className="col-span-3"></span>
                    <span className="col-span-4">Code Letter</span>
                    <span className="col-span-2 text-center">Points</span>
                    <span className="col-span-3 text-center">Grade</span>
                  </div>

                  {/* Scrollable list of placement rows for all candidates */}
                  <div className="overflow-y-auto max-h-[50vh] pr-1 space-y-1 my-1 custom-scrollbar">
                    {entryRows.map((row, i) => {
                      const assignedCodes = Array.from(new Set(cands.map(c => (c.code || '').trim().toUpperCase()).filter(Boolean))).sort()

                      const selectedCodesInOtherRows = new Set(
                        entryRows
                          .filter((_, idx) => idx !== i)
                          .map(r => (r.code || '').trim().toUpperCase())
                          .filter(Boolean)
                      )

                      return (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center mb-3">
                          {/* Editable Place Text Input */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              placeholder="Place"
                              className="w-full bg-[#FFFFFF] dark:bg-[#0D3220] text-[#123B27] dark:text-[#EAF8E5] border border-[#115F32] dark:border-[#1E6339] rounded-xl p-2.5 outline-none text-xs sm:text-sm font-bold focus:border-[#62C744]"
                              value={row.place}
                              onChange={e => updateRowField(i, 'place', e.target.value)}
                            />
                          </div>

                          {/* Select Dropdown for Code Letter */}
                          <div className="col-span-4">
                            <select
                              className="w-full bg-[#FFFFFF] dark:bg-[#0D3220] text-[#123B27] dark:text-[#EAF8E5] border border-[#115F32] dark:border-[#1E6339] rounded-xl p-2.5 outline-none text-sm font-bold cursor-pointer transition hover:border-[#62C744]"
                              value={row.code || ''}
                              onChange={e => updateRowField(i, 'code', e.target.value)}
                            >
                              <option value="" className="bg-[#FFFFFF] dark:bg-[#092619] text-[#64806F] dark:text-[#B8D9BA]">
                                Select Code
                              </option>
                              {assignedCodes.map(code => {
                                const isTaken = selectedCodesInOtherRows.has(code)
                                return (
                                  <option
                                    key={code}
                                    value={code}
                                    disabled={isTaken}
                                    className={`bg-[#FFFFFF] dark:bg-[#092619] ${isTaken
                                        ? 'text-[#64806F]/40 dark:text-[#B8D9BA]/40 font-normal'
                                        : 'text-[#123B27] dark:text-[#EAF8E5] font-bold'
                                      }`}
                                  >
                                    {code}{isTaken ? ' (Selected)' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          </div>

                          {/* Points Input */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              placeholder="Pts"
                              min="0"
                              max="10"
                              className="w-full bg-[#FFFFFF] dark:bg-[#0D3220] text-[#123B27] dark:text-[#EAF8E5] border border-[#115F32] dark:border-[#1E6339] rounded-xl p-2.5 outline-none text-center text-sm font-bold focus:border-[#62C744]"
                              value={row.points}
                              onChange={e => updateRowField(i, 'points', e.target.value)}
                            />
                          </div>

                          {/* Grade Manual Select Dropdown */}
                          <div className="col-span-3">
                            <select
                              className="w-full bg-[#FFFFFF] dark:bg-[#0D3220] text-[#123B27] dark:text-[#EAF8E5] border border-[#115F32] dark:border-[#1E6339] rounded-xl p-2.5 outline-none text-xs sm:text-sm font-bold cursor-pointer transition hover:border-[#62C744]"
                              value={row.grade || ''}
                              onChange={e => updateRowField(i, 'grade', e.target.value)}
                            >
                              <option value="" className="bg-[#FFFFFF] dark:bg-[#092619] text-[#64806F] dark:text-[#B8D9BA]">
                                Select Grade
                              </option>
                              <option value="A+" className="bg-[#FFFFFF] dark:bg-[#092619] text-[#123B27] dark:text-[#EAF8E5] font-bold">
                                A+
                              </option>
                              <option value="A" className="bg-[#FFFFFF] dark:bg-[#092619] text-[#123B27] dark:text-[#EAF8E5] font-bold">
                                A
                              </option>
                              <option value="B" className="bg-[#FFFFFF] dark:bg-[#092619] text-[#123B27] dark:text-[#EAF8E5] font-bold">
                                B
                              </option>
                              <option value="C" className="bg-[#FFFFFF] dark:bg-[#092619] text-[#123B27] dark:text-[#EAF8E5] font-bold">
                                C
                              </option>
                              <option value="No Grade" className="bg-[#FFFFFF] dark:bg-[#092619] text-[#64806F] dark:text-[#B8D9BA] font-semibold">
                                No Grade
                              </option>
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {editError && <p className="text-red-400 text-sm mt-2 font-semibold">{editError}</p>}
              <div className="flex gap-2 mt-4 pt-3 border-t border-secondary/30 shrink-0">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !hasCandidates}
                  className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save & Lock Result'}
                </button>
                <button onClick={() => !saving && closeEdit()} className="bg-secondary/15 text-mainText rounded-xl p-3 font-semibold transition text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default function JudgesResults() {
  return (
    <JudgesErrorBoundary>
      <JudgesResultsInner />
    </JudgesErrorBoundary>
  )
}
