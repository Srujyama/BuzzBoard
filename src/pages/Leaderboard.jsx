import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import LeaderboardRow from '../components/LeaderboardRow'
import { Trophy } from 'lucide-react'

export default function Leaderboard() {
  const { user, profile, updateProfile } = useAuth()
  const [tab, setTab] = useState('university')
  const [entries, setEntries] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
    loadGroups()
  }, [tab, selectedGroup, profile])

  async function loadLeaderboard() {
    setLoading(true)

    if (tab === 'university' && profile?.university_name) {
      // Get all profiles at this university who opted in
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, show_on_leaderboard')
        .eq('university_name', profile.university_name)
        .eq('show_on_leaderboard', true)

      if (profiles) {
        // Get session counts for these users
        const userIds = profiles.map((p) => p.id)
        const { data: sessions } = await supabase
          .from('drink_sessions')
          .select('user_id')
          .in('user_id', userIds)
          .eq('status', 'completed')

        const sessionCounts = (sessions || []).reduce((acc, s) => {
          acc[s.user_id] = (acc[s.user_id] || 0) + 1
          return acc
        }, {})

        const ranked = profiles
          .map((p) => ({
            ...p,
            sessions: sessionCounts[p.id] || 0,
          }))
          .sort((a, b) => b.sessions - a.sessions)

        setEntries(ranked)
      }
    } else if (tab === 'group' && selectedGroup) {
      const { data: members } = await supabase
        .from('friend_group_members')
        .select('user_id, profiles:profiles!friend_group_members_user_id_fkey(id, display_name)')
        .eq('group_id', selectedGroup)

      if (members) {
        const userIds = members.map((m) => m.user_id)
        const { data: sessions } = await supabase
          .from('drink_sessions')
          .select('user_id')
          .in('user_id', userIds)
          .eq('status', 'completed')

        const sessionCounts = (sessions || []).reduce((acc, s) => {
          acc[s.user_id] = (acc[s.user_id] || 0) + 1
          return acc
        }, {})

        const ranked = members
          .map((m) => ({
            id: m.user_id,
            display_name: m.profiles?.display_name || 'Unknown',
            sessions: sessionCounts[m.user_id] || 0,
          }))
          .sort((a, b) => b.sessions - a.sessions)

        setEntries(ranked)
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

  async function toggleLeaderboard() {
    const newVal = !profile?.show_on_leaderboard
    await updateProfile({ show_on_leaderboard: newVal })
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-buzz-primary" size={24} />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      {/* Opt-in Toggle */}
      <div className="flex items-center justify-between mb-6 p-3 bg-gray-900 rounded-lg border border-gray-800">
        <div>
          <p className="text-sm font-medium">Show on leaderboard</p>
          <p className="text-xs text-gray-400">Others can see your session count</p>
        </div>
        <button
          onClick={toggleLeaderboard}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            profile?.show_on_leaderboard ? 'bg-buzz-primary' : 'bg-gray-700'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
              profile?.show_on_leaderboard ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1">
        <button
          onClick={() => setTab('university')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'university' ? 'bg-gray-800 text-white' : 'text-gray-400'
          }`}
        >
          University
        </button>
        <button
          onClick={() => setTab('group')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'group' ? 'bg-gray-800 text-white' : 'text-gray-400'
          }`}
        >
          Groups
        </button>
      </div>

      {/* Group Selector */}
      {tab === 'group' && (
        <div className="mb-4">
          <select
            value={selectedGroup || ''}
            onChange={(e) => setSelectedGroup(e.target.value || null)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
          >
            <option value="">Select a group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Leaderboard */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {tab === 'university' && !profile?.university_name
            ? 'Set your university in Profile to see the leaderboard.'
            : tab === 'group' && !selectedGroup
            ? 'Select a group to see rankings.'
            : 'No entries yet. Be the first!'}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.id}
              rank={i + 1}
              name={entry.display_name}
              stat={entry.sessions}
              statLabel="sessions"
              isYou={entry.id === user.id}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-6">
        Ranked by total sessions completed. Drink responsibly.
      </p>
    </div>
  )
}
