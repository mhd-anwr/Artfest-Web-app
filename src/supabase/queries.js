import { supabase } from './client'

export const DEFAULT_STUDENT_CATEGORIES = ['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior']
export const DEFAULT_PROGRAMME_CATEGORIES = [...DEFAULT_STUDENT_CATEGORIES, 'General Cat-A', 'General Cat-B']
export const STUDENT_CATEGORIES = DEFAULT_STUDENT_CATEGORIES
export const PROGRAMME_CATEGORIES = DEFAULT_PROGRAMME_CATEGORIES
export const PROGRAMME_TYPES = ['On-Stage', 'Off-Stage']
export const PARTICIPATION_TYPES = ['Individual', 'Group']
export const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000

export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .order('sortOrder', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
  if (error || !data || data.length === 0) {
    return { student: DEFAULT_STUDENT_CATEGORIES, programme: DEFAULT_PROGRAMME_CATEGORIES }
  }
  const names = data.map(c => c.name).filter(Boolean)
  return {
    student: names.filter(n => !n.startsWith('General')),
    programme: names,
  }
}

// result number per programme built from the SAME latest-per-programme
// source used by the Admin Result List, so both views always agree.
export const getResultNoMap = async () => {
  const results = await getAllResults()
  const map = {}
  ;(results || []).forEach(r => { if (r.programmeId) map[r.programmeId] = r.resultNo })
  return map
}

const getLocalSessionState = (studentId) => {
  const token = localStorage.getItem(`student_session_${studentId}`)
  const expiresAt = Number(localStorage.getItem(`student_session_expires_${studentId}`) || 0)
  if (!token || !expiresAt) return { active: false }
  if (Date.now() >= expiresAt) {
    localStorage.removeItem(`student_session_${studentId}`)
    localStorage.removeItem(`student_session_expires_${studentId}`)
    return { active: false, expired: true }
  }
  return { active: true, token }
}

const setLocalSessionState = (studentId, token) => {
  const expiresAt = Date.now() + SESSION_EXPIRY_MS
  localStorage.setItem(`student_session_${studentId}`, token)
  localStorage.setItem(`student_session_expires_${studentId}`, String(expiresAt))
  return { active: true, token, expiresAt }
}

const clearLocalSessionState = (studentId) => {
  localStorage.removeItem(`student_session_${studentId}`)
  localStorage.removeItem(`student_session_expires_${studentId}`)
}

export const getStudents = async () => {
  const { data, error } = await supabase.from('students').select('*').order('createdAt', { ascending: false })
  if (error) console.error(error)
  return data || []
}

export const getStudentById = async (id) => {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single()
  if (error) console.error(error)
  return data
}

export const getProgrammes = async () => {
  const { data, error } = await supabase.from('programmes').select('*').order('name', { ascending: true })
  if (error) console.error(error)
  return data || []
}

export const getProgrammeById = async (id) => {
  const { data, error } = await supabase.from('programmes').select('*').eq('id', id).single()
  if (error) console.error(error)
  return data
}

function latestPerProgramme(results) {
  const map = {}
  for (const r of results) {
    if (!r.updatedAt) continue
    if (!map[r.programmeId] || r.updatedAt > map[r.programmeId].updatedAt) {
      map[r.programmeId] = r
    }
  }
  return Object.values(map)
}

export const getResultByProgrammeId = async (programmeId) => {
  const { data, error } = await supabase.from('results').select('*').eq('programmeId', programmeId).order('updatedAt', { ascending: false, nullsFirst: false }).limit(1)
  if (error) { console.error('getResultByProgrammeId error:', error); return null }
  return data?.[0] || null
}

export const getAllResults = async () => {
  const [resultsRes, progsRes] = await Promise.all([
    supabase.from('results').select('*'),
    supabase.from('programmes').select('id, isFinished'),
  ])
  if (resultsRes.error) { console.error('getAllResults error:', resultsRes.error); return [] }
  const progMap = {}
  ;(progsRes.data || []).forEach(p => { progMap[p.id] = p })

  const validResults = (resultsRes.data || []).filter(r => {
    const prog = progMap[r.programmeId]
    if (!prog || !prog.isFinished) return false
    const hasWinners = Boolean(r.first || (Array.isArray(r.entries) && r.entries.length > 0))
    return hasWinners
  })

  const latest = latestPerProgramme(validResults)
  return latest.sort((a, b) => (b.resultNo || 0) - (a.resultNo || 0))
}

