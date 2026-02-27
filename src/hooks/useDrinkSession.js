import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { calculateBAC, DRINK_TYPES } from '../utils/bac'

export function useDrinkSession() {
  const { user, profile } = useAuth()
  const [activeSession, setActiveSession] = useState(null)
  const [drinkLogs, setDrinkLogs] = useState([])
  const [currentBAC, setCurrentBAC] = useState(0)
  const [loading, setLoading] = useState(true)

  const totalDrinks = drinkLogs.reduce(
    (sum, log) => sum + (log.standard_drink_equivalent || 0),
    0
  )

  const recalculateBAC = useCallback(() => {
    if (!activeSession || !profile) return 0
    const hoursElapsed =
      (Date.now() - new Date(activeSession.started_at).getTime()) / 3600000
    const bac = calculateBAC(
      totalDrinks,
      profile.weight_lbs,
      profile.biological_gender,
      hoursElapsed
    )
    setCurrentBAC(bac)
    return bac
  }, [activeSession, totalDrinks, profile])

  // Load active session on mount
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
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

  // Recalculate BAC every 30 seconds
  useEffect(() => {
    if (!activeSession) return
    recalculateBAC()
    const interval = setInterval(recalculateBAC, 30000)
    return () => clearInterval(interval)
  }, [activeSession, recalculateBAC])

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

      const newTotal = newLogs.reduce(
        (s, l) => s + (l.standard_drink_equivalent || 0),
        0
      )
      const hoursElapsed =
        (Date.now() - new Date(activeSession.started_at).getTime()) / 3600000
      const newBAC = calculateBAC(
        newTotal,
        profile.weight_lbs,
        profile.biological_gender,
        hoursElapsed
      )
      setCurrentBAC(newBAC)

      // Update session totals
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
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', activeSession.id)
      .select()
      .single()

    const sessionId = activeSession.id
    setActiveSession(null)
    setDrinkLogs([])
    setCurrentBAC(0)

    return { data, error, sessionId }
  }

  return {
    activeSession,
    drinkLogs,
    currentBAC,
    totalDrinks,
    loading,
    startSession,
    logDrink,
    endSession,
  }
}
