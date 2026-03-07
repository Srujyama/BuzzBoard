import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDrinkSession } from '../hooks/useDrinkSession'
import { DRINK_TYPES } from '../utils/bac'
import BACMeter from '../components/BACMeter'
import AlertBanner from '../components/AlertBanner'
import toast from 'react-hot-toast'
import { Wine, Beer, GlassWater, Play, Clock, Shield, Droplets, Car, X } from 'lucide-react'
import { sendBACWarningNotification } from '../utils/pushNotifications'

const tips = [
  'Alternate alcoholic drinks with water.',
  'Eat before and during drinking.',
  'Know your limits and stick to them.',
  'Never leave your drink unattended.',
  'Plan your ride home before you go out.',
  "It's always okay to say no to another drink.",
]

const drinkStyles = {
  shot: {
    gradient: 'linear-gradient(135deg, #f5c842 0%, #e8a020 100%)',
    glow: 'rgba(245,200,66,0.35)',
    icon: Wine,
    textColor: '#0a0c14',
    logColor: '#f5c842',
    borderColor: 'rgba(245,200,66,0.4)',
  },
  beer: {
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea6020 100%)',
    glow: 'rgba(249,115,22,0.35)',
    icon: Beer,
    textColor: '#ffffff',
    logColor: '#f97316',
    borderColor: 'rgba(249,115,22,0.4)',
  },
  wine: {
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    glow: 'rgba(168,85,247,0.35)',
    icon: Wine,
    textColor: '#ffffff',
    logColor: '#a855f7',
    borderColor: 'rgba(168,85,247,0.4)',
  },
  mixed: {
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    glow: 'rgba(59,130,246,0.35)',
    icon: GlassWater,
    textColor: '#ffffff',
    logColor: '#3b82f6',
    borderColor: 'rgba(59,130,246,0.4)',
  },
}

