import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { joinClub, type MemberRow, type MembershipClient } from './membership'

interface AuthState {
  session: Session | null
  loading: boolean
  member: MemberRow | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const membershipClient: MembershipClient = {
  async findMember(userId) {
    const { data } = await supabase
      .from('members')
      .select('user_id, role, name')
      .eq('user_id', userId)
      .maybeSingle()
    return data
  },
  async insertMember(row) {
    const { data } = await supabase
      .from('members')
      .insert(row)
      .select('user_id, role, name')
      .maybeSingle()
    return data
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<MemberRow | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setMember(null)
      return
    }

    const user = session.user
    const loadMember = async () => {
      const row = await joinClub(
        {
          id: user.id,
          email: user.email,
          name: (user.user_metadata?.name as string | undefined) ?? null,
        },
        membershipClient,
      )
      setMember(row)
    }

    loadMember()
  }, [session])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, member, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