export const getTeams = async () => {
  const { data, error } = await supabase.from('teams').select('*')
  if (error) console.error(error)
  return data || []
}

export const getSpotlight = async () => {
  const { data, error } = await supabase.from('spotlight').select('*').order('uploadedAt', { ascending: false })
  if (error) console.error(error)
  return data || []
}

export const getFeaturedSpotlight = async () => {
  const { data, error } = await supabase.from('spotlight').select('*').eq('isFeatured', true).order('uploadedAt', { ascending: false })
  if (error) {
    const all = await getSpotlight()
    return all
  }
  return data || []
}

export async function getTeamPlacements(teamId) {
  const { data: allStudents } = await supabase.from('students').select('id, team')
  const [teams, progsRes] = await Promise.all([
    supabase.from('teams').select('id, name').then(r => r.data || []),
    supabase.from('programmes').select('id, isFinished').then(r => r.data || []),
  ])
  const finishedProgIds = new Set(progsRes.filter(p => p.isFinished).map(p => p.id))
  const teamNameToId = {}
  teams.forEach(t => { teamNameToId[t.name] = t.id })
  const studentIds = (allStudents || [])
    .filter(s => (teamNameToId[s.team] || s.team) === teamId)
    .map(s => s.id)
  if (studentIds.length === 0) return { first: [], second: [], third: [] }

  const { data: results, error: resErr } = await supabase
    .from('results')
    .select('*')
  if (resErr) return { first: [], second: [], third: [] }

  const validResults = (results || []).filter(r => finishedProgIds.has(r.programmeId))
  const unique = latestPerProgramme(validResults)
  const placements = { first: [], second: [], third: [] }
  for (const result of unique) {
    if (result.first?.studentId && studentIds.includes(result.first.studentId)) {
      placements.first.push(result)
    }
    if (result.second?.studentId && studentIds.includes(result.second.studentId)) {
      placements.second.push(result)
    }
    if (result.third?.studentId && studentIds.includes(result.third.studentId)) {
      placements.third.push(result)
    }
  }
  return placements
}

export const getStudentsByTeamId = async (teamId) => {
  const { data: allData } = await supabase.from('students').select('*')
  const teams = await supabase.from('teams').select('id, name').then(r => r.data || [])
  const teamNameToId = {}
  teams.forEach(t => { teamNameToId[t.name] = t.id })
  return (allData || []).filter(s => (teamNameToId[s.team] || s.team) === teamId)
}

export async function getStudentResults(studentId) {
  const [resultsRes, progsRes] = await Promise.all([
    supabase.from('results').select('*'),
    supabase.from('programmes').select('id, isFinished'),
  ])
  if (resultsRes.error) return []
  const finishedProgIds = new Set((progsRes.data || []).filter(p => p.isFinished).map(p => p.id))
  const validResults = (resultsRes.data || []).filter(r => finishedProgIds.has(r.programmeId))
  const unique = latestPerProgramme(validResults)
  const studentResults = []
  for (const result of unique) {
    if (Array.isArray(result.entries) && result.entries.length > 0) {
      const entry = result.entries.find(e => e?.studentId === studentId)
      if (entry) {
        studentResults.push({
          ...result,
          placement: {
            ...entry,
            rank: entry.place || entry.label || 'Participant',
          },
        })
      }
    } else {
      const placement = [result.first, result.second, result.third].find(p => p?.studentId === studentId)
      if (placement) {
        studentResults.push({
          ...result,
          placement: {
            ...placement,
            rank: result.first?.studentId === studentId ? '1st Place' : result.second?.studentId === studentId ? '2nd Place' : '3rd Place',
          },
        })
      }
    }
  }
  return studentResults
}

export async function getStudentPoints(studentId) {
  const studentResults = await getStudentResults(studentId)
  let total = 0
  for (const r of studentResults) {
    if (r.placement?.points != null) {
      total += (Number(r.placement.points) || 0)
    }
  }
  return total
}

