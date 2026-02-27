import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDrinkSession } from '../hooks/useDrinkSession'
import LimitBadge from '../components/LimitBadge'
import { Play, ClipboardList, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const { profile } = useAuth()
  const { activeSession, totalDrinks, startSession, loading } = useDrinkSession()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-buzz-primary" />
      </div>
    )
  }

  const limits = profile
    ? {
        low: profile.calculated_low_limit,
        med: profile.calculated_med_limit,
        high: profile.calculated_high_limit,
      }
    : { low: 0, med: 0, high: 0 }

  async function handleStartNight() {
    if (activeSession) {
      navigate('/track')
      return
    }
    const { error } = await startSession()
    if (!error) navigate('/track')
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Hey, {profile?.display_name || 'there'}
        </h1>
        <p className="text-gray-400 text-sm">Drink smart. Stay safe.</p>
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <button
          onClick={() => navigate('/track')}
          className="w-full mb-6 p-4 bg-buzz-primary/10 border border-buzz-primary rounded-xl flex items-center justify-between"
        >
          <div>
            <p className="text-buzz-primary font-semibold">Night in progress</p>
            <p className="text-sm text-gray-400">{totalDrinks} drinks logged</p>
          </div>
          <Play size={24} className="text-buzz-primary" />
        </button>
      )}

      {/* Limits */}
      <div className="mb-6">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Your Limits</h2>
        <div className="grid grid-cols-3 gap-3">
          <LimitBadge level="low" drinkCount={limits.low} currentDrinks={totalDrinks} />
          <LimitBadge level="med" drinkCount={limits.med} currentDrinks={totalDrinks} />
          <LimitBadge level="high" drinkCount={limits.high} currentDrinks={totalDrinks} />
        </div>
        {profile?.personal_drink_limit && (
          <p className="text-sm text-gray-400 mt-2">
            Your personal goal: {profile.personal_drink_limit} drinks
          </p>
        )}
      </div>

      {/* Calibration Prompt */}
      {profile && profile.calibration_count < 3 && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center gap-3">
            <ClipboardList size={20} className="text-buzz-primary" />
            <div>
              <p className="font-medium text-sm">Calibration in Progress</p>
              <p className="text-xs text-gray-400">
                {profile.calibration_count} of 3 sessions completed. Your limits
                get more accurate with each session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mb-6">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Quick Stats</h2>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-buzz-primary" />
            <div>
              <p className="text-sm text-gray-400">Calibration Progress</p>
              <p className="font-medium">{profile?.calibration_count || 0}/3 sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Start Night Button */}
      {!activeSession && (
        <button
          onClick={handleStartNight}
          className="w-full py-4 bg-buzz-primary text-gray-950 font-bold rounded-xl text-lg hover:bg-amber-400 transition-colors"
        >
          Start a Night
        </button>
      )}

      {/* Responsible Drinking */}
      <p className="text-xs text-gray-500 text-center mt-6">
        Always drink responsibly. Never drink and drive.
      </p>
    </div>
  )
}
