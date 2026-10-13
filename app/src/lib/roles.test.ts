import { describe, expect, it } from 'vitest'
import { canManageMembers, isEditorRole } from './roles'

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