export const getNextResultNo = async () => {
  const { data, error } = await supabase.from('results').select('resultNo').order('resultNo', { ascending: false }).limit(1)
  if (error) { console.error('getNextResultNo error:', error); return 1 }
  return (data?.[0]?.resultNo || 0) + 1
}

export const getStudentSessionState = async (studentId) => {
  const localState = getLocalSessionState(studentId)
  if (localState.active) return localState

  const { data, error } = await supabase
    .from('students')
    .select('id, sessionActive, sessionExpiresAt, sessionToken')
    .eq('id', studentId)
    .maybeSingle()

  if (error) {
    console.warn('Session state lookup skipped:', error.message)
    return { active: false }
  }

  if (!data) return { active: false }

  const expiresAt = data.sessionExpiresAt ? new Date(data.sessionExpiresAt).getTime() : 0
  if (data.sessionActive && expiresAt && Date.now() < expiresAt) {
    return { active: true, token: data.sessionToken }
  }

  if (data.sessionActive && expiresAt && Date.now() >= expiresAt) {
    await clearStudentSession(studentId, data.sessionToken)
    return { active: false, expired: true }
  }

  return { active: false }
}

export const setStudentSession = async (studentId, token) => {
  const localState = setLocalSessionState(studentId, token)
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString()
  const { error } = await supabase
    .from('students')
    .update({ sessionActive: true, sessionExpiresAt: expiresAt, sessionToken: token })
    .eq('id', studentId)

  if (error) {
    console.warn('DB session update skipped:', error.message)
    return localState
  }

  return { active: true, token, expiresAt }
}

export const clearStudentSession = async (studentId, token) => {
  clearLocalSessionState(studentId)
  const updates = { sessionActive: false, sessionExpiresAt: null, sessionToken: null }
  const query = supabase.from('students').update(updates).eq('id', studentId)

  if (token) {
    query.eq('sessionToken', token)
  }

  const { error } = await query
  if (error) {
    console.warn('DB session clear skipped:', error.message)
  }
}

const COMMON_STUDENT_PASSWORD = 'israfest2026'

export const getStudentByCredentials = async (chestNo, password) => {
  const trimmed = String(chestNo || '').trim()
  if (!trimmed) return { error: 'not_found' }

  let { data: students } = await supabase
    .from('students')
    .select('id, name, chestNo')
    .ilike('chestNo', trimmed)
    .limit(1)

  if (!students || students.length === 0) {
    const { data: exact } = await supabase
      .from('students')
      .select('id, name, chestNo')
      .eq('chestNo', trimmed)
      .limit(1)
    students = exact
  }

  if (!students || students.length === 0) {
    console.warn('No participant found with chest number:', trimmed)
    return { error: 'not_found' }
  }

  const student = students[0]
  const { data: cred, error: credErr } = await supabase
    .from('student_credentials')
    .select('*')
    .eq('student_id', student.id)
    .maybeSingle()

  if (credErr) {
    console.warn('Credential lookup error for chestNo:', student.chestNo, credErr)
    return { error: 'server_error' }
  }

  const validPassword = cred ? cred.password === password || cred.password === COMMON_STUDENT_PASSWORD : password === COMMON_STUDENT_PASSWORD

  if (!validPassword) {
    if (!cred) {
      console.warn('No credentials record exists for chestNo:', student.chestNo)
      return { error: 'no_credentials', student }
    }
    console.warn('Wrong password for chestNo:', student.chestNo)
    return { error: 'wrong_password' }
  }

  if (!cred) {
    await supabase.from('student_credentials').insert({ student_id: student.id, password: COMMON_STUDENT_PASSWORD })
  }

  const sessionState = await getStudentSessionState(student.id)
  if (sessionState.active) {
    return { error: 'already_logged_in_elsewhere', student }
  }

  return { student }
}

export const updateStudentProfile = async (id, updates) => {
  const { error } = await supabase.from('students').update(updates).eq('id', id)
  return !error
}

