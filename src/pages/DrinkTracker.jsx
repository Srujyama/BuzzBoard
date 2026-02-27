import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDrinkSession } from '../hooks/useDrinkSession'
import { DRINK_TYPES } from '../utils/bac'
import BACMeter from '../components/BACMeter'
import DrinkCard from '../components/DrinkCard'
import AlertBanner from '../components/AlertBanner'
import toast from 'react-hot-toast'

const tips = [
  'Alternate alcoholic drinks with water.',
  'Eat before and during drinking.',
  'Know your limits and stick to them.',
  'Never leave your drink unattended.',
  'Plan your ride home before you go out.',
  'It\'s always okay to say no to another drink.',
]

export default function DrinkTracker() {
  const { profile } = useAuth()
  const {
    activeSession,
    drinkLogs,
    currentBAC,
    totalDrinks,
    loading,
    logDrink,
    endSession,
  } = useDrinkSession()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-buzz-primary" />
      </div>
    )
  }

  if (!activeSession) return <Navigate to="/dashboard" replace />

  const limits = {
    low: profile?.calculated_low_limit || 0,
    med: profile?.calculated_med_limit || 0,
    high: profile?.calculated_high_limit || 0,
  }

  const personalLimit = profile?.personal_drink_limit
  const effectiveLimit = personalLimit || limits.high

  async function handleLogDrink(type) {
    const { error } = await logDrink(type)
    if (error) {
      toast.error('Failed to log drink')
    } else {
      toast.success(`Logged: ${DRINK_TYPES[type].label}`)
    }
  }

  async function handleEndNight() {
    const { sessionId, error } = await endSession()
    if (error) {
      toast.error('Failed to end session')
    } else {
      // Check if calibration survey is needed
      if (profile.calibration_count < 3) {
        navigate(`/calibration?session=${sessionId}`)
      } else {
        navigate(`/session/${sessionId}`)
      }
    }
  }

  const tip = tips[Math.floor(Date.now() / 60000) % tips.length]
  const progress = effectiveLimit > 0 ? Math.min(totalDrinks / effectiveLimit, 1) : 0

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">Tonight's Session</h1>
        <p className="text-sm text-gray-400">
          Started {new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* BAC Meter */}
      <div className="mb-6">
        <BACMeter bac={currentBAC} />
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{totalDrinks} drinks</span>
          <span className="text-gray-400">
            {personalLimit ? `Goal: ${personalLimit}` : `Limit: ${limits.high}`}
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 1
                ? 'bg-buzz-danger'
                : progress >= 0.7
                ? 'bg-buzz-warning'
                : 'bg-buzz-safe'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Alert Banner */}
      <div className="mb-6">
        <AlertBanner totalDrinks={totalDrinks} limits={limits} bac={currentBAC} />
      </div>

      {/* Drink Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Object.entries(DRINK_TYPES).map(([type, info]) => (
          <DrinkCard
            key={type}
            drinkType={type}
            label={info.label}
            standardDrinks={info.standardDrinks}
            onLog={handleLogDrink}
          />
        ))}
      </div>

      {/* Recent Drinks Log */}
      {drinkLogs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm text-gray-400 mb-2">Tonight's Log</h3>
          <div className="bg-gray-900 rounded-lg border border-gray-800 divide-y divide-gray-800 max-h-40 overflow-y-auto">
            {[...drinkLogs].reverse().map((log) => (
              <div key={log.id} className="px-4 py-2 flex justify-between text-sm">
                <span className="capitalize">{log.drink_type}</span>
                <span className="text-gray-400">
                  {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* End Night Button */}
      <button
        onClick={handleEndNight}
        className="w-full py-4 border-2 border-gray-600 text-gray-300 font-semibold rounded-xl hover:border-gray-400 transition-colors mb-4"
      >
        End Night
      </button>

      {/* Tip */}
      <p className="text-xs text-gray-500 text-center italic">
        Tip: {tip}
      </p>
    </div>
  )
}
