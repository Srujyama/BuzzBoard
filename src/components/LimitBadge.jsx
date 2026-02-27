export default function LimitBadge({ level, drinkCount, currentDrinks }) {
  const colors = {
    low: { bg: 'bg-green-900/30', border: 'border-green-700', text: 'text-buzz-safe', label: 'Low' },
    med: { bg: 'bg-amber-900/30', border: 'border-amber-700', text: 'text-buzz-primary', label: 'Medium' },
    high: { bg: 'bg-red-900/30', border: 'border-red-700', text: 'text-buzz-danger', label: 'High' },
  }

  const c = colors[level] || colors.low
  const isActive = currentDrinks >= drinkCount

  return (
    <div
      className={`rounded-lg border p-3 text-center ${c.bg} ${c.border} ${
        isActive ? 'ring-2 ring-offset-1 ring-offset-gray-950 ring-current' : ''
      }`}
    >
      <p className={`text-xs uppercase tracking-wide ${c.text}`}>{c.label}</p>
      <p className={`text-2xl font-bold ${c.text}`}>{drinkCount}</p>
      <p className="text-xs text-gray-400">drinks</p>
    </div>
  )
}
