import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface MemberRow {
  role: string
  name: string
}

interface AuthState {
  session: Session | null
  loading: boolean
  member: MemberRow | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const editorRoles = new Set([
  'staff_editor',
  'editor',
  'co_editor',
  'chief_editor',
  'advisor',
])

export function isEditorRole(role: string | null): boolean {
  return role ? editorRoles.has(role) : false
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
    const userId = session.user.id

    const loadMember = async () => {
      const { data } = await supabase
        .from('members')
        .select('role, name')
        .eq('user_id', userId)
        .maybeSingle()
      if (data) {
        setMember(data)
        return
      }

      const metadata = session.user.user_metadata ?? {}
      const name = (metadata.name as string | undefined) || session.user.email || ''
      const row = {
        user_id: userId,
        name,
        email: session.user.email ?? '',
        role: 'chief_editor',
      }

      const { data: created } = await supabase
        .from('members')
        .insert(row)
        .select('role, name')
        .maybeSingle()
      if (created) {
        setMember(created)
        return
      }

      const { data: fallback } = await supabase
        .from('members')
        .insert({ ...row, role: 'reader' })
        .select('role, name')
        .maybeSingle()
      if (fallback) setMember(fallback)
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