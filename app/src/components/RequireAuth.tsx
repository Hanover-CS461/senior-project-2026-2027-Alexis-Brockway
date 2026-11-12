import { Link, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { isEditorRole } from '../lib/roles'

interface RequireAuthProps {
  editor?: boolean
  children: ReactNode
}

export function RequireAuth({ editor, children }: RequireAuthProps) {
  const { session, loading, member, memberLoading } = useAuth()

  // Wait for the role as well as the session when the gate is a role gate:
  // `member` is null for a moment even for a Chief Editor, and rendering the
  // refusal during that moment is a lie the user reads as a broken account.
  if (loading || (editor && memberLoading)) {
    return <p className="page empty">Loading…</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (editor && !isEditorRole(member?.role ?? null)) {
    return (
      <div className="page empty">
        <p>You need an editor role to view this page.</p>
        <p className="back-link">
          <Link to="/reader">Go to your reader queue →</Link>
        </p>
      </div>
    )
  }

  return <>{children}</>
}
