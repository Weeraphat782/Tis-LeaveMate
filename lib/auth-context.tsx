"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user ? 'USER_LOGGED_IN' : 'USER_LOGGED_OUT')
      console.log('Previous user ID:', currentUserId, 'New user ID:', session?.user?.id)

      // Detect user change and force page refresh if different user
      if (session?.user?.id !== currentUserId && currentUserId !== null) {
        console.log('🔄 USER CHANGE DETECTED - Force refreshing page for new user session')

        // Clear all cached data before refresh
        try {
          localStorage.clear()
          sessionStorage.clear()
          // Clear any Supabase cached data
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('supabase'))
            keys.forEach(key => localStorage.removeItem(key))
          }
        } catch (error) {
          console.error('Error clearing storage:', error)
        }

        // Force page refresh to clear all cached state
        window.location.reload()
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      setCurrentUserId(session?.user?.id ?? null)
      setLoading(false)

      // Ensure profile exists when user signs in
      if (session?.user) {
        await ensureUserProfile(session.user)
      }
    })

    return () => subscription.unsubscribe()
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
    console.log('Auth Context: Signing out...')
    try {
      // Force clear local state first
      setSession(null)
      setUser(null)

      const { error } = await supabase.auth.signOut()

      if (!error) {
        console.log('Auth Context: Sign out successful')
      } else {
        console.error('Auth Context: Sign out error:', error)
      }

      // Additional cleanup - clear any persisted auth data
      try {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
      } catch (storageErr) {
        console.error('Auth Context: Error clearing storage:', storageErr)
      }

      return { error }
    } catch (err) {
      console.error('Auth Context: Sign out threw error:', err)
      // Force clear state even if signOut throws
      setSession(null)
      setUser(null)
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
