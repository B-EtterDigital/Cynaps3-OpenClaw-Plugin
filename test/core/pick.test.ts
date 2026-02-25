import { describe, it, expect } from 'vitest'
import { pick } from '../../src/core/pick.js'

describe('pick', () => {
  it('keeps only specified keys', () => {
    const input = { mood: 'calm', genre: 'ambient', evil: 'DROP TABLE' }
    expect(pick(input, ['mood', 'genre'])).toEqual({ mood: 'calm', genre: 'ambient' })
  })

  it('strips unknown fields (HIGH-2)', () => {
    const input = {
      mood: ['calm'],
      __proto_pollution__: true,
      sql_injection: 'DROP TABLE',
      constructor: 'attack',
    }
    expect(pick(input, ['mood'])).toEqual({ mood: ['calm'] })
  })

  it('omits keys not present in input', () => {
    const input = { mood: 'calm' }
    expect(pick(input, ['mood', 'genre', 'energy'])).toEqual({ mood: 'calm' })
  })

  it('omits keys with undefined values', () => {
    const input = { mood: 'calm', genre: undefined }
    expect(pick(input, ['mood', 'genre'])).toEqual({ mood: 'calm' })
  })

  it('preserves null values (distinct from undefined)', () => {
    const input = { mood: null, genre: 'rock' }
    expect(pick(input, ['mood', 'genre'])).toEqual({ mood: null, genre: 'rock' })
  })

  it('preserves array and object values', () => {
    const input = {
      tags: ['a', 'b'],
      nested: { id: '1' },
    }
    const result = pick(input, ['tags', 'nested'])
    expect(result).toEqual(input)
  })

  it('returns empty object when no keys match', () => {
    expect(pick({ a: 1 }, ['b', 'c'])).toEqual({})
  })

  it('returns empty object for empty input', () => {
    expect(pick({}, ['mood', 'genre'])).toEqual({})
  })
})
