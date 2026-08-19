import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'
import { getTeamCategoryPoints, getIndividualCategoryPoints, PROGRAMME_CATEGORIES } from '../../supabase/queries'
import { Users, Trophy, Layers, BookOpen, RefreshCw, Sparkles, Award } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'

const countRows = async (table) => {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) { console.error(`countRows(${table}) error:`, error); return 0 }
  return count || 0
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ students: 0, teams: 0, categories: 0, programmes: 0 })
  const [teamData, setTeamData] = useState([])
  const [indData, setIndData] = useState({})
  const [selectedCat, setSelectedCat] = useState('Minor')
  const [eligibleCats, setEligibleCats] = useState(['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior'])
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
    const { teamData: data } = await getTeamCategoryPoints()
    const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
    setTeamData(sorted)
  }

  const loadIndividualPoints = async () => {
    const { leaderboardByCategory, eligibleCategories } = await getIndividualCategoryPoints()
    setIndData(leaderboardByCategory || {})
    if (eligibleCategories?.length > 0) {
      setEligibleCats(eligibleCategories)
    }
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
          <h1 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Dashboard</h1>
          <p className="text-mutedText text-sm mt-0.5">Overview of the festival site</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Icon size={20} className="sm:w-[22px] sm:h-[22px] text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-poppins font-bold text-mainText leading-none">{value}</p>
                <p className="text-[11px] sm:text-xs text-mutedText mt-1 truncate">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Points Status */}
      <div className="bg-card rounded-2xl shadow-sm border border-secondary/30 overflow-hidden mb-8">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-secondary/30">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-accent" />
            <h2 className="font-poppins font-bold text-mainText text-base sm:text-lg">Team Points Status</h2>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-60"
          >
            <RefreshCw size={15} className={`${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="divide-y divide-secondary/20">
          {teamData.length === 0 && (
            <p className="text-mutedText text-sm text-center py-8">No teams yet.</p>
          )}
          {teamData.map((team, i) => (
            <div key={team.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/5 transition">
              <span className="text-mutedText text-xs font-bold w-5 shrink-0">#{i + 1}</span>
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: team.color || '#2872A1' }}
              >
                {team.name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-mainText font-medium text-sm sm:text-base truncate flex-1" style={{ color: team.color }}>
                {team.name}
              </span>
              <span className="text-accent font-bold text-sm sm:text-base shrink-0">{team.totalPoints || 0}</span>
              <span className="text-mutedText text-[10px] sm:text-xs shrink-0 hidden sm:inline">pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Points Status */}
      <div className="bg-card rounded-2xl shadow-sm border border-secondary/30 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-secondary/30">
          <div>
            <div className="flex items-center gap-2.5">
              <Award size={20} className="text-accent" />
              <h2 className="font-poppins font-bold text-mainText text-base sm:text-lg">Individual Points Status</h2>
            </div>
            <p className="text-mutedText text-xs sm:text-sm mt-0.5">A leaderboard showing top 10 positions in each category.</p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {eligibleCats.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCat === cat
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-black/10 hover:bg-black/20 text-mutedText hover:text-mainText border border-secondary/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-secondary/20">
          {(!indData[selectedCat] || indData[selectedCat].length === 0) ? (
            <p className="text-mutedText text-sm text-center py-8">No individual points recorded for {selectedCat} yet.</p>
          ) : (
            indData[selectedCat].map((student) => (
              <div key={student.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/5 transition">
                <span className="text-mutedText text-xs font-bold w-5 shrink-0">#{student.rank}</span>
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold text-white shrink-0 shadow-sm"
                  style={{ background: student.teamColor || '#2872A1' }}
                >
                  {student.chestNo || student.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-mainText font-medium text-sm sm:text-base truncate">
                    {student.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] sm:text-xs text-mutedText">
                    <span className="truncate font-medium" style={{ color: student.teamColor }}>{student.team}</span>
                    <span>•</span>
                    <span className="bg-secondary/20 text-mainText px-1.5 py-0.5 rounded text-[10px] font-semibold">{student.category}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-accent font-bold text-sm sm:text-base">{student.totalPoints}</span>
                  <span className="text-mutedText text-[10px] sm:text-xs ml-1">pts</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
