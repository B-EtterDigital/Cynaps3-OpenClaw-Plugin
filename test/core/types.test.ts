import { describe, it, expect } from 'vitest'
import { isConfirmationResponse } from '../../src/core/types.js'
import { CONFIRMATION_RESPONSE } from '../fixtures/mock-responses.js'

describe('isConfirmationResponse', () => {
  it('returns true for valid confirmation response', () => {
    expect(isConfirmationResponse(CONFIRMATION_RESPONSE)).toBe(true)
  })

  it('returns true for minimal confirmation response', () => {
    expect(isConfirmationResponse({ confirmation_required: true })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isConfirmationResponse(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isConfirmationResponse(undefined)).toBe(false)
  })

  it('returns false for string', () => {
    expect(isConfirmationResponse('hello')).toBe(false)
  })

  it('returns false for number', () => {
    expect(isConfirmationResponse(42)).toBe(false)
  })

  it('returns false for object without confirmation_required', () => {
    expect(isConfirmationResponse({ ready: true })).toBe(false)
  })

  it('returns false when confirmation_required is false', () => {
    expect(isConfirmationResponse({ confirmation_required: false })).toBe(false)
  })

  it('returns false when confirmation_required is string "true"', () => {
    expect(isConfirmationResponse({ confirmation_required: 'true' })).toBe(false)
  })
})
