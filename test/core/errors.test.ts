import { describe, it, expect } from 'vitest'
import { CynapsApiError, wrapError } from '../../src/core/errors.js'

describe('CynapsApiError', () => {
  it('sets name to CynapsApiError', () => {
    const err = new CynapsApiError('test', 400)
    expect(err.name).toBe('CynapsApiError')
  })

  it('carries status, code, and errorId', () => {
    const err = new CynapsApiError('test', 422, 'VALIDATION_ERROR', 'err-123')
    expect(err.status).toBe(422)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.errorId).toBe('err-123')
  })

  describe('error classification', () => {
    it('detects client errors (4xx)', () => {
      expect(new CynapsApiError('', 400).isClientError).toBe(true)
      expect(new CynapsApiError('', 404).isClientError).toBe(true)
      expect(new CynapsApiError('', 499).isClientError).toBe(true)
      expect(new CynapsApiError('', 500).isClientError).toBe(false)
    })

    it('detects server errors (5xx)', () => {
      expect(new CynapsApiError('', 500).isServerError).toBe(true)
      expect(new CynapsApiError('', 503).isServerError).toBe(true)
      expect(new CynapsApiError('', 400).isServerError).toBe(false)
    })

    it('detects auth errors (401/403)', () => {
      expect(new CynapsApiError('', 401).isAuthError).toBe(true)
      expect(new CynapsApiError('', 403).isAuthError).toBe(true)
      expect(new CynapsApiError('', 400).isAuthError).toBe(false)
    })

    it('detects rate limits (429)', () => {
      expect(new CynapsApiError('', 429).isRateLimited).toBe(true)
      expect(new CynapsApiError('', 400).isRateLimited).toBe(false)
    })
  })

  describe('userMessage', () => {
    it('returns safe message for auth errors', () => {
      const err = new CynapsApiError('JWT expired blah internal', 401)
      expect(err.userMessage).toBe('Having trouble connecting — try again in a moment.')
    })

    it('returns safe message for server errors', () => {
      const err = new CynapsApiError('Deno panic at line 42', 500)
      expect(err.userMessage).toBe('Something went wrong on our end. Please try again.')
    })

    it('returns original message for rate limits', () => {
      const err = new CynapsApiError('Rate limit exceeded', 429)
      expect(err.userMessage).toBe('Rate limit exceeded')
    })

    it('returns original message for client errors', () => {
      const err = new CynapsApiError('Invalid track_id', 400)
      expect(err.userMessage).toBe('Invalid track_id')
    })
  })
})

describe('wrapError', () => {
  it('passes through CynapsApiError unchanged', () => {
    const original = new CynapsApiError('test', 400, 'TEST')
    const wrapped = wrapError(original)
    expect(wrapped).toBe(original)
  })

  it('wraps Error into CynapsApiError', () => {
    const wrapped = wrapError(new Error('something broke'))
    expect(wrapped).toBeInstanceOf(CynapsApiError)
    expect(wrapped.message).toBe('something broke')
    expect(wrapped.status).toBe(500)
    expect(wrapped.code).toBe('PLUGIN_ERROR')
  })

  it('wraps string into CynapsApiError', () => {
    const wrapped = wrapError('oops')
    expect(wrapped).toBeInstanceOf(CynapsApiError)
    expect(wrapped.message).toBe('oops')
    expect(wrapped.code).toBe('UNKNOWN_ERROR')
  })

  it('wraps null/undefined into CynapsApiError', () => {
    const wrapped = wrapError(null)
    expect(wrapped).toBeInstanceOf(CynapsApiError)
    expect(wrapped.message).toBe('null')
  })
})
