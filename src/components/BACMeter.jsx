import { getBACStatus } from '../utils/bac'

export default function BACMeter({ bac }) {
  const status = getBACStatus(bac)
  const percentage = Math.min(bac / 0.12, 1)
  const angle = percentage * 180

  const colorMap = {
    'buzz-safe': '#22c55e',
    'buzz-primary': '#f59e0b',
    'buzz-warning': '#f97316',
    'buzz-danger': '#ef4444',
  }
  const strokeColor = colorMap[status.color] || '#22c55e'

  const radius = 70
  const circumference = Math.PI * radius
  const offset = circumference - (percentage * circumference)

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="-mt-14 text-center">
        <p className={`text-3xl font-bold text-${status.color}`}>
          {bac.toFixed(3)}
        </p>
        <p className={`text-sm text-${status.color}`}>{status.message}</p>
      </div>
    </div>
  )
}
