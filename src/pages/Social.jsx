import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import FriendCard from '../components/FriendCard'
import { UserPlus, Users, Bell, Search, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Social() {
  const { user } = useAuth()
  const [tab, setTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [alerts, setAlerts] = useState([])
  const [groups, setGroups] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  // Group management state
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [groupMembers, setGroupMembers] = useState({}) // groupId → [{user_id, display_name}]
  const [loadingMembers, setLoadingMembers] = useState({})

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('friend-alerts')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'friend_alerts',
        filter: `friend_id=eq.${user.id}`,
      }, (payload) => {
        toast(payload.new.message, { icon: '⚠️', duration: 5000 })
        setAlerts((prev) => [payload.new, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadData() {
    setLoading(true)
    const [friendsRes, requestsRes, alertsRes, groupsRes] = await Promise.all([
      supabase.from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      supabase.from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(*)')
        .eq('addressee_id', user.id).eq('status', 'pending'),
      supabase.from('friend_alerts').select('*').eq('friend_id', user.id)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('friend_groups').select('*, friend_group_members(user_id)').eq('creator_id', user.id),
    ])

    const friendList = (friendsRes.data || []).map((f) => {
      const friendProfile = f.requester_id === user.id ? f.addressee : f.requester
      return { ...friendProfile, friendship_id: f.id, can_see_drinks: f.can_see_drinks }
    })

    setFriends(friendList)
    setRequests(requestsRes.data || [])
    setAlerts(alertsRes.data || [])
    setGroups(groupsRes.data || [])
    setLoading(false)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    const { data } = await supabase.from('profiles').select('id, display_name')
      .ilike('display_name', `%${searchQuery}%`).neq('id', user.id).limit(10)
    setSearchResults(data || [])
  }

  async function sendFriendRequest(addresseeId) {
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId })
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Request already sent' : 'Failed to send request')
    } else {
      toast.success('Friend request sent!')
      setSearchResults([])
      setSearchQuery('')
    }
  }

  async function acceptRequest(friendshipId) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    toast.success('Friend request accepted!')
    loadData()
  }

  async function toggleVisibility(friendId) {
    const friend = friends.find((f) => f.id === friendId)
    if (!friend) return
    await supabase.from('friendships').update({ can_see_drinks: !friend.can_see_drinks }).eq('id', friend.friendship_id)
    setFriends((prev) => prev.map((f) => f.id === friendId ? { ...f, can_see_drinks: !f.can_see_drinks } : f))
  }

  async function createGroup() {
    if (!newGroupName.trim()) return
    const { data, error } = await supabase.from('friend_groups')
      .insert({ creator_id: user.id, name: newGroupName })
      .select()
      .single()
    if (error) {
      toast.error('Failed to create group')
    } else {
      toast.success('Group created!')
      setNewGroupName('')
      // Auto-add creator as a member
      await supabase.from('friend_group_members').insert({ group_id: data.id, user_id: user.id })
      loadData()
    }
  }

  async function loadGroupMembers(groupId) {
    if (groupMembers[groupId]) return // cached
    setLoadingMembers((prev) => ({ ...prev, [groupId]: true }))
    const { data } = await supabase
      .from('friend_group_members')
      .select('user_id, profiles:profiles!friend_group_members_user_id_fkey(id, display_name)')
      .eq('group_id', groupId)
    setGroupMembers((prev) => ({
      ...prev,
      [groupId]: (data || []).map((m) => ({ user_id: m.user_id, display_name: m.profiles?.display_name || 'Unknown' })),
    }))
    setLoadingMembers((prev) => ({ ...prev, [groupId]: false }))
  }

  async function toggleGroup(groupId) {
    if (expandedGroup === groupId) {
      setExpandedGroup(null)
    } else {
      setExpandedGroup(groupId)
      await loadGroupMembers(groupId)
    }
  }

  async function addMemberToGroup(groupId, friendId) {
    // Check if already a member
    const existing = (groupMembers[groupId] || []).find((m) => m.user_id === friendId)
    if (existing) { toast.error('Already in this group'); return }
    const { error } = await supabase.from('friend_group_members').insert({ group_id: groupId, user_id: friendId })
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Already in group' : 'Failed to add member')
    } else {
      toast.success('Member added!')
      // Refresh members for this group
      setGroupMembers((prev) => ({ ...prev, [groupId]: undefined }))
      await loadGroupMembers(groupId)
      // Refresh group list to update counts
      const { data } = await supabase.from('friend_groups')
        .select('*, friend_group_members(user_id)').eq('creator_id', user.id)
      setGroups(data || [])
    }
  }

  async function removeMemberFromGroup(groupId, memberId) {
    if (memberId === user.id) { toast.error("Can't remove yourself (you own this group)"); return }
    const { error } = await supabase.from('friend_group_members')
      .delete().eq('group_id', groupId).eq('user_id', memberId)
    if (error) {
      toast.error('Failed to remove member')
    } else {
      setGroupMembers((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter((m) => m.user_id !== memberId),
      }))
      toast.success('Member removed')
    }
  }

  const tabs = [
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'requests', label: 'Requests', icon: UserPlus, badge: requests.length },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alerts.filter((a) => !a.is_read).length },
  ]

  const inputStyle = {
    flex: 1,
    padding: '0.6rem 0.875rem',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: '0.75rem',
    color: 'var(--text)',
    outline: 'none',
    fontSize: '0.875rem',
  }

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--text)' }}>Social</h1>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 rounded-2xl p-1"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {tabs.map(({ id, label, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-colors relative ${
              tab === id ? 'bg-buzz-primary text-gray-950' : ''
            }`}
            style={tab !== id ? { color: 'var(--text-muted)' } : {}}
          >
            {label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-buzz-danger text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <>
          {/* Friends Tab */}
          {tab === 'friends' && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name..."
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <button onClick={handleSearch} className="px-3 py-2 bg-buzz-primary text-gray-950 rounded-xl font-bold">
                  <Search size={16} />
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Results</p>
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 rounded-xl border"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    >
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{result.display_name}</span>
                      <button onClick={() => sendFriendRequest(result.id)}
                        className="text-xs px-3 py-1.5 bg-buzz-primary text-gray-950 rounded-lg font-bold">
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {friends.length === 0 ? (
                  <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
                    No friends yet. Search for people to add!
                  </p>
                ) : (
                  friends.map((friend) => (
                    <FriendCard key={friend.id} friend={friend} canSeeDrinks={friend.can_see_drinks} onToggleVisibility={toggleVisibility} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {tab === 'requests' && (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No pending requests</p>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{req.requester?.display_name}</span>
                    <button onClick={() => acceptRequest(req.id)}
                      className="text-xs px-3 py-1.5 bg-buzz-safe text-white rounded-lg font-bold">
                      Accept
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Groups Tab */}
          {tab === 'groups' && (
            <div>
              {/* Create group */}
              <div className="flex gap-2 mb-5">
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                  placeholder="New group name..."
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <button onClick={createGroup} className="px-4 py-2 bg-buzz-primary text-gray-950 rounded-xl text-sm font-bold">
                  Create
                </button>
              </div>

              <div className="space-y-3">
                {groups.length === 0 ? (
                  <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No groups yet. Create one above!</p>
                ) : (
                  groups.map((group) => {
                    const isExpanded = expandedGroup === group.id
                    const members = groupMembers[group.id] || []
                    const memberCount = group.friend_group_members?.length || 0

                    return (
                      <div
                        key={group.id}
                        className="rounded-2xl border overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: isExpanded ? 'rgba(245,200,66,0.35)' : 'var(--border)' }}
                      >
                        {/* Group header row */}
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className="w-full flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{ background: 'rgba(245,200,66,0.15)' }}
                            >
                              <Users size={16} style={{ color: '#f5c842' }} />
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{group.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          {isExpanded
                            ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                            : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                          }
                        </button>

                        {/* Expanded: members + add friends */}
                        {isExpanded && (
                          <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--border)' }}>

                            {/* Current members */}
                            <p className="text-xs font-semibold uppercase tracking-widest mt-3 mb-2" style={{ color: 'var(--text-muted)' }}>
                              Members
                            </p>
                            {loadingMembers[group.id] ? (
                              <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                            ) : members.length === 0 ? (
                              <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No members yet</p>
                            ) : (
                              <div className="space-y-1.5 mb-3">
                                {members.map((m) => (
                                  <div
                                    key={m.user_id}
                                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                                    style={{ backgroundColor: 'var(--bg-input)' }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                                        style={{ background: 'rgba(245,200,66,0.2)', color: '#f5c842' }}
                                      >
                                        {(m.display_name || '?')[0].toUpperCase()}
                                      </div>
                                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                        {m.display_name}{m.user_id === user.id ? ' (you)' : ''}
                                      </span>
                                    </div>
                                    {m.user_id !== user.id && (
                                      <button
                                        onClick={() => removeMemberFromGroup(group.id, m.user_id)}
                                        className="p-1 rounded-lg"
                                        style={{ color: 'var(--text-muted)' }}
                                        title="Remove"
                                      >
                                        <X size={13} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add friends to group */}
                            {friends.length > 0 && (
                              <>
                                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                                  Add Friends
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {friends
                                    .filter((f) => !(groupMembers[group.id] || []).some((m) => m.user_id === f.id))
                                    .map((friend) => (
                                      <button
                                        key={friend.id}
                                        onClick={() => addMemberToGroup(group.id, friend.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                                        style={{
                                          backgroundColor: 'var(--bg-input)',
                                          borderColor: 'var(--border)',
                                          color: 'var(--text)',
                                        }}
                                      >
                                        <Plus size={11} />
                                        {friend.display_name}
                                      </button>
                                    ))}
                                  {friends.every((f) => (groupMembers[group.id] || []).some((m) => m.user_id === f.id)) && (
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All friends already in group</p>
                                  )}
                                </div>
                              </>
                            )}

                            {friends.length === 0 && (
                              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                Add friends first to invite them to groups.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {tab === 'alerts' && (
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No alerts yet</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id}
                    className={`p-3 rounded-xl border ${alert.is_read ? '' : 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800'}`}
                    style={alert.is_read ? { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' } : {}}>
                    <p className="text-sm font-medium" style={alert.is_read ? { color: 'var(--text)' } : { color: '#991b1b' }}>{alert.message}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
