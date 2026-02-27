import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateLimits } from '../utils/bac'
import toast from 'react-hot-toast'

export default function CalibrationSurvey() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  const [drinksConsumed, setDrinksConsumed] = useState('')
  const [feelingRating, setFeelingRating] = useState(3)
  const [couldHandleMore, setCouldHandleMore] = useState(null)
  const [loading, setLoading] = useState(false)

  const sessionNumber = (profile?.calibration_count || 0) + 1

  async function handleSubmit(e) {
    e.preventDefault()
    if (couldHandleMore === null) {
      toast.error('Please answer all questions')
      return
    }

    setLoading(true)

    // Insert calibration session
    const { error: calError } = await supabase
      .from('calibration_sessions')
      .insert({
        user_id: profile.id,
        session_number: sessionNumber,
        drinks_consumed: parseInt(drinksConsumed) || 0,
        feeling_rating: feelingRating,
        could_handle_more: couldHandleMore,
      })

    if (calError) {
      toast.error('Failed to save calibration')
      setLoading(false)
      return
    }

    const newCount = sessionNumber
    const updates = { calibration_count: newCount }

    // After 3rd session, recalculate limits with calibration data
    if (newCount >= 3) {
      const baseLimits = calculateLimits(profile.weight_lbs, profile.biological_gender)

      // Fetch all 3 calibration sessions
      const { data: sessions } = await supabase
        .from('calibration_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('session_number')

      if (sessions && sessions.length >= 3) {
        const handleMoreCount = sessions.filter((s) => s.could_handle_more).length
        const avgFeeling = sessions.reduce((s, c) => s + c.feeling_rating, 0) / sessions.length

        let adjustment = 0
        if (handleMoreCount >= 2 && avgFeeling >= 3) adjustment = 1
        else if (handleMoreCount === 0 && avgFeeling <= 2) adjustment = -1

        updates.calculated_low_limit = Math.max(1, baseLimits.low + adjustment)
        updates.calculated_med_limit = Math.max(2, baseLimits.med + adjustment)
        updates.calculated_high_limit = Math.min(
          baseLimits.high + adjustment,
          baseLimits.high
        )
      }
    }

    await updateProfile(updates)
    setLoading(false)
    toast.success(
      newCount >= 3
        ? 'Calibration complete! Your limits have been updated.'
        : `Calibration ${newCount}/3 saved.`
    )
    navigate(sessionId ? `/session/${sessionId}` : '/dashboard')
  }

  const feelings = [
    { value: 1, label: 'Awful' },
    { value: 2, label: 'Bad' },
    { value: 3, label: 'Okay' },
    { value: 4, label: 'Good' },
    { value: 5, label: 'Great' },
  ]

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Calibration Survey</h1>
      <p className="text-gray-400 text-sm mb-6">
        Session {sessionNumber} of 3 — Help us fine-tune your limits
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drinks Consumed */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            How many drinks did you have tonight?
          </label>
          <input
            type="number"
            value={drinksConsumed}
            onChange={(e) => setDrinksConsumed(e.target.value)}
            min="0"
            max="30"
            required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
          />
        </div>

        {/* Feeling Rating */}
        <div>
          <label className="block text-sm text-gray-400 mb-3">
            How did you feel overall?
          </label>
          <div className="flex gap-2">
            {feelings.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFeelingRating(value)}
                className={`flex-1 py-3 rounded-lg text-xs font-medium border transition-colors ${
                  feelingRating === value
                    ? 'border-buzz-primary bg-buzz-primary/10 text-buzz-primary'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Could Handle More */}
        <div>
          <label className="block text-sm text-gray-400 mb-3">
            Could you have handled more drinks?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setCouldHandleMore(val)}
                className={`py-3 rounded-lg border font-medium transition-colors ${
                  couldHandleMore === val
                    ? 'border-buzz-primary bg-buzz-primary/10 text-buzz-primary'
                    : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-buzz-primary text-gray-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Submit'}
        </button>
      </form>
    </div>
  )
}
