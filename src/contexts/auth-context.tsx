'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface StaffMember {
  id: string
  name: string
  email: string
  phone_number?: string
  role?: string
  department?: string
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  staff: StaffMember | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to fetch staff information based on auth user ID
  const fetchStaffInfo = async (authUserId: string): Promise<StaffMember | null> => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.log('Error fetching staff record for user ID:', authUserId, error.message)
        return null
      }

      if (!data) {
        console.log('No staff record found for auth user ID:', authUserId)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching staff info:', error)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true

    // Get initial session and staff info
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        // Try to fetch staff info, but don't let it block the auth flow
        if (session?.user?.id) {
          try {
            const staffInfo = await Promise.race([
              fetchStaffInfo(session.user.id),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5 second timeout
            ])
            if (isMounted) {
              setStaff(staffInfo)
            }
          } catch (error) {
            console.error('Error fetching staff info:', error)
            if (isMounted) {
              setStaff(null)
            }
          }
        } else {
          setStaff(null)
        }

        if (isMounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)

        // Handle staff info for auth changes
        if (session?.user?.id) {
          try {
            const staffInfo = await Promise.race([
              fetchStaffInfo(session.user.id),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
            ])
            if (isMounted) {
              setStaff(staffInfo)
            }
          } catch (error) {
            console.error('Error fetching staff info on auth change:', error)
            if (isMounted) {
              setStaff(null)
            }
          }
        } else {
          setStaff(null)
        }

        if (isMounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      setLoading(false)
      throw error
    }
    // State will be updated by the auth state change listener
  }

  const value = {
    user,
    session,
    staff,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}