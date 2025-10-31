"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isInitialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoggedOut, setIsLoggedOut] = useState(false)

  const ensureUserProfile = async (user: any) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        console.log('Profile already exists for user:', user.id)
        return
      }

      // Create profile if it doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        })

      if (insertError) {
        console.error('Error creating profile:', insertError)
      } else {
        console.log('Profile created for user:', user.id)
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error)
    }
  }

  useEffect(() => {
    let mounted = true

    // Check for existing valid session on page load
    const initializeAuth = async () => {
      console.log('🚀 Auth initialization - checking existing session')

      try {
        // Check if user explicitly logged out (don't restore session)
        const wasLoggedOut = localStorage.getItem('auth_logged_out') === 'true'

        if (wasLoggedOut) {
          console.log('🚪 User was logged out, not restoring session')
          // Clear the logout flag and don't restore session
          localStorage.removeItem('auth_logged_out')
          setSession(null)
          setUser(null)
          setCurrentUserId(null)
          setIsLoggedOut(true)
          setLoading(false)
          setIsInitialized(true)
          return
        }

        // Check if we have a valid session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (session?.user && !error) {
          console.log('🔑 Found existing valid session for user:', session.user.id)
          // Restore the session
          await ensureUserProfile(session.user)
          setSession(session)
          setUser(session.user)
          setCurrentUserId(session.user.id)
          setIsLoggedOut(false)
        } else {
          console.log('📭 No valid session found or session error:', error?.message)
          // No valid session, clear everything
          setSession(null)
          setUser(null)
          setCurrentUserId(null)
          setIsLoggedOut(true)
        }
      } catch (error) {
        console.error('❌ Error during auth initialization:', error)
        setSession(null)
        setUser(null)
        setCurrentUserId(null)
        setIsLoggedOut(true)
      }

      setLoading(false)
      setIsInitialized(true)
    }

    // Initialize auth state
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('🔄 Auth state changed:', event, session?.user?.id || 'no user')

      // Handle sign out - clear everything
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out - clearing session')
        setSession(null)
        setUser(null)
        setCurrentUserId(null)
        setIsLoggedOut(true)

        // Clear any remaining session data
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch (error) {
          console.error('Error clearing storage on signout:', error)
        }
        return
      }

      // Handle sign in - set session but don't persist
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 User signed in:', session.user.id)
        await ensureUserProfile(session.user)
        setSession(session)
        setUser(session.user)
        setCurrentUserId(session.user.id)
        setIsLoggedOut(false)
      }

      // Handle token refresh
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 Token refreshed')
        setSession(session)
        setUser(session.user)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (data.user && !error) {
      // Ensure profile exists for this user
      await ensureUserProfile(data.user)
    }

    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (data.user && !error) {
      // Ensure profile exists for this user
      await ensureUserProfile(data.user)
    }

    return { error }
  }

  const signOut = async () => {
    console.log('🚪 Auth Context: Starting sign out process...')

    try {
      // Step 1: Clear local state immediately
      setSession(null)
      setUser(null)
      setCurrentUserId(null)
      setIsLoggedOut(true)

      // Step 2: Call Supabase sign out
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('❌ Auth Context: Supabase sign out error:', error)
      } else {
        console.log('✅ Auth Context: Supabase sign out successful')
      }

      // Step 3: Comprehensive cleanup of all storage
      try {
        console.log('🧹 Clearing all storage...')

        // Clear Supabase auth data
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('last_user_id')
        localStorage.setItem('auth_logged_out', 'true')

        // Clear session storage
        sessionStorage.clear()

        // Clear any Supabase-related localStorage keys
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })

        console.log('✅ Storage cleared successfully')
      } catch (storageErr) {
        console.error('❌ Error clearing storage:', storageErr)
      }

      return { error }
    } catch (err) {
      console.error('💥 Auth Context: Sign out threw error:', err)
      // Force clear state even if signOut throws
      setSession(null)
      setUser(null)
      setCurrentUserId(null)
      setIsLoggedOut(true)
      return { error: err as any }
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
