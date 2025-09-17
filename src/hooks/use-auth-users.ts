import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AuthUser {
  id: string
  email?: string
  created_at: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

async function fetchAuthUsers(): Promise<AuthUser[]> {
  // Get current session for auth token
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/api/auth/users', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch auth users')
  }

  const data = await response.json()
  return data.users
}

export function useAuthUsers() {
  return useQuery({
    queryKey: ['auth-users'],
    queryFn: fetchAuthUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  })
}