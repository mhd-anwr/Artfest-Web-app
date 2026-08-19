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
  if (resultsRes.error) { console.error(resultsRes.error); return [] }
  const progMap = {}
  ;(progsRes.data || []).forEach(p => { progMap[p.id] = p })

  const validResults = (resultsRes.data || []).filter(r => {
    const prog = progMap[r.programmeId]
    if (!prog) return false
    return prog.isFinished || (!r.first && !r.second && !r.third && (r.resultNo || 0) > 0)
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
    const placement = [result.first, result.second, result.third].find(p => p?.studentId === studentId)
    if (placement) {
      studentResults.push({ ...result, placement: { ...placement, rank: result.first?.studentId === studentId ? 'first' : result.second?.studentId === studentId ? 'second' : 'third' } })
    }
  }
  return studentResults
}

export async function getStudentPoints(studentId) {
  const studentResults = await getStudentResults(studentId)
  let total = 0
  for (const r of studentResults) {
    if (r.first?.studentId === studentId) total += (r.first.points || 0)
    if (r.second?.studentId === studentId) total += (r.second.points || 0)
    if (r.third?.studentId === studentId) total += (r.third.points || 0)
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

export const getStudentByCredentials = async (name, password) => {
  const trimmed = name.trim()
  let { data: students } = await supabase
    .from('students')
    .select('id, name')
    .ilike('name', trimmed)
    .limit(1)
  if (!students || students.length === 0) {
    const { data: fuzzy } = await supabase
      .from('students')
      .select('id, name')
      .ilike('name', `%${trimmed}%`)
      .limit(1)
    students = fuzzy
  }
  if (!students || students.length === 0) {
    console.warn('No student found with name:', trimmed)
    return { error: 'not_found' }
  }

  const student = students[0]
  const { data: cred, error: credErr } = await supabase
    .from('student_credentials')
    .select('*')
    .eq('student_id', student.id)
    .maybeSingle()

  if (credErr) {
    console.warn('Credential lookup error for', student.name, credErr)
    return { error: 'server_error' }
  }

  const validPassword = cred ? cred.password === password || cred.password === COMMON_STUDENT_PASSWORD : password === COMMON_STUDENT_PASSWORD

  if (!validPassword) {
    if (!cred) {
      console.warn('No credentials record exists for', student.name)
      return { error: 'no_credentials', student }
    }
    console.warn('Wrong password for', student.name)
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

      const placements = [
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

    const placements = [
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
