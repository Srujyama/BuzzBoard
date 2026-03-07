import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { calculateBACFromLogs, calculateBAC, DRINK_TYPES } from '../utils/bac'

export function useDrinkSession() {
  const { user, profile } = useAuth()
  const [activeSession, setActiveSession]       = useState(null)
  const [drinkLogs, setDrinkLogs]               = useState([])
  const [currentBAC, setCurrentBAC]             = useState(0)
  const [timeSinceLastDrink, setTimeSinceLastDrink] = useState(null) // seconds
  const [loading, setLoading]                   = useState(true)
  const timerRef = useRef(null)

  const totalDrinks = drinkLogs.reduce(
    (sum, log) => sum + (log.standard_drink_equivalent || 0),
    0
  )

  // ── BAC recalculation ───────────────────────────────────────────────────────
  // Uses per-drink superposition (each drink's logged_at timestamp) when logs
  // are available — much more accurate than a single session-start calculation.
  const recalculateBAC = useCallback(() => {
    if (!activeSession || !profile) return 0

    let bac
    if (drinkLogs.length > 0) {
      bac = calculateBACFromLogs(
        drinkLogs,
        profile.weight_lbs,
        profile.biological_gender,
        profile.height_inches || null,
        profile.age || null
      )
    } else {
      // Fallback: no logs yet, use session elapsed time
      const hoursElapsed = (Date.now() - new Date(activeSession.started_at).getTime()) / 3600000
      bac = calculateBAC(
        totalDrinks,
        profile.weight_lbs,
        profile.biological_gender,
        hoursElapsed,
        profile.height_inches || null,
        profile.age || null
      )
    }

    setCurrentBAC(bac)
    return bac
  }, [activeSession, drinkLogs, totalDrinks, profile])

  // ── Time-since-last-drink ticker (every second) ─────────────────────────────
  const updateTimeSinceLastDrink = useCallback(() => {
    if (drinkLogs.length === 0) {
      setTimeSinceLastDrink(null)
      return
    }
    const lastLog = drinkLogs[drinkLogs.length - 1]
    const secs = Math.floor((Date.now() - new Date(lastLog.logged_at).getTime()) / 1000)
    setTimeSinceLastDrink(secs)
  }, [drinkLogs])

  // ── Load active session on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return }
    async function load() {
      const { data: session } = await supabase
        .from('drink_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (session) {
        setActiveSession(session)
        const { data: logs } = await supabase
          .from('drink_logs')
          .select('*')
          .eq('session_id', session.id)
          .order('logged_at', { ascending: true })
        setDrinkLogs(logs || [])
      }
      setLoading(false)
    }
    load()
  }, [user])

  // ── BAC timer: recalculate every 30 seconds ──────────────────────────────────
  useEffect(() => {
    if (!activeSession) return
    recalculateBAC()
    const interval = setInterval(recalculateBAC, 30000)
    return () => clearInterval(interval)
  }, [activeSession, recalculateBAC])

  // ── Last-drink timer: tick every second ──────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return
    updateTimeSinceLastDrink()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(updateTimeSinceLastDrink, 1000)
    return () => clearInterval(timerRef.current)
  }, [activeSession, drinkLogs, updateTimeSinceLastDrink])

  // ── Session actions ───────────────────────────────────────────────────────────
  async function startSession() {
    const { data, error } = await supabase
      .from('drink_sessions')
      .insert({ user_id: user.id })
      .select()
      .single()
    if (data) {
      setActiveSession(data)
      setDrinkLogs([])
      setCurrentBAC(0)
      setTimeSinceLastDrink(null)
    }
    return { data, error }
  }

  async function logDrink(drinkType) {
    if (!activeSession) return { error: 'No active session' }
    const drinkInfo = DRINK_TYPES[drinkType]
    if (!drinkInfo) return { error: 'Invalid drink type' }

    const { data, error } = await supabase
      .from('drink_logs')
      .insert({
        session_id: activeSession.id,
        drink_type: drinkType,
        quantity: 1,
        standard_drink_equivalent: drinkInfo.standardDrinks,
      })
      .select()
      .single()

    if (data) {
      const newLogs = [...drinkLogs, data]
      setDrinkLogs(newLogs)

      // Recalculate using per-drink superposition with the new log included
      const newBAC = calculateBACFromLogs(
        newLogs,
        profile.weight_lbs,
        profile.biological_gender,
        profile.height_inches || null,
        profile.age || null
      )
      setCurrentBAC(newBAC)
      setTimeSinceLastDrink(0) // just logged — reset timer

      const newTotal = newLogs.reduce((s, l) => s + (l.standard_drink_equivalent || 0), 0)

      await supabase
        .from('drink_sessions')
        .update({
          total_standard_drinks: newTotal,
          peak_bac: Math.max(activeSession.peak_bac || 0, newBAC),
        })
        .eq('id', activeSession.id)

      setActiveSession((prev) => ({
        ...prev,
        total_standard_drinks: newTotal,
        peak_bac: Math.max(prev.peak_bac || 0, newBAC),
      }))
    }

    return { data, error }
  }

  async function endSession() {
    if (!activeSession) return { error: 'No active session' }
    const { data, error } = await supabase
      .from('drink_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString(), status: 'completed' })
      .eq('id', activeSession.id)
      .select()
      .single()

    const sessionId = activeSession.id
    if (!error) {
      setActiveSession(null)
      setDrinkLogs([])
      setCurrentBAC(0)
      setTimeSinceLastDrink(null)
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return { data, error, sessionId }
  }

  return {
    activeSession,
    drinkLogs,
    currentBAC,
    totalDrinks,
    timeSinceLastDrink,
    loading,
    startSession,
    logDrink,
    endSession,
  }
}
