import { useState } from 'react'
import {
  fakeMembers,
  MEMBER_ROLES,
  type Member,
  type MemberRole,
} from '../data/members'

function MemberManager() {
  const [members, setMembers] = useState<Member[]>(fakeMembers)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('Reader')

  const addMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setMembers([
      ...members,
      { id: `mem-${Date.now()}`, name: name.trim(), email: email.trim(), role, active: true },
    ])
    setName('')
    setEmail('')
    setRole('Reader')
  }

  const changeRole = (id: string, newRole: MemberRole) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, role: newRole } : m)))
  }

  const toggleActive = (id: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, active: !m.active } : m)))
  }

  const removeMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id))
  }

  return (
    <div className="members">
      <h2>Staff</h2>
      <p className="hint">
        Add members, change roles, deactivate (keeps their history) or delete
        (removes them entirely).
      </p>

      <form className="form member-form" onSubmit={addMember}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </label>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn">
          Add member
        </button>
      </form>

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
          {members.map((m) => (
            <tr key={m.id} className={m.active ? '' : 'member-inactive'}>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as MemberRole)}
                >
                  {MEMBER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <span className={`badge ${m.active ? 'badge-in-review' : 'badge-received'}`}>
                  {m.active ? 'Active' : 'Deactivated'}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => toggleActive(m.id)}
                >
                  {m.active ? 'Deactivate' : 'Reactivate'}
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => removeMember(m.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MemberManager