export default function DrinkTracker() {
  const { profile } = useAuth()
  const {
    activeSession,
    drinkLogs,
    currentBAC,
    totalDrinks,
    timeSinceLastDrink,
    loading,
    startSession,
    logDrink,
    endSession,
  } = useDrinkSession()
  const navigate = useNavigate()
  const ending = useRef(false)
  const [starting, setStarting] = useState(false)
  const [waterCount, setWaterCount] = useState(0)
  const [showSafeRide, setShowSafeRide] = useState(false)
  const lastReminderRef = useRef(Date.now())

  // Hydration reminder: every 2 drinks or every 45 min remind to drink water
  const drinkCountRef = useRef(0)
  useEffect(() => {
    if (!activeSession) return
    if (drinkLogs.length > 0 && drinkLogs.length > drinkCountRef.current && drinkLogs.length % 2 === 0) {
      drinkCountRef.current = drinkLogs.length
      const now = Date.now()
      if (now - lastReminderRef.current > 5 * 60 * 1000) { // throttle 5 min
        lastReminderRef.current = now
        toast('💧 Drink some water!', {
          duration: 4000,
          style: {
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: 'var(--text)',
          },
        })
      }
    }
  }, [drinkLogs, activeSession])

  // Show safe ride banner when BAC >= 0.05
  const bacWarnedRef = useRef(false)
  useEffect(() => {
    if (currentBAC >= 0.05) setShowSafeRide(true)
    if (currentBAC >= 0.08 && !bacWarnedRef.current) {
      bacWarnedRef.current = true
      sendBACWarningNotification(currentBAC)
    }
    if (currentBAC < 0.07) bacWarnedRef.current = false
  }, [currentBAC])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: '#f5c842', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── No active session → show "Start Night" screen ─────────────────────────
  if (!activeSession && !ending.current) {
    const now = new Date()
    const hour = now.getHours()
    // Show a "night" hint if it's between 6PM (18) and 6AM (6)
    const isNightTime = hour >= 18 || hour < 6
    const limits = {
      low: profile?.calculated_low_limit || '—',
      med: profile?.calculated_med_limit || '—',
      high: profile?.calculated_high_limit || '—',
    }

    async function handleStart() {
      setStarting(true)
      const { error } = await startSession()
      setStarting(false)
      if (error) toast.error('Could not start session')
    }

    return (
      <div className="min-h-screen pb-28 flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-4 pt-10 w-full flex-1 flex flex-col">

          {/* Hero */}
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, #f5c842, #f0a020)', boxShadow: '0 12px 40px rgba(245,200,66,0.4)' }}
            >
              <Wine size={36} color="#0a0c14" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>
              {isNightTime ? 'Ready for tonight?' : 'Start tracking'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {isNightTime
                ? 'Log every drink to track your BAC in real time.'
                : 'Tap Start Night whenever you begin drinking.'}
            </p>
          </div>

          {/* Your limits preview */}
          <div
            className="rounded-2xl border p-5 mb-5"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Tonight's Limits
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'LOW', val: limits.low, color: '#10b981', desc: 'Feeling it' },
                { label: 'MED', val: limits.med, color: '#f5c842', desc: 'Buzzed' },
                { label: 'HIGH', val: limits.high, color: '#ef4444', desc: 'Legal limit' },
              ].map(({ label, val, color, desc }) => (
                <div key={label} className="text-center">
                  <div
                    className="w-full py-3 rounded-xl mb-1 font-black text-2xl"
                    style={{ background: `${color}15`, color }}
                  >
                    {val}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{desc}</p>
                </div>
              ))}
            </div>
            {profile?.personal_drink_limit && (
              <div
                className="mt-4 pt-4 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Personal goal</span>
                <span className="text-sm font-black" style={{ color: '#f5c842' }}>
                  {profile.personal_drink_limit} drinks
                </span>
              </div>
            )}
          </div>

          {/* Info pills */}
          <div className="flex gap-2 mb-8">
            {[
              { icon: Clock, text: 'Live BAC tracking' },
              { icon: Shield, text: 'Research-backed limits' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <Icon size={13} style={{ color: '#f5c842', flexShrink: 0 }} />
                {text}
              </div>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #f5c842 0%, #f0a020 100%)',
              color: '#0a0c14',
              boxShadow: '0 8px 32px rgba(245,200,66,0.45)',
            }}
          >
            <Play size={20} fill="#0a0c14" />
            {starting ? 'Starting…' : 'Start Night'}
          </button>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            🛡️ Never drink and drive
          </p>
        </div>
      </div>
    )
  }

  const limits = {
    low: profile?.calculated_low_limit || 0,
    med: profile?.calculated_med_limit || 0,
    high: profile?.calculated_high_limit || 0,
  }

  const personalLimit = profile?.personal_drink_limit
  const effectiveLimit = personalLimit || limits.high
  const progress = effectiveLimit > 0 ? Math.min(totalDrinks / effectiveLimit, 1) : 0
  const progressColor = progress >= 1 ? '#ef4444' : progress >= 0.7 ? '#f97316' : '#10b981'
  const tip = tips[Math.floor(Date.now() / 60000) % tips.length]

  async function handleLogDrink(type) {
    const { error } = await logDrink(type)
    if (error) {
      toast.error('Failed to log drink')
    } else {
      toast.success(`+1 ${DRINK_TYPES[type].label}`, { icon: '🥃' })
    }
  }

  async function handleEndNight() {
    ending.current = true
    const { sessionId, error } = await endSession()
    if (error) {
      ending.current = false
      toast.error('Failed to end session')
    } else {
      if (profile.calibration_count < 3) {
        navigate(`/calibration?session=${sessionId}`)
      } else {
        navigate(`/session/${sessionId}`)
      }
    }
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Tonight's Session</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Started {new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* BAC Meter hero card */}
        <div
          className="rounded-3xl border mb-4 pt-6 pb-4 px-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <BACMeter bac={currentBAC} />

          {/* Progress bar inside hero card */}
          <div className="mt-4 px-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-bold" style={{ color: 'var(--text)' }}>
                {totalDrinks} drink{totalDrinks !== 1 ? 's' : ''}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {personalLimit ? `Goal: ${personalLimit}` : `Limit: ${effectiveLimit}`}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: progressColor,
                  boxShadow: `0 0 8px ${progressColor}80`,
                  transition: 'width 0.5s ease, background-color 0.5s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        <div className="mb-4">
          <AlertBanner totalDrinks={totalDrinks} limits={limits} bac={currentBAC} />
        </div>

        {/* Safe Ride Banner */}
        {showSafeRide && (
          <div
            className="rounded-2xl border p-4 mb-4 flex items-start gap-3"
            style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}
          >
            <Car size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm mb-1" style={{ color: '#ef4444' }}>Plan your safe ride home</p>
              <div className="flex gap-2 flex-wrap">
                <a
                  href="https://uber.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#000', color: '#fff' }}
                >
                  Open Uber
                </a>
                <a
                  href="https://lyft.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#ff00bf', color: '#fff' }}
                >
                  Open Lyft
                </a>
              </div>
            </div>
            <button onClick={() => setShowSafeRide(false)} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Time Since Last Drink */}
        {timeSinceLastDrink !== null && (
          <div
            className="rounded-2xl border p-3 mb-4 flex items-center gap-3"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,200,66,0.12)' }}
            >
              <Clock size={16} style={{ color: '#f5c842' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Time since last drink
              </p>
              <p className="font-black text-lg leading-tight" style={{ color: 'var(--text)' }}>
                {timeSinceLastDrink < 3600
                  ? `${Math.floor(timeSinceLastDrink / 60)}m ${timeSinceLastDrink % 60}s`
                  : `${Math.floor(timeSinceLastDrink / 3600)}h ${Math.floor((timeSinceLastDrink % 3600) / 60)}m`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {timeSinceLastDrink < 1800 ? '🟡 Recent' : timeSinceLastDrink < 3600 ? '🟢 Pacing well' : '✅ Long gap'}
              </p>
            </div>
          </div>
        )}

        {/* Drink Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {Object.entries(DRINK_TYPES).map(([type, info]) => {
            const style = drinkStyles[type] || drinkStyles.shot
            const Icon = style.icon
            return (
              <button
                key={type}
                onClick={() => handleLogDrink(type)}
                className="relative rounded-2xl p-4 text-left overflow-hidden"
                style={{
                  background: style.gradient,
                  boxShadow: `0 6px 20px ${style.glow}`,
                  minHeight: '110px',
                }}
              >
                {/* Decorative bg circle */}
                <div
                  className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                />
                <div className="relative z-10 flex flex-col gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <Icon size={20} color={style.textColor} />
                  </div>
                  <p className="font-black text-base" style={{ color: style.textColor }}>
                    {info.label}
                  </p>
                  <p className="text-xs font-semibold leading-snug" style={{ color: style.textColor, opacity: 0.8 }}>
                    {info.abvLabel}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Water Log */}
        <div
          className="rounded-2xl border p-4 mb-5 flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Droplets size={16} style={{ color: '#3b82f6' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Water intake</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {waterCount === 0 ? 'Stay hydrated!' : `${waterCount} glass${waterCount !== 1 ? 'es' : ''} logged`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {waterCount > 0 && (
              <button
                onClick={() => setWaterCount((c) => Math.max(0, c - 1))}
                className="w-8 h-8 rounded-xl border font-black text-base flex items-center justify-center"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                −
              </button>
            )}
            <span className="font-black text-lg w-5 text-center" style={{ color: waterCount > 0 ? '#3b82f6' : 'var(--text-muted)' }}>
              {waterCount}
            </span>
            <button
              onClick={() => {
                setWaterCount((c) => c + 1)
                toast('💧 Water logged!', { duration: 1500 })
              }}
              className="w-8 h-8 rounded-xl font-black text-base flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
            >
              +
            </button>
          </div>
        </div>

        {/* Drink Log */}
        {drinkLogs.length > 0 && (
          <div
            className="rounded-2xl border mb-5 overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Tonight's Log
              </h3>
            </div>
            <div className="divide-y max-h-44 overflow-y-auto" style={{ '--tw-divide-opacity': 1 }}>
              {[...drinkLogs].reverse().map((log) => {
                const s = drinkStyles[log.drink_type] || drinkStyles.shot
                return (
                  <div
                    key={log.id}
                    className="px-4 py-2.5 flex justify-between items-center text-sm"
                    style={{ borderColor: 'var(--border)', borderTopWidth: '1px' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.logColor }}
                      />
                      <span className="capitalize font-semibold" style={{ color: 'var(--text)' }}>
                        {log.drink_type}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* End Night */}
        <button
          onClick={handleEndNight}
          className="w-full py-4 rounded-2xl font-bold text-sm mb-4 border-2"
          style={{
            borderColor: currentBAC >= 0.06 ? 'rgba(239,68,68,0.5)' : 'var(--border)',
            color: currentBAC >= 0.06 ? '#ef4444' : 'var(--text-muted)',
            backgroundColor: currentBAC >= 0.06 ? 'rgba(239,68,68,0.05)' : 'transparent',
          }}
        >
          End Night
        </button>

        <p className="text-xs text-center italic pb-2" style={{ color: 'var(--text-muted)' }}>
          💡 {tip}
        </p>
      </div>
    </div>
  )
}
