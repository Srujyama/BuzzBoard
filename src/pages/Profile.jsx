import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { calculateLimits } from '../utils/bac'
import { LogOut, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { profile, signOut, updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [gender, setGender] = useState(profile?.biological_gender || '')
  const [feet, setFeet] = useState(
    profile?.height_inches ? Math.floor(profile.height_inches / 12).toString() : ''
  )
  const [inches, setInches] = useState(
    profile?.height_inches ? (profile.height_inches % 12).toString() : ''
  )
  const [weight, setWeight] = useState(profile?.weight_lbs?.toString() || '')
  const [university, setUniversity] = useState(profile?.university_name || '')
  const [personalLimit, setPersonalLimit] = useState(
    profile?.personal_drink_limit?.toString() || ''
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const heightInches = parseInt(feet) * 12 + parseInt(inches || 0)
    const weightLbs = parseInt(weight)
    const limits = calculateLimits(weightLbs, gender)

    const { error } = await updateProfile({
      display_name: displayName,
      biological_gender: gender,
      height_inches: heightInches,
      weight_lbs: weightLbs,
      university_name: university || null,
      personal_drink_limit: personalLimit ? parseInt(personalLimit) : null,
      calculated_low_limit: limits.low,
      calculated_med_limit: limits.med,
      calculated_high_limit: limits.high,
    })

    setSaving(false)
    if (error) toast.error('Failed to save')
    else toast.success('Profile updated!')
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="space-y-5">
        {/* Display Name */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Biological Gender</label>
          <div className="grid grid-cols-2 gap-3">
            {['male', 'female'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`py-3 rounded-lg border capitalize font-medium transition-colors ${
                  gender === g
                    ? 'border-buzz-primary bg-buzz-primary/10 text-buzz-primary'
                    : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Height</label>
          <div className="flex gap-3">
            <input
              type="number"
              value={feet}
              onChange={(e) => setFeet(e.target.value)}
              min="3"
              max="8"
              placeholder="Feet"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
            />
            <input
              type="number"
              value={inches}
              onChange={(e) => setInches(e.target.value)}
              min="0"
              max="11"
              placeholder="Inches"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
            />
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Weight (lbs)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="80"
            max="500"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
          />
        </div>

        {/* University */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">University</label>
          <input
            type="text"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="e.g. State University"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
          />
        </div>

        {/* Personal Drink Limit */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Personal Drink Goal (optional)</label>
          <input
            type="number"
            value={personalLimit}
            onChange={(e) => setPersonalLimit(e.target.value)}
            min="1"
            max="20"
            placeholder="Max drinks per night"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-buzz-primary text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Set your own limit regardless of calculated values
          </p>
        </div>

        {/* Calculated Limits Display */}
        {profile && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-medium mb-3">Your Calculated Limits</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-buzz-safe">Low</span>
                <span>{profile.calculated_low_limit} drinks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-buzz-primary">Medium</span>
                <span>{profile.calculated_med_limit} drinks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-buzz-danger">High</span>
                <span>{profile.calculated_high_limit} drinks</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Calibration: {profile.calibration_count}/3 sessions completed
            </p>
          </div>
        )}

        {/* Leaderboard Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
          <div>
            <p className="text-sm font-medium">Show on Leaderboard</p>
            <p className="text-xs text-gray-400">Visible on university rankings</p>
          </div>
          <button
            onClick={async () => {
              await updateProfile({ show_on_leaderboard: !profile?.show_on_leaderboard })
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              profile?.show_on_leaderboard ? 'bg-buzz-primary' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                profile?.show_on_leaderboard ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-buzz-primary text-gray-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full py-3 border border-gray-600 text-gray-400 rounded-lg hover:border-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </div>
  )
}
