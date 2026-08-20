import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'
import { getTeamCategoryPoints, getIndividualCategoryPoints, PROGRAMME_CATEGORIES } from '../../supabase/queries'
import { Users, Trophy, Layers, BookOpen, RefreshCw, Sparkles, Award, Calculator } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'

const countRows = async (table) => {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) { console.error(`countRows(${table}) error:`, error); return 0 }
  return count || 0
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ students: 0, teams: 0, categories: 0, programmes: 0 })
  const [teamData, setTeamData] = useState([])
  const [teamTotalPubCount, setTeamTotalPubCount] = useState(0)
  const [teamAfterPubCount, setTeamAfterPubCount] = useState(0)
  const [calculatingTeam, setCalculatingTeam] = useState(false)
  const [indData, setIndData] = useState({})
  const [selectedCat, setSelectedCat] = useState('Minor')
  const [eligibleCats, setEligibleCats] = useState(['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior'])
  const [totalPubCount, setTotalPubCount] = useState(0)
  const [afterPubCount, setAfterPubCount] = useState(0)
  const [calculatingInd, setCalculatingInd] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadCounts = async () => {
    const [students, teams, programmes, categories] = await Promise.all([
      countRows('students'),
      countRows('teams'),
      countRows('programmes'),
      countRows('categories'),
    ])
    const { data: progData } = await supabase.from('programmes').select('category')
    const distinctCategories = new Set((progData || []).map(p => p.category).filter(Boolean)).size
    setCounts({
      students,
      teams,
      programmes,
      categories: categories > 0 ? categories : (programmes > 0 ? distinctCategories : PROGRAMME_CATEGORIES.length),
    })
  }

  const loadTeamPoints = async () => {
    setCalculatingTeam(true)
    const { teamData: data, totalPublishedResults, afterPublishedResults } = await getTeamCategoryPoints()
    const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
    setTeamData(sorted)
    setTeamTotalPubCount(totalPublishedResults || 0)
    setTeamAfterPubCount(afterPublishedResults || 0)
    setCalculatingTeam(false)
  }

  const loadIndividualPoints = async () => {
    setCalculatingInd(true)
    const { leaderboardByCategory, eligibleCategories, totalPublishedResults, afterPublishedResults } = await getIndividualCategoryPoints()
    setIndData(leaderboardByCategory || {})
    if (eligibleCategories?.length > 0) {
      setEligibleCats(eligibleCategories)
    }
    setTotalPubCount(totalPublishedResults || 0)
    setAfterPubCount(afterPublishedResults || 0)
    setCalculatingInd(false)
  }

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([loadCounts(), loadTeamPoints(), loadIndividualPoints()])
    setRefreshing(false)
  }

  useEffect(() => {
    loadCounts()
    loadTeamPoints()
    loadIndividualPoints()
  }, [])

  const stats = [
    { label: 'Total Participants', value: counts.students, icon: Users },
    { label: 'Total Teams', value: counts.teams, icon: Trophy },
    { label: 'Total Categories', value: counts.categories, icon: Layers },
    { label: 'Total Programmes', value: counts.programmes, icon: BookOpen },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-poppins font-bold text-[#D4FFB8]">Dashboard</h1>
          <p className="text-[#8ED06C] text-sm mt-0.5">Overview of the festival site</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#0B2A17] dark:bg-[#0B2A17] rounded-2xl p-4 sm:p-5 shadow-sm border border-[#71C247]/25">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#123D22] flex items-center justify-center shrink-0 border border-[#71C247]/20">
                <Icon size={20} className="sm:w-[22px] sm:h-[22px] text-[#71C247]" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-poppins font-bold text-[#D4FFB8] leading-none">{value}</p>
                <p className="text-[11px] sm:text-xs text-[#8ED06C] mt-1 truncate">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Points Status */}
      <div className="bg-[#0B2A17] dark:bg-[#0B2A17] rounded-2xl shadow-sm border border-[#71C247]/25 overflow-hidden mb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-[#71C247]/20">
          <div>
            <div className="flex items-center gap-2.5">
              <Sparkles size={20} className="text-[#71C247]" />
              <h2 className="font-poppins font-bold text-[#D4FFB8] text-base sm:text-lg">
                Team Points Status (After {teamTotalPubCount} results)
              </h2>
            </div>
            <p className="text-[#8ED06C] text-xs sm:text-sm mt-0.5">A summary of total points scored by each team.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-[#228C22] hover:bg-[#115F32] text-[#D4FFB8] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-60 border border-[#71C247]/30"
            >
              <RefreshCw size={15} className={`${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={loadTeamPoints}
              disabled={calculatingTeam}
              className="flex items-center gap-2 bg-[#123D22] hover:bg-[#115F32] text-[#D4FFB8] border border-[#228C22] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-60"
            >
              <Calculator size={15} className={`${calculatingTeam ? 'animate-spin' : ''}`} />
              Calculate (After {teamTotalPubCount} results)
            </button>
          </div>
        </div>

        {/* Team Cards List */}
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {teamData.length === 0 && (
            <p className="text-[#8ED06C] text-sm text-center py-8">No teams yet.</p>
          )}
          {teamData.map((team) => (
            <div
              key={team.id}
              className="bg-[#123D22] rounded-2xl border border-[#71C247]/25 p-4 shadow-sm flex items-center justify-between gap-4 hover:border-[#71C247]/50 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: team.color || '#2872A1' }}
                />
                <span
                  className="font-poppins font-bold text-sm sm:text-base truncate team-name-text text-[#D4FFB8]"
                >
                  {team.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-[#71C247] font-extrabold text-base sm:text-lg">{team.totalPoints || 0}</span>
                <span className="text-[#8ED06C] text-xs font-semibold">pts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Card Footer with Result Counters */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-[#71C247]/20 bg-[#061A0D]/50 text-[#8ED06C] text-xs font-medium">
          <span>Total Published Results: <strong className="text-[#D4FFB8] font-bold">{teamTotalPubCount}</strong></span>
          <span>After Published Results: <strong className="text-[#D4FFB8] font-bold">{teamAfterPubCount}</strong></span>
        </div>
      </div>

      {/* Individual Points Status */}
      <div className="bg-[#0B2A17] dark:bg-[#0B2A17] rounded-2xl shadow-sm border border-[#71C247]/25 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-[#71C247]/20">
          <div>
            <div className="flex items-center gap-2.5">
              <Award size={20} className="text-[#71C247]" />
              <h2 className="font-poppins font-bold text-[#D4FFB8] text-base sm:text-lg">Individual Points Status</h2>
            </div>
            <p className="text-[#8ED06C] text-xs sm:text-sm mt-0.5">A leaderboard showing top 10 positions in each category.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-[#228C22] hover:bg-[#115F32] text-[#D4FFB8] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-60 border border-[#71C247]/30"
            >
              <RefreshCw size={15} className={`${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={loadIndividualPoints}
              disabled={calculatingInd}
              className="flex items-center gap-2 bg-[#123D22] hover:bg-[#115F32] text-[#D4FFB8] border border-[#228C22] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-60"
            >
              <Calculator size={15} className={`${calculatingInd ? 'animate-spin' : ''}`} />
              Calculate (After {totalPubCount} results)
            </button>
          </div>
        </div>

        {/* Category Selector Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-[#71C247]/20 bg-[#061A0D]/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {eligibleCats.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCat === cat
                  ? 'bg-[#228C22] text-[#D4FFB8] shadow-sm border border-[#71C247]/40'
                  : 'bg-[#123D22] text-[#D4FFB8] hover:bg-[#228C22]/50 border border-[#71C247]/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Leaderboard Rows */}
        <div className="divide-y divide-[#71C247]/15">
          {(!indData[selectedCat] || indData[selectedCat].length === 0) ? (
            <p className="text-[#8ED06C] text-sm text-center py-8">No individual points recorded for {selectedCat} yet.</p>
          ) : (
            indData[selectedCat].map((student) => (
              <div key={student.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#123D22]/40 transition">
                <span className="text-[#8ED06C] text-xs font-bold w-5 shrink-0">#{student.rank}</span>
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold text-white shrink-0 shadow-sm"
                  style={{ background: student.teamColor || '#2872A1' }}
                >
                  {student.chestNo || student.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[#D4FFB8] font-medium text-sm sm:text-base truncate">
                    {student.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] sm:text-xs text-[#8ED06C]">
                    <span className="truncate font-medium team-name-subtext text-[#8ED06C]">{student.team}</span>
                    <span>•</span>
                    <span className="bg-[#123D22] text-[#D4FFB8] border border-[#71C247]/25 px-1.5 py-0.5 rounded text-[10px] font-semibold">{student.category}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[#71C247] font-bold text-sm sm:text-base">{student.totalPoints}</span>
                  <span className="text-[#8ED06C] text-[10px] sm:text-xs ml-1">pts</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Card Footer with Result Counters */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-[#71C247]/20 bg-[#061A0D]/50 text-[#8ED06C] text-xs font-medium">
          <span>Total Published Results: <strong className="text-[#D4FFB8] font-bold">{totalPubCount}</strong></span>
          <span>After Published Results: <strong className="text-[#D4FFB8] font-bold">{afterPubCount}</strong></span>
        </div>
      </div>
    </div>
  )
}
