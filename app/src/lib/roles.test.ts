import { describe, expect, it } from 'vitest'
import { canManageMembers, isEditorRole, landingFor } from './roles'

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
