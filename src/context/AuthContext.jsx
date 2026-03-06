import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) await fetchProfile(session.user.id)
        else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) console.error('fetchProfile error:', error)
      setProfile(data ?? null)
    } catch (err) {
      console.error('fetchProfile unexpected error:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    return { data, error }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        )
        .select()
        .single()
      if (data) setProfile(data)
      return { data, error }
    } catch (err) {
      console.error('updateProfile error:', err)
      return { data: null, error: err }
    }
  }

  // needsOnboarding: user is authenticated but has no profile row OR hasn't completed onboarding
  const needsOnboarding = !loading && !!user && (!profile || !profile.onboarding_complete)

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile: () => user?.id ? fetchProfile(user.id) : null,
    needsOnboarding,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
