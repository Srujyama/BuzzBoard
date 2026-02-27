import { Eye, EyeOff } from 'lucide-react'

export default function FriendCard({ friend, canSeeDrinks, onToggleVisibility }) {
  const initials = (friend.display_name || '??')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-buzz-primary/20 flex items-center justify-center text-buzz-primary font-semibold text-sm">
          {initials}
        </div>
        <div>
          <p className="font-medium text-sm">{friend.display_name}</p>
          {friend.has_active_session && (
            <p className="text-xs text-buzz-safe">Active session</p>
          )}
        </div>
      </div>
      {onToggleVisibility && (
        <button
          onClick={() => onToggleVisibility(friend.id)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title={canSeeDrinks ? 'They can see your drinks' : 'Hidden from them'}
        >
          {canSeeDrinks ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      )}
    </div>
  )
}
