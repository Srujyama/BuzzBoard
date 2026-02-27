import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { calculateLimits } from '../utils/bac'
import toast from 'react-hot-toast'

export default function Onboarding() {
  const { updateProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [gender, setGender] = useState('')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [weight, setWeight] = useState('')
  const [university, setUniversity] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const heightInches = parseInt(feet) * 12 + parseInt(inches || 0)
    const weightLbs = parseInt(weight)

    if (!gender || !heightInches || !weightLbs) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    const limits = calculateLimits(weightLbs, gender)

    const { error } = await updateProfile({
      biological_gender: gender,
      height_inches: heightInches,
      weight_lbs: weightLbs,
      university_name: university || null,
      calculated_low_limit: limits.low,
      calculated_med_limit: limits.med,
      calculated_high_limit: limits.high,
      onboarding_complete: true,
    })

    setLoading(false)
    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile set up!')
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-buzz-primary">Buzz</span>Board
        </h1>
        <p className="text-gray-400 text-center mb-8">Let's personalize your experience</p>

        <div className="flex gap-2 mb-8 justify-center">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-16 rounded-full ${
                s <= step ? 'bg-buzz-primary' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-3">Biological Gender</label>
              <div className="grid grid-cols-2 gap-3">
                {['male', 'female'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-4 rounded-lg border text-center capitalize font-medium transition-colors ${
                      gender === g
                        ? 'border-buzz-primary bg-buzz-primary/10 text-buzz-primary'
                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Used for BAC calculation (Widmark formula uses different body water ratios)
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Height</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    value={feet}
                    onChange={(e) => setFeet(e.target.value)}
                    min="3"
                    max="8"
                    placeholder="Feet"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={inches}
                    onChange={(e) => setInches(e.target.value)}
                    min="0"
                    max="11"
                    placeholder="Inches"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Weight (lbs)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                min="80"
                max="500"
                placeholder="Weight in pounds"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!gender || !feet || !weight) {
                  toast.error('Please fill in gender, height, and weight')
                  return
                }
                setStep(2)
              }}
              className="w-full py-3 bg-buzz-primary text-gray-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">University (optional)</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. State University"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
              />
              <p className="text-xs text-gray-500 mt-1">For leaderboard grouping</p>
            </div>

            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="font-medium mb-3">Your Estimated Limits</h3>
              {feet && weight && gender && (() => {
                const limits = calculateLimits(parseInt(weight), gender)
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-buzz-safe">Low (feeling it)</span>
                      <span className="font-semibold">{limits.low} drinks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-buzz-primary">Medium (buzzed)</span>
                      <span className="font-semibold">{limits.med} drinks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-buzz-danger">High (legal limit)</span>
                      <span className="font-semibold">{limits.high} drinks</span>
                    </div>
                  </div>
                )
              })()}
              <p className="text-xs text-gray-500 mt-3">
                These will be fine-tuned over your first 3 sessions
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-600 rounded-lg hover:border-gray-400 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-buzz-primary text-gray-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
