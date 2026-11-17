import { Link, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { isEditorRole, isPendingApproval } from '../lib/roles'

interface RequireAuthProps {
  editor?: boolean
  children: ReactNode
}

export function RequireAuth({ editor, children }: RequireAuthProps) {
  const { session, loading, member, memberLoading } = useAuth()

  // Wait for the member row for every gated page, not just the editor ones:
  // `member` is null while the lookup is in flight, and the pending screen
  // below would otherwise flash for an approved reader on every load.
  if (loading || memberLoading) {
    return <p className="page empty">Loading…</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // A brand-new reader is signed in and legitimately has nothing to see. The
  // database already hides the work from them (is_active_member() checks
  // `active`); this is the explanation, not the gate. Without it the queue would
  // render empty and look broken.
  if (isPendingApproval(member)) {
    return (
      <div className="page empty">
        <h2>Your account is waiting for approval</h2>
        <p>
          New accounts start closed, because everything in this queue is
          unpublished work writers have not agreed to show anyone yet. An editor
          will activate yours from the staff list.
        </p>
        <p>
          There is nothing else to do here yet — you can close this page and
          come back once someone has approved you.
        </p>
        <p className="back-link">
          <Link to="/">Back to the homepage →</Link>
        </p>
      </div>
    )
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