export const getTeamCategoryPoints = async () => {
  const [teams, students, programmes, allResults] = await Promise.all([
    supabase.from('teams').select('*').then(r => r.data || []),
    supabase.from('students').select('*').then(r => r.data || []),
    supabase.from('programmes').select('*').then(r => r.data || []),
    supabase.from('results').select('*').then(r => r.data || []),
  ])

  const latestPerProg = {}
  for (const r of allResults) {
    if (!r.updatedAt) continue
    if (!latestPerProg[r.programmeId] || r.updatedAt > latestPerProg[r.programmeId].updatedAt) {
      latestPerProg[r.programmeId] = r
    }
  }

  const progMap = {}
  programmes.forEach(p => { progMap[p.id] = p })

  const studentMap = {}
  students.forEach(s => { studentMap[s.id] = s })

  const categories = (await getCategories()).programme

  const teamNameToId = {}
  teams.forEach(t => { teamNameToId[t.name] = t.id })

  let totalPublishedResults = 0
  let afterPublishedResults = 0

  for (const result of Object.values(latestPerProg)) {
    const prog = progMap[result.programmeId]
    if (prog && prog.isFinished) {
      totalPublishedResults += 1
      afterPublishedResults += 1
    }
  }

  const fontColors = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('artfest_team_font_colors') || '{}') : {}

  const teamData = teams.map(team => {
    const savedFontColor = team.font_color || team.fontColor || fontColors[team.id] || fontColors[team.name] || team.color || '#2872A1'
    const catPoints = {}
    categories.forEach(c => { catPoints[c] = 0 })

    for (const result of Object.values(latestPerProg)) {
      const prog = progMap[result.programmeId]
      if (!prog || !prog.isFinished) continue

      const catName = prog.category === 'General' ? 'General Cat-A' : prog.category

      const placements = Array.isArray(result.entries) && result.entries.length > 0
        ? result.entries.map(e => ({ studentId: e.studentId, points: Number(e.points) || 0 }))
        : [
            result.first && { studentId: result.first.studentId, points: Number(result.first.points) || 0 },
            result.second && { studentId: result.second.studentId, points: Number(result.second.points) || 0 },
            result.third && { studentId: result.third.studentId, points: Number(result.third.points) || 0 },
          ]

      for (const p of placements) {
        if (!p?.studentId) continue
        const student = studentMap[p.studentId]
        if (student) {
          const studentTeamId = teamNameToId[student.team] || student.team
          if (studentTeamId === team.id) {
            catPoints[catName] = (catPoints[catName] || 0) + p.points
          }
        }
      }
    }

    const total = Object.values(catPoints).reduce((a, b) => a + b, 0)
    return {
      ...team,
      font_color: savedFontColor,
      fontColor: savedFontColor,
      catPoints,
      totalPoints: total,
    }
  })

  return { teamData, categories, totalPublishedResults, afterPublishedResults }
}

