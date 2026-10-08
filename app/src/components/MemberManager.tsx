import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import {
  MEMBER_ROLES,
  roleLabel,
  type Member,
  type MemberAuditEntry,
  type MemberRole,
} from '../data/members'

function describeAudit(entry: MemberAuditEntry, nameOf: (id: string | null) => string) {
  const actor = nameOf(entry.actor_id)
  const target = nameOf(entry.target_user_id)
  if (entry.action === 'role_change') {
    return `${actor} changed ${target} to ${roleLabel(entry.new_value ?? '')}`
  }
  if (entry.action === 'deactivate') return `${actor} deactivated ${target}`
  if (entry.action === 'reactivate') return `${actor} reactivated ${target}`
  return `${actor} updated ${target}`
}

function MemberManager() {
  const { member: currentMember } = useAuth()
  const isChief = currentMember?.role === 'chief_editor'

  const [members, setMembers] = useState<Member[]>([])
  const [audit, setAudit] = useState<MemberAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('members')
      .select('id, user_id, name, email, role, active')
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      setMembers([])
      setLoading(false)
      return
    }
    setMembers(data ?? [])

    const { data: log } = await supabase
      .from('member_audit')
      .select('id, actor_id, target_user_id, action, old_value, new_value, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setAudit(log ?? [])

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const nameOf = (userId: string | null) =>
    members.find((m) => m.user_id === userId)?.name ??
    (userId && userId === currentMember?.user_id ? currentMember?.name : null) ??
    'someone'

  const changeRole = async (target: Member, role: MemberRole) => {
    setSavingId(target.id)
    const previous = members
    setMembers(members.map((m) => (m.id === target.id ? { ...m, role } : m)))
    const { error } = await supabase
      .from('members')
      .update({ role })
      .eq('id', target.id)
    setSavingId(null)
    if (error) {
      setMembers(previous)
      setError(error.message)
      return
    }
    load()
  }

  const toggleActive = async (target: Member) => {
    setSavingId(target.id)
    const previous = members
    setMembers(
      members.map((m) => (m.id === target.id ? { ...m, active: !m.active } : m)),
    )
    const { error } = await supabase
      .from('members')
      .update({ active: !target.active })
      .eq('id', target.id)
    setSavingId(null)
    if (error) {
      setMembers(previous)
      setError(error.message)
      return
    }
    load()
  }

  if (!isChief) {
    return (
      <div className="members">
        <h2>Staff</h2>
        <p className="empty">
          Only the Chief Editor can manage staff.
        </p>
      </div>
    )
  }

  return (
    <div className="members">
      <h2>Staff</h2>
      <p className="hint">
        Change roles or deactivate members. Deactivating is a soft delete —
        their history is kept, but they lose access immediately.
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">Loading staff…</p>
      ) : (
        <table className="member-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.user_id === currentMember?.user_id
              const busy = savingId === m.id
              return (
                <tr key={m.id} className={m.active ? '' : 'member-inactive'}>
                  <td>
                    {m.name || '—'}
                    {isSelf && <span className="hint"> (you)</span>}
                  </td>
                  <td>{m.email}</td>
                  <td>
                    <select
                      value={m.role}
                      disabled={isSelf || busy}
                      onChange={(e) => changeRole(m, e.target.value as MemberRole)}
                    >
                      {MEMBER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span
                      className={`badge ${m.active ? 'badge-in-review' : 'badge-received'}`}
                    >
                      {m.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-small"
                      disabled={isSelf || busy}
                      onClick={() => toggleActive(m)}
                    >
                      {m.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <h3>Recent activity</h3>
      {audit.length === 0 ? (
        <p className="empty">No staff changes yet.</p>
      ) : (
        <ul className="audit-list">
          {audit.map((entry) => (
            <li key={entry.id}>
              {describeAudit(entry, nameOf)}{' '}
              <span className="hint">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MemberManager
