import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { joinClub, type MemberRow, type MembershipClient } from './membership'

interface AuthState {
  session: Session | null
  loading: boolean
  member: MemberRow | null
  /**
   * True while the member row is still being looked up. `member` is null both
   * before that lookup finishes and for a session with no members row at all,
   * so anything that routes on the role must wait for this to be false —
   * otherwise an editor is briefly indistinguishable from a reader.
   */
  memberLoading: boolean
  /**
   * True when the page was opened from a password-reset email. supabase-js
   * trades the #access_token fragment for a session and then fires
   * PASSWORD_RECOVERY; the router uses this to send the person to the reset
   * form instead of the home page. Cleared once the new password is saved.
   */
  recovery: boolean
  acknowledgeRecovery: () => void
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
  const [memberResolved, setMemberResolved] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setMember(null)
      setMemberResolved(false)
      return
    }

    const user = session.user
    let cancelled = false
    setMemberResolved(false)

    joinClub(
      {
        id: user.id,
        email: user.email,
        name: (user.user_metadata?.name as string | undefined) ?? null,
      },
      membershipClient,
    )
      .then((row) => {
        if (!cancelled) setMember(row)
      })
      .catch(() => {
        // A failed lookup leaves the role unknown; landingFor() then treats
        // them as a reader, which is the safe direction (no author identity).
        if (!cancelled) setMember(null)
      })
      .finally(() => {
        if (!cancelled) setMemberResolved(true)
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const memberLoading = session != null && !memberResolved

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const acknowledgeRecovery = () => setRecovery(false)

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        member,
        memberLoading,
        recovery,
        acknowledgeRecovery,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