export const getIndividualCategoryPoints = async () => {
  const [students, programmes, allResults, teams] = await Promise.all([
    supabase.from('students').select('*').then(r => r.data || []),
    supabase.from('programmes').select('*').then(r => r.data || []),
    supabase.from('results').select('*').then(r => r.data || []),
    supabase.from('teams').select('*').then(r => r.data || []),
  ])

  const latestPerProg = {}
  for (const r of allResults) {
    if (!r.updatedAt) continue
    if (!latestPerProg[r.programmeId] || r.updatedAt > latestPerProg[r.programmeId].updatedAt) {
      latestPerProg[r.programmeId] = r
    }
  }

  const progMap = {}
  programmes.forEach(p => { progMap[p.id] = p })

  const studentMap = {}
  students.forEach(s => { studentMap[s.id] = s })

  const teamMap = {}
  teams.forEach(t => { teamMap[t.id] = t })

  const eligibleCategories = DEFAULT_STUDENT_CATEGORIES
  const studentPointsMap = {}
  let totalPublishedResults = 0
  let afterPublishedResults = 0

  for (const result of Object.values(latestPerProg)) {
    const prog = progMap[result.programmeId]
    if (!prog || !prog.isFinished) continue

    totalPublishedResults += 1

    const partType = (prog.participationType || prog.participation_type || '').toLowerCase()
    if (partType !== 'individual') continue

    const cat = prog.category
    if (!cat || !eligibleCategories.includes(cat)) continue

    afterPublishedResults += 1

    const placements = Array.isArray(result.entries) && result.entries.length > 0
      ? result.entries.map(e => ({ studentId: e.studentId, points: Number(e.points) || 0 }))
      : [
          result.first && { studentId: result.first.studentId, points: Number(result.first.points) || 0 },
          result.second && { studentId: result.second.studentId, points: Number(result.second.points) || 0 },
          result.third && { studentId: result.third.studentId, points: Number(result.third.points) || 0 },
        ]

    for (const p of placements) {
      if (!p?.studentId) continue
      const student = studentMap[p.studentId]
      if (student) {
        studentPointsMap[student.id] = (studentPointsMap[student.id] || 0) + p.points
      }
    }
  }

  const fontColors = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('artfest_team_font_colors') || '{}') : {}

  const leaderboardByCategory = {}
  eligibleCategories.forEach(cat => {
    const catStudents = students
      .filter(s => s.class === cat)
      .map(s => {
        const teamObj = teamMap[s.team] || teams.find(t => t.name === s.team)
        const teamFontColor = teamObj
          ? (teamObj.font_color || teamObj.fontColor || fontColors[teamObj.id] || fontColors[teamObj.name] || teamObj.color || '#2872A1')
          : '#2872A1'
        return {
          id: s.id,
          name: s.name,
          chestNo: s.chestNo,
          category: s.class,
          team: teamObj ? teamObj.name : (s.team || 'Unassigned'),
          teamColor: teamObj ? teamObj.color : '#2872A1',
          teamFontColor,
          totalPoints: studentPointsMap[s.id] || 0,
        }
      })
      .filter(s => s.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10)
      .map((s, idx) => ({ ...s, rank: idx + 1 }))

    leaderboardByCategory[cat] = catStudents
  })

  return {
    leaderboardByCategory,
    eligibleCategories,
    totalPublishedResults,
    afterPublishedResults
  }
}

export const getCodeAssignments = async (programmeId) => {
  let dbAssignments = {}
  try {
    const { data, error } = await supabase
      .from('performance_code_assignments')
      .select('*')
      .eq('programme_id', programmeId)
    if (!error && data) {
      data.forEach(item => {
        const pid = item.participant_id || item.participantId
        const code = item.code_letter || item.codeLetter
        if (pid && code) dbAssignments[pid] = code
      })
    }
  } catch (e) {
    console.warn('getCodeAssignments DB query notice:', e)
  }

  const localKey = `artfest_code_assignments_${programmeId}`
  const localAssignments = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(localKey) || '{}') : {}

  return { ...localAssignments, ...dbAssignments }
}

