import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { calculateLimits } from '../utils/bac'
import { LogOut, Save, Moon, Sun, User, Scale, GraduationCap, Target, BarChart3, Trophy } from 'lucide-react'
import UniversitySearch from '../components/UniversitySearch'
import toast from 'react-hot-toast'

function SectionCard({ icon: Icon, iconColor, iconBg, title, children }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function Profile() {
  const { profile, signOut, updateProfile } = useAuth()
  const { dark, toggle } = useTheme()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [gender, setGender] = useState(profile?.biological_gender || '')
  const [feet, setFeet] = useState(
    profile?.height_inches ? Math.floor(profile.height_inches / 12).toString() : ''
  )
  const [inchesVal, setInchesVal] = useState(
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
    const heightInches = parseInt(feet) * 12 + parseInt(inchesVal || 0)
    const weightLbs = parseInt(weight)

    // Only recalculate limits if we have valid body stats
    const hasValidStats = !isNaN(weightLbs) && weightLbs > 0 && gender
    const limits = hasValidStats ? calculateLimits(weightLbs, gender) : null

    const updates = {
      display_name: displayName,
      biological_gender: gender || null,
      height_inches: isNaN(heightInches) ? null : heightInches,
      weight_lbs: isNaN(weightLbs) ? null : weightLbs,
      university_name: university || null,
      personal_drink_limit: personalLimit ? parseInt(personalLimit) : null,
      ...(limits && {
        calculated_low_limit: limits.low,
        calculated_med_limit: limits.med,
        calculated_high_limit: limits.high,
      }),
    }

    const { error } = await updateProfile(updates)
    setSaving(false)
    if (error) toast.error('Failed to save: ' + (error.message || 'Unknown error'))
    else toast.success('Profile updated!')
  }

  const inputStyle = {
    width: '100%',
    padding: '0.7rem 0.875rem',
    backgroundColor: 'var(--bg-input)',
    border: '1.5px solid var(--border)',
    borderRadius: '0.75rem',
    color: 'var(--text)',
    outline: 'none',
    fontSize: '0.875rem',
  }

  const handleFocus = (e) => { e.target.style.borderColor = '#f5c842' }
  const handleBlur = (e) => { e.target.style.borderColor = 'var(--border)' }

  return (
    <div className="min-h-screen pb-36" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Profile</h1>
          <button
            onClick={toggle}
            className="p-2.5 rounded-xl border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="space-y-3">
          {/* Display Name */}
          <SectionCard icon={User} iconColor="#f5c842" iconBg="rgba(245,200,66,0.15)" title="Display Name">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Your name"
            />
          </SectionCard>

          {/* Body */}
          <SectionCard icon={Scale} iconColor="#3b82f6" iconBg="rgba(59,130,246,0.15)" title="Body Stats">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  Biological Gender
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['male', 'female'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className="py-2.5 rounded-xl border capitalize font-semibold text-sm"
                      style={
                        gender === g
                          ? { border: '1.5px solid #f5c842', background: 'rgba(245,200,66,0.12)', color: '#f5c842' }
                          : { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                      }
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  Height
                </label>
                <div className="flex gap-2">
                  <input
                    type="number" value={feet}
                    onChange={(e) => setFeet(e.target.value)}
                    min="3" max="8" placeholder="ft"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={handleFocus} onBlur={handleBlur}
                  />
                  <input
                    type="number" value={inchesVal}
                    onChange={(e) => setInchesVal(e.target.value)}
                    min="0" max="11" placeholder="in"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={handleFocus} onBlur={handleBlur}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  Weight (lbs)
                </label>
                <input
                  type="number" value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="80" max="500"
                  style={inputStyle}
                  onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>
            </div>
          </SectionCard>

          {/* University */}
          <SectionCard icon={GraduationCap} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.15)" title="University">
            <UniversitySearch
              value={university}
              onChange={setUniversity}
              inputStyle={inputStyle}
              placeholder="Search your university…"
            />
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Used for leaderboard grouping</p>
          </SectionCard>

          {/* Personal goal */}
          <SectionCard icon={Target} iconColor="#10b981" iconBg="rgba(16,185,129,0.15)" title="Personal Drink Goal">
            <input
              type="number" value={personalLimit}
              onChange={(e) => setPersonalLimit(e.target.value)}
              min="1" max="20"
              placeholder="Max drinks per night"
              style={inputStyle}
              onFocus={handleFocus} onBlur={handleBlur}
            />
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Optional — overrides calculated limits in the tracker
            </p>
          </SectionCard>

          {/* Calculated limits */}
          {profile && (
            <SectionCard icon={BarChart3} iconColor="#f97316" iconBg="rgba(249,115,22,0.15)" title="Your Calculated Limits">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'LOW', val: profile.calculated_low_limit, color: '#10b981' },
                  { label: 'MED', val: profile.calculated_med_limit, color: '#f5c842' },
                  { label: 'HIGH', val: profile.calculated_high_limit, color: '#ef4444' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="text-center">
                    <div className="py-3 rounded-xl font-black text-xl mb-1" style={{ background: `${color}15`, color }}>
                      {val || '—'}
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                Calibration: {profile.calibration_count}/3 sessions
              </p>
            </SectionCard>
          )}

          {/* Leaderboard toggle */}
          <SectionCard icon={Trophy} iconColor="#f5c842" iconBg="rgba(245,200,66,0.15)" title="Leaderboard">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Show on University Leaderboard</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your sessions will be visible in rankings</p>
              </div>
              <button
                onClick={async () => await updateProfile({ show_on_leaderboard: !profile?.show_on_leaderboard })}
                className="w-12 h-6 rounded-full transition-colors relative shrink-0 ml-4"
                style={{ backgroundColor: profile?.show_on_leaderboard ? '#f5c842' : 'var(--border)' }}
              >
                <div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                  style={{
                    transform: profile?.show_on_leaderboard ? 'translateX(24px)' : 'translateX(2px)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>
            </div>
          </SectionCard>

          {/* Danger zone */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#ef4444' }}>
              Account
            </p>
            <button
              onClick={signOut}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border"
              style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)' }}
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Sticky save button */}
      <div
        className="fixed bottom-20 left-0 right-0 flex justify-center px-4 z-40"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-2xl disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #f5c842, #f0a020)',
            color: '#0a0c14',
            boxShadow: '0 8px 28px rgba(245,200,66,0.4)',
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
