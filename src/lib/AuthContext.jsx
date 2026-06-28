import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [appPublicSettings] = useState({ id: 'supabase', public_settings: {} })

  const buildUser = (supabaseUser) => ({
    id: supabaseUser.id,
    email: supabaseUser.email,
    role: supabaseUser.user_metadata?.role ?? 'user',
    full_name: supabaseUser.user_metadata?.full_name ?? '',
  })

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(buildUser(session.user))
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
      setIsLoadingAuth(false)
      setAuthChecked(true)
    })

    // Listen for auth state changes (login, logout, OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(buildUser(session.user))
        setIsAuthenticated(true)
        setAuthError(null)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      setIsLoadingAuth(false)
      setAuthChecked(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUserAuth = async () => {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (supabaseUser) {
      setUser(buildUser(supabaseUser))
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
    setIsLoadingAuth(false)
    setAuthChecked(true)
  }

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
    if (shouldRedirect) {
      window.location.href = '/sign-in'
    }
  }

  const navigateToLogin = () => {
    window.location.href = '/sign-in'
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
