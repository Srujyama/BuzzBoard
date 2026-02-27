import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import FriendCard from '../components/FriendCard'
import { UserPlus, Users, Bell, Search } from 'lucide-react'
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

  useEffect(() => {
    loadData()
    // Realtime alerts subscription
    const channel = supabase
      .channel('friend-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_alerts',
          filter: `friend_id=eq.${user.id}`,
        },
        (payload) => {
          toast(payload.new.message, { icon: '⚠️', duration: 5000 })
          setAlerts((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadData() {
    setLoading(true)
    const [friendsRes, requestsRes, alertsRes, groupsRes] = await Promise.all([
      // Accepted friendships
      supabase
        .from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      // Pending requests to me
      supabase
        .from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(*)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending'),
      // Alerts
      supabase
        .from('friend_alerts')
        .select('*')
        .eq('friend_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      // Groups
      supabase
        .from('friend_groups')
        .select('*, friend_group_members(user_id)')
        .eq('creator_id', user.id),
    ])

    // Map friends
    const friendList = (friendsRes.data || []).map((f) => {
      const friendProfile =
        f.requester_id === user.id ? f.addressee : f.requester
      return {
        ...friendProfile,
        friendship_id: f.id,
        can_see_drinks: f.can_see_drinks,
      }
    })

    setFriends(friendList)
    setRequests(requestsRes.data || [])
    setAlerts(alertsRes.data || [])
    setGroups(groupsRes.data || [])
    setLoading(false)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', `%${searchQuery}%`)
      .neq('id', user.id)
      .limit(10)
    setSearchResults(data || [])
  }

  async function sendFriendRequest(addresseeId) {
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: addresseeId })
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Request already sent' : 'Failed to send request')
    } else {
      toast.success('Friend request sent!')
      setSearchResults([])
      setSearchQuery('')
    }
  }

  async function acceptRequest(friendshipId) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    toast.success('Friend request accepted!')
    loadData()
  }

  async function toggleVisibility(friendId) {
    const friend = friends.find((f) => f.id === friendId)
    if (!friend) return
    await supabase
      .from('friendships')
      .update({ can_see_drinks: !friend.can_see_drinks })
      .eq('id', friend.friendship_id)
    setFriends((prev) =>
      prev.map((f) =>
        f.id === friendId ? { ...f, can_see_drinks: !f.can_see_drinks } : f
      )
    )
  }

  async function createGroup() {
    if (!newGroupName.trim()) return
    const { error } = await supabase
      .from('friend_groups')
      .insert({ creator_id: user.id, name: newGroupName })
    if (error) {
      toast.error('Failed to create group')
    } else {
      toast.success('Group created!')
      setNewGroupName('')
      loadData()
    }
  }

  const tabs = [
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'requests', label: 'Requests', icon: UserPlus, badge: requests.length },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alerts.filter((a) => !a.is_read).length },
  ]

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Social</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1">
        {tabs.map(({ id, label, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors relative ${
              tab === id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
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
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Friends Tab */}
          {tab === 'friends' && (
            <div>
              {/* Search */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name..."
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-buzz-primary text-white"
                />
                <button
                  onClick={handleSearch}
                  className="px-3 py-2 bg-buzz-primary text-gray-950 rounded-lg"
                >
                  <Search size={16} />
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs text-gray-400">Search Results</p>
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800"
                    >
                      <span className="text-sm">{result.display_name}</span>
                      <button
                        onClick={() => sendFriendRequest(result.id)}
                        className="text-xs px-3 py-1 bg-buzz-primary text-gray-950 rounded-md font-medium"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends List */}
              <div className="space-y-2">
                {friends.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    No friends yet. Search for people to add!
                  </p>
                ) : (
                  friends.map((friend) => (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      canSeeDrinks={friend.can_see_drinks}
                      onToggleVisibility={toggleVisibility}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {tab === 'requests' && (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No pending requests</p>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800"
                  >
                    <span className="text-sm">{req.requester?.display_name}</span>
                    <button
                      onClick={() => acceptRequest(req.id)}
                      className="text-xs px-3 py-1 bg-buzz-safe text-white rounded-md font-medium"
                    >
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
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="New group name..."
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-buzz-primary text-white"
                />
                <button
                  onClick={createGroup}
                  className="px-4 py-2 bg-buzz-primary text-gray-950 rounded-lg text-sm font-medium"
                >
                  Create
                </button>
              </div>
              <div className="space-y-2">
                {groups.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No groups yet</p>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group.id}
                      className="p-3 bg-gray-900 rounded-lg border border-gray-800"
                    >
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-gray-400">
                        {group.friend_group_members?.length || 0} members
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {tab === 'alerts' && (
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No alerts yet</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.is_read
                        ? 'bg-gray-900 border-gray-800'
                        : 'bg-red-900/20 border-red-800'
                    }`}
                  >
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
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
