import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { predictHangover, getHangoverColor } from '../utils/hangover'
import { Clock, Wine, TrendingUp, Droplets } from 'lucide-react'

export default function SessionSummary() {
  const { sessionId } = useParams()
  const { profile } = useAuth()
  const [session, setSession] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: sessionData }, { data: logData }] = await Promise.all([
        supabase
          .from('drink_sessions')
          .select('*')
          .eq('id', sessionId)
          .single(),
        supabase
          .from('drink_logs')
          .select('*')
          .eq('session_id', sessionId)
          .order('logged_at', { ascending: true }),
      ])
      setSession(sessionData)
      setLogs(logData || [])
      setLoading(false)
    }
    load()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-buzz-primary" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="pb-20 px-4 pt-6 max-w-lg mx-auto text-center">
        <p className="text-gray-400">Session not found.</p>
        <Link to="/dashboard" className="text-buzz-primary mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const startTime = new Date(session.started_at)
  const endTime = session.ended_at ? new Date(session.ended_at) : new Date()
  const durationHours = (endTime - startTime) / 3600000
  const totalDrinks = session.total_standard_drinks || 0

  const breakdown = logs.reduce(
    (acc, log) => {
      acc[log.drink_type] = (acc[log.drink_type] || 0) + 1
      return acc
    },
    {}
  )

  const hangover = profile
    ? predictHangover(
        totalDrinks,
        profile.weight_lbs,
        profile.biological_gender,
        durationHours
      )
    : null

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Night Recap</h1>
      <p className="text-gray-400 text-sm mb-6">
        {startTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <Wine size={18} className="text-buzz-primary mb-2" />
          <p className="text-2xl font-bold">{totalDrinks}</p>
          <p className="text-xs text-gray-400">Total drinks</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <TrendingUp size={18} className="text-buzz-warning mb-2" />
          <p className="text-2xl font-bold">{(session.peak_bac || 0).toFixed(3)}</p>
          <p className="text-xs text-gray-400">Peak BAC</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <Clock size={18} className="text-buzz-primary mb-2" />
          <p className="text-2xl font-bold">{durationHours.toFixed(1)}h</p>
          <p className="text-xs text-gray-400">Duration</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <Droplets size={18} className="text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="text-xs text-gray-400">Drinks logged</p>
        </div>
      </div>

      {/* Drink Breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Breakdown</h2>
          <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
            {Object.entries(breakdown).map(([type, count]) => (
              <div key={type} className="px-4 py-3 flex justify-between">
                <span className="capitalize">{type}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hangover Prediction */}
      {hangover && (
        <div className="mb-6">
          <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">
            Morning Forecast
          </h2>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className={`font-medium capitalize mb-1 ${getHangoverColor(hangover.severity)}`}>
              {hangover.severity === 'none' ? 'Feeling Good' : `${hangover.severity} hangover`}
            </p>
            <p className="text-sm text-gray-300">{hangover.message}</p>
          </div>
        </div>
      )}

      {/* Responsible Message */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center mb-6">
        <p className="text-buzz-warning text-sm font-medium mb-1">Drink Responsibly</p>
        <p className="text-xs text-gray-400">
          Remember to hydrate, eat, and never drink and drive.
          If you need help, call SAMHSA at 1-800-662-4357.
        </p>
      </div>

      <Link
        to="/dashboard"
        className="block text-center w-full py-3 bg-buzz-primary text-gray-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
