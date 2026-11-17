import { describe, expect, it } from 'vitest'
import {
  canManageMembers,
  isEditorRole,
  isPendingApproval,
  landingFor,
} from './roles'

describe('isEditorRole', () => {
  it('accepts every editor rank', () => {
    for (const role of [
      'staff_editor',
      'editor',
      'co_editor',
      'chief_editor',
      'advisor',
    ]) {
      expect(isEditorRole(role)).toBe(true)
    }
  })

  it('rejects readers and missing roles', () => {
    expect(isEditorRole('reader')).toBe(false)
    expect(isEditorRole('')).toBe(false)
    expect(isEditorRole(null)).toBe(false)
    expect(isEditorRole(undefined)).toBe(false)
  })
})

describe('canManageMembers', () => {
  it('is true only for the chief editor', () => {
    expect(canManageMembers('chief_editor')).toBe(true)
    expect(canManageMembers('co_editor')).toBe(false)
    expect(canManageMembers('editor')).toBe(false)
    expect(canManageMembers('reader')).toBe(false)
    expect(canManageMembers(null)).toBe(false)
  })
})

describe('landingFor', () => {
  it('sends editors to the full queue', () => {
    for (const role of [
      'staff_editor',
      'editor',
      'co_editor',
      'chief_editor',
      'advisor',
    ]) {
      expect(landingFor(role)).toBe('/editor')
    }
  })

  it('sends a reader to the blind queue, never the editor door', () => {
    expect(landingFor('reader')).toBe('/reader')
  })

  it('falls back to the reader queue when the role is unknown', () => {
    expect(landingFor(null)).toBe('/reader')
    expect(landingFor(undefined)).toBe('/reader')
  })
})

describe('isPendingApproval', () => {
  it('flags a reader who signed up and has not been activated', () => {
    expect(isPendingApproval({ active: false })).toBe(true)
  })

  it('lets an approved member through', () => {
    expect(isPendingApproval({ active: true })).toBe(false)
  })

  it('treats a row with no active flag as unapproved, not as approved', () => {
    // Fails closed: a query that forgot to select `active` must not open a queue
    // that holds unpublished work.
    expect(isPendingApproval({})).toBe(true)
    expect(isPendingApproval({ active: undefined })).toBe(true)
  })

  it('does not call a signed-out visitor pending', () => {
    // `member` is null before the lookup finishes and for a session with no
    // members row. Neither is this state — RequireAuth handles both separately.
    expect(isPendingApproval(null)).toBe(false)
    expect(isPendingApproval(undefined)).toBe(false)
  })
})
