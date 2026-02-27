export default function LeaderboardRow({ rank, name, stat, statLabel, isYou }) {
  const initials = (name || '??')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isYou ? 'bg-buzz-primary/10 border border-buzz-primary' : 'bg-gray-900 border border-gray-800'
      }`}
    >
      <span className="text-lg font-bold w-8 text-center text-gray-400">
        {rank}
      </span>
      <div className="w-9 h-9 rounded-full bg-buzz-primary/20 flex items-center justify-center text-buzz-primary font-semibold text-xs">
        {initials}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">
          {name} {isYou && <span className="text-buzz-primary text-xs">(you)</span>}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-sm">{stat}</p>
        <p className="text-xs text-gray-400">{statLabel}</p>
      </div>
    </div>
  )
}
