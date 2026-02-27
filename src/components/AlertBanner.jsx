import { AlertTriangle, XCircle } from 'lucide-react'

export default function AlertBanner({ totalDrinks, limits, bac }) {
  if (!limits) return null

  let message = null
  let severity = null

  if (bac >= 0.08) {
    severity = 'danger'
    message = 'You are at the legal limit. Please stop drinking and stay safe.'
  } else if (totalDrinks >= limits.high) {
    severity = 'danger'
    message = 'You\'ve reached your high limit. Time to stop and hydrate.'
  } else if (totalDrinks >= limits.med) {
    severity = 'warning'
    message = 'You\'ve passed your medium limit. Consider slowing down.'
  } else if (totalDrinks >= limits.low) {
    severity = 'info'
    message = 'You\'ve hit your low limit. Pace yourself and drink water.'
  }

  if (!message) return null

  const styles = {
    danger: 'bg-red-900/40 border-red-700 text-red-200',
    warning: 'bg-amber-900/40 border-amber-700 text-amber-200',
    info: 'bg-green-900/40 border-green-700 text-green-200',
  }

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${styles[severity]}`}>
      {severity === 'danger' ? (
        <XCircle size={20} className="shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs opacity-75 mt-1">Drink responsibly. Stay hydrated.</p>
      </div>
    </div>
  )
}
