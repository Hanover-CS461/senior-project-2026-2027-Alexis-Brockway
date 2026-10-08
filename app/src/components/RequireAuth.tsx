import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isEditorRole, useAuth } from '../lib/auth'

interface RequireAuthProps {
  editor?: boolean
  children: ReactNode
}

export function RequireAuth({ editor, children }: RequireAuthProps) {
  const { session, loading, member } = useAuth()

  if (loading) {
    return <p className="page empty">Loading…</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (editor && !isEditorRole(member?.role ?? null)) {
    return (
      <p className="page empty">
        You need an editor role to view this page.
      </p>
    )
  }

  return <>{children}</>
}