export const saveCodeAssignments = async (programmeId, category, assignmentList) => {
  const seenCodes = new Set()
  for (const a of assignmentList) {
    if (a.codeLetter) {
      if (seenCodes.has(a.codeLetter)) {
        console.error(`Duplicate code letter ${a.codeLetter} detected in saveCodeAssignments!`)
        return false
      }
      seenCodes.add(a.codeLetter)
    }
  }

  const localKey = `artfest_code_assignments_${programmeId}`
  const localMap = {}
  assignmentList.forEach(a => {
    if (a.participantId && a.codeLetter) {
      localMap[a.participantId] = a.codeLetter
    }
  })

  if (typeof window !== 'undefined') {
    localStorage.setItem(localKey, JSON.stringify(localMap))
  }

  try {
    const rows = assignmentList.map(a => ({
      programme_id: programmeId,
      category_id: category,
      category: category,
      participant_id: a.participantId,
      code_letter: a.codeLetter,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('performance_code_assignments')
      .upsert(rows, { onConflict: 'programme_id,participant_id' })

    if (error) {
      console.warn('saveCodeAssignments Supabase upsert notice:', error.message)
    }
  } catch (e) {
    console.warn('saveCodeAssignments DB error fallback used:', e)
  }

  return true
}

// ── POSTER TEMPLATES & GALLERY FOOTERS QUERIES ──

const DEFAULT_POSTER_TEMPLATES = [
  {
    id: 'default-template-1',
    name: 'Classic Dark Festival',
    type: 'Program Result Poster',
    width: 1080,
    height: 1350,
    background_type: 'gradient',
    background_value: 'linear-gradient(135deg, #061A0D 0%, #115F32 100%)',
    layers: [
      { id: 'l1', type: 'text', key: 'category', prefix: 'CATEGORY: ', font_family: 'Sora', font_size: 24, font_weight: '700', text_align: 'center', color: '#8ED06C', line_height: 1.2, width: 900, x: 90, y: 120 },
      { id: 'l2', type: 'text', key: 'programme_name', prefix: '', font_family: 'Sora', font_size: 52, font_weight: '800', text_align: 'center', color: '#D4FFB8', line_height: 1.2, width: 960, x: 60, y: 170 },
      { id: 'l3', type: 'text', key: 'result_no', prefix: 'RESULT #', font_family: 'Sora', font_size: 28, font_weight: '700', text_align: 'center', color: '#71C247', line_height: 1.2, width: 900, x: 90, y: 250 },
      
      { id: 'l4', type: 'text', key: 'first_place_label', prefix: '🥇 1ST PLACE', font_family: 'Sora', font_size: 22, font_weight: '700', text_align: 'center', color: '#71C247', line_height: 1.2, width: 900, x: 90, y: 380 },
      { id: 'l5', type: 'text', key: 'first_name', prefix: '', font_family: 'Sora', font_size: 44, font_weight: '800', text_align: 'center', color: '#FFFFFF', line_height: 1.2, width: 900, x: 90, y: 415 },
      { id: 'l6', type: 'text', key: 'first_team', prefix: '', font_family: 'Sora', font_size: 26, font_weight: '600', text_align: 'center', color: '#8ED06C', line_height: 1.2, width: 900, x: 90, y: 470 },

      { id: 'l7', type: 'text', key: 'second_place_label', prefix: '🥈 2ND PLACE', font_family: 'Sora', font_size: 20, font_weight: '700', text_align: 'center', color: '#71C247', line_height: 1.2, width: 900, x: 90, y: 560 },
      { id: 'l8', type: 'text', key: 'second_name', prefix: '', font_family: 'Sora', font_size: 36, font_weight: '700', text_align: 'center', color: '#FFFFFF', line_height: 1.2, width: 900, x: 90, y: 590 },
      { id: 'l9', type: 'text', key: 'second_team', prefix: '', font_family: 'Sora', font_size: 22, font_weight: '600', text_align: 'center', color: '#8ED06C', line_height: 1.2, width: 900, x: 90, y: 635 },

      { id: 'l10', type: 'text', key: 'third_place_label', prefix: '🥉 3RD PLACE', font_family: 'Sora', font_size: 20, font_weight: '700', text_align: 'center', color: '#71C247', line_height: 1.2, width: 900, x: 90, y: 720 },
      { id: 'l11', type: 'text', key: 'third_name', prefix: '', font_family: 'Sora', font_size: 36, font_weight: '700', text_align: 'center', color: '#FFFFFF', line_height: 1.2, width: 900, x: 90, y: 750 },
      { id: 'l12', type: 'text', key: 'third_team', prefix: '', font_family: 'Sora', font_size: 22, font_weight: '600', text_align: 'center', color: '#8ED06C', line_height: 1.2, width: 900, x: 90, y: 795 },

      { id: 'l13', type: 'text', key: 'festival_footer', prefix: "RENDEZVOUS '26 ART FESTIVAL", font_family: 'Sora', font_size: 20, font_weight: '700', text_align: 'center', color: '#4EBA16', line_height: 1.2, width: 900, x: 90, y: 1220 }
    ]
  }
]

export const getPosterTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('poster_templates')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data && data.length > 0) return data
  } catch (e) {
    console.warn('getPosterTemplates DB query fallback:', e)
  }

  const local = typeof window !== 'undefined' ? localStorage.getItem('artfest_poster_templates') : null
  if (local) {
    try { return JSON.parse(local) } catch {}
  }
  return DEFAULT_POSTER_TEMPLATES
}

export const getPosterTemplateById = async (id) => {
  const all = await getPosterTemplates()
  return all.find(t => t.id === id) || null
}

