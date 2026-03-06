import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Trophy, Wine } from 'lucide-react'

const podiumColors = ['#f5c842', '#94a3b8', '#cd7c3b']
const podiumEmoji = ['🥇', '🥈', '🥉']

// A "night session" counts if it started between 8 PM (20:00) and 6 AM next day.
// We pick the best single-night drink total per person.
function isNightSession(startedAt) {
  if (!startedAt) return false
  const d = new Date(startedAt)
  const hour = d.getHours()
  return hour >= 20 || hour < 6
}

// From an array of sessions for one user, find the best night's drink total
function bestNightDrinks(sessions) {
  const nightSessions = sessions.filter((s) => isNightSession(s.started_at))
  if (nightSessions.length === 0) return 0
  return Math.max(...nightSessions.map((s) => s.total_standard_drinks || 0))
}

function PodiumCard({ rank, entry, isYou }) {
  const color = podiumColors[rank - 1]
  return (
    <div
      className="flex-1 rounded-2xl border text-center overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: isYou ? color : 'var(--border)',
        boxShadow: isYou ? `0 0 0 1.5px ${color}` : 'none',
      }}
    >
      <div className="py-3" style={{ background: `${color}18` }}>
        <span className="text-2xl">{podiumEmoji[rank - 1]}</span>
      </div>
      <div className="px-3 py-3">
        <p className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>
          {entry.display_name}{isYou ? ' (you)' : ''}
        </p>
        <p className="font-black text-xl mt-1" style={{ color }}>{entry.drinks}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>drinks</p>
      </div>
    </div>
  )
}

function RankRow({ rank, entry, isYou }) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border"
      style={{
        backgroundColor: isYou ? 'rgba(245,200,66,0.06)' : 'var(--bg-card)',
        borderColor: isYou ? 'rgba(245,200,66,0.3)' : 'var(--border)',
      }}
    >
      <span
        className="w-7 text-center font-black text-sm shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="font-bold text-sm truncate"
          style={{ color: isYou ? '#f5c842' : 'var(--text)' }}
        >
          {entry.display_name}{isYou ? ' · You' : ''}
        </p>
      </div>
      <div className="text-right shrink-0 flex items-center gap-1">
        <Wine size={13} style={{ color: isYou ? '#f5c842' : 'var(--text-muted)' }} />
        <span
          className="font-black text-base"
          style={{ color: isYou ? '#f5c842' : 'var(--text)' }}
        >
          {entry.drinks}
        </span>
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const { user, profile, updateProfile } = useAuth()
  const [tab, setTab] = useState('university')
  const [entries, setEntries] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLeaderboard(); loadGroups() }, [tab, selectedGroup, profile])

  async function buildRankings(userIds) {
    if (!userIds.length) return []
    // Fetch all completed night-time sessions for these users
    const { data: sessions } = await supabase
      .from('drink_sessions')
      .select('user_id, started_at, total_standard_drinks')
      .in('user_id', userIds)
      .eq('status', 'completed')

    // Group sessions by user
    const byUser = {}
    for (const s of sessions || []) {
      if (!byUser[s.user_id]) byUser[s.user_id] = []
      byUser[s.user_id].push(s)
    }
    return byUser
  }

  async function loadLeaderboard() {
    setLoading(true)

    if (tab === 'university' && profile?.university_name) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, show_on_leaderboard')
        .eq('university_name', profile.university_name)
        .eq('show_on_leaderboard', true)

      if (profiles) {
        const userIds = profiles.map((p) => p.id)
        const byUser = await buildRankings(userIds)

        setEntries(
          profiles
            .map((p) => ({ ...p, drinks: parseFloat(bestNightDrinks(byUser[p.id] || []).toFixed(1)) }))
            .sort((a, b) => b.drinks - a.drinks)
        )
      }

    } else if (tab === 'group' && selectedGroup) {
      const { data: members } = await supabase
        .from('friend_group_members')
        .select('user_id, profiles:profiles!friend_group_members_user_id_fkey(id, display_name)')
        .eq('group_id', selectedGroup)

      if (members) {
        const userIds = members.map((m) => m.user_id)
        const byUser = await buildRankings(userIds)

        setEntries(
          members
            .map((m) => ({
              id: m.user_id,
              display_name: m.profiles?.display_name || 'Unknown',
              drinks: parseFloat(bestNightDrinks(byUser[m.user_id] || []).toFixed(1)),
            }))
            .sort((a, b) => b.drinks - a.drinks)
        )
      }

    } else {
      setEntries([])
    }

    setLoading(false)
  }

  async function loadGroups() {
    const { data } = await supabase
      .from('friend_group_members')
      .select('group_id, friend_groups!inner(id, name)')
      .eq('user_id', user.id)
    setGroups(data?.map((d) => d.friend_groups) || [])
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245,200,66,0.15)' }}
          >
            <Trophy size={20} style={{ color: '#f5c842' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Leaderboard</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Best single night (8 PM – 6 AM)</p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-5 rounded-2xl p-1"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {['university', 'group'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold capitalize"
              style={
                tab === t
                  ? { background: 'linear-gradient(135deg, #f5c842, #f0a020)', color: '#0a0c14' }
                  : { color: 'var(--text-muted)' }
              }
            >
              {t === 'university' ? '🎓 University' : '👥 Group'}
            </button>
          ))}
        </div>

        {/* Opt-in */}
        <div
          className="flex items-center justify-between mb-5 px-4 py-3.5 rounded-2xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Show my name</p>
          <button
            onClick={() => updateProfile({ show_on_leaderboard: !profile?.show_on_leaderboard })}
            className="w-12 h-6 rounded-full relative shrink-0"
            style={{ backgroundColor: profile?.show_on_leaderboard ? '#f5c842' : 'var(--border)', transition: 'background 0.2s' }}
          >
            <div
              className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
              style={{ transform: profile?.show_on_leaderboard ? 'translateX(24px)' : 'translateX(2px)', transition: 'transform 0.2s ease' }}
            />
          </button>
        </div>

        {/* Group selector */}
        {tab === 'group' && (
          <div className="mb-5">
            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-input)', border: '1.5px solid var(--border)', color: 'var(--text)', outline: 'none' }}
            >
              <option value="">Select a group…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: '#f5c842', borderTopColor: 'transparent' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            {tab === 'university' && !profile?.university_name
              ? '🎓 Set your university in Profile to see rankings.'
              : tab === 'group' && !selectedGroup
              ? '👥 Select a group to see rankings.'
              : '🏁 No night sessions yet — be the first!'}
          </div>
        ) : (
          <>
            {/* Podium top 3 */}
            {top3.length > 0 && (
              <div className="flex gap-2 mb-5 items-end">
                {/* Reorder: 2nd, 1st, 3rd for visual podium */}
                {[
                  top3[1] && { entry: top3[1], rank: 2 },
                  top3[0] && { entry: top3[0], rank: 1 },
                  top3[2] && { entry: top3[2], rank: 3 },
                ].filter(Boolean).map(({ entry, rank }) => (
                  <PodiumCard
                    key={entry.id}
                    rank={rank}
                    entry={entry}
                    isYou={entry.id === user.id}
                  />
                ))}
              </div>
            )}

            {/* Rest of list */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((entry, i) => (
                  <RankRow
                    key={entry.id}
                    rank={i + 4}
                    entry={entry}
                    isYou={entry.id === user.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-xs text-center mt-6 pb-2" style={{ color: 'var(--text-muted)' }}>
          🍺 Best single night · 8 PM–6 AM window · Drink responsibly
        </p>
      </div>
    </div>
  )
}