export const savePosterTemplate = async (template) => {
  const isNew = !template.id || template.id.startsWith('default-')
  const newId = isNew ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tmpl_${Date.now()}`) : template.id
  const payload = {
    id: newId,
    name: template.name || 'Untitled Template',
    type: template.type || 'Program Result Poster',
    width: Number(template.width) || 1080,
    height: Number(template.height) || 1350,
    background_type: template.background_type || 'gradient',
    background_value: template.background_value || 'linear-gradient(135deg, #061A0D 0%, #115F32 100%)',
    layers: template.layers || [],
    updated_at: new Date().toISOString(),
  }

  const current = await getPosterTemplates()
  const exists = current.some(t => t.id === newId)
  const updatedList = exists
    ? current.map(t => t.id === newId ? payload : t)
    : [payload, ...current]
  if (typeof window !== 'undefined') {
    localStorage.setItem('artfest_poster_templates', JSON.stringify(updatedList))
  }

  try {
    const { data, error } = await supabase
      .from('poster_templates')
      .upsert(payload)
      .select()
      .single()
    if (!error && data) return data
  } catch (e) {
    console.warn('savePosterTemplate Supabase error fallback:', e)
  }

  return payload
}

export const deletePosterTemplate = async (id) => {
  const current = await getPosterTemplates()
  const filtered = current.filter(t => t.id !== id)
  if (typeof window !== 'undefined') {
    localStorage.setItem('artfest_poster_templates', JSON.stringify(filtered))
  }

  try {
    await supabase.from('poster_templates').delete().eq('id', id)
  } catch (e) {
    console.warn('deletePosterTemplate DB error:', e)
  }
  return true
}

export const duplicatePosterTemplate = async (id) => {
  const tmpl = await getPosterTemplateById(id)
  if (!tmpl) return null
  const clone = {
    ...tmpl,
    id: undefined,
    name: `${tmpl.name} (Copy)`,
    created_at: undefined,
    updated_at: undefined,
  }
  return await savePosterTemplate(clone)
}

export const getGalleryFooters = async () => {
  try {
    const { data, error } = await supabase
      .from('gallery_footers')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) return data
  } catch (e) {
    console.warn('getGalleryFooters DB fallback:', e)
  }

  const local = typeof window !== 'undefined' ? localStorage.getItem('artfest_gallery_footers') : null
  return local ? JSON.parse(local) : []
}

export const getActiveGalleryFooter = async () => {
  const all = await getGalleryFooters()
  return all.find(f => f.is_active) || null
}

export const createGalleryFooter = async ({ name, image_url }) => {
  const newFooter = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `footer_${Date.now()}`,
    name,
    image_url,
    is_active: false,
    created_at: new Date().toISOString(),
  }

  const current = await getGalleryFooters()
  const updated = [newFooter, ...current]
  if (typeof window !== 'undefined') {
    localStorage.setItem('artfest_gallery_footers', JSON.stringify(updated))
  }

  try {
    const { data, error } = await supabase
      .from('gallery_footers')
      .insert({ name, image_url, is_active: false })
      .select()
      .single()
    if (!error && data) return data
  } catch (e) {
    console.warn('createGalleryFooter DB error:', e)
  }

  return newFooter
}

export const setActiveGalleryFooter = async (id) => {
  const current = await getGalleryFooters()
  const updated = current.map(f => ({ ...f, is_active: f.id === id }))
  if (typeof window !== 'undefined') {
    localStorage.setItem('artfest_gallery_footers', JSON.stringify(updated))
  }

  try {
    await supabase.from('gallery_footers').update({ is_active: false }).neq('id', id)
    await supabase.from('gallery_footers').update({ is_active: true }).eq('id', id)
  } catch (e) {
    console.warn('setActiveGalleryFooter DB error:', e)
  }

  return true
}

export const deleteGalleryFooter = async (id) => {
  const current = await getGalleryFooters()
  const filtered = current.filter(f => f.id !== id)
  if (typeof window !== 'undefined') {
    localStorage.setItem('artfest_gallery_footers', JSON.stringify(filtered))
  }

  try {
    await supabase.from('gallery_footers').delete().eq('id', id)
  } catch (e) {
    console.warn('deleteGalleryFooter DB error:', e)
  }

  return true
}

export const uploadFrameImage = async (file, folder = 'frames') => {
  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (error) throw error

    const { data: pubUrlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    return pubUrlData?.publicUrl || null
  } catch (e) {
    console.warn('uploadFrameImage Supabase storage upload error:', e)
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })
  }
}
