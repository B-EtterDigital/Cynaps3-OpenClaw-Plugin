import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CynapsApiClient } from '../../src/core/api-client.js'
import { CynapsApiError } from '../../src/core/errors.js'
import { MOCK_CONFIG } from '../fixtures/mock-config.js'

/**
 * API Client tests — verify HTTP behavior, auth, retry, and error parsing.
 * Uses globalThis.fetch mocking to intercept all requests.
 */

const mockFetch = vi.fn()

describe('CynapsApiClient', () => {
  let client: CynapsApiClient

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })
    client = new CynapsApiClient(MOCK_CONFIG)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── Construction ─────────────────────────────────────────────

  describe('construction', () => {
    it('strips trailing slash from base URL', () => {
      const c = new CynapsApiClient({ ...MOCK_CONFIG, supabaseUrl: 'https://test.supabase.co/' })
      // We verify by calling rpc and checking the URL
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      c.rpc('test')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/agent-tools',
        expect.anything(),
      )
    })

    it('fromContext uses context agentId over config agentId', async () => {
      const c = CynapsApiClient.fromContext(
        { ...MOCK_CONFIG, agentId: 'config-agent' },
        { agentId: 'context-agent' },
      )
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await c.rpc('test')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['X-Agent-Id']).toBe('context-agent')
    })

    it('fromContext falls back to config agentId when context has none', async () => {
      const c = CynapsApiClient.fromContext(
        { ...MOCK_CONFIG, agentId: 'config-agent' },
        {},
      )
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await c.rpc('test')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['X-Agent-Id']).toBe('config-agent')
    })

    it('fromContext works without context parameter', async () => {
      const c = CynapsApiClient.fromContext(MOCK_CONFIG)
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await c.rpc('test')
      // Should not throw and should work normally
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  // ─── Headers ────────────────────────────────────────────────

  describe('headers', () => {
    it('includes apikey header', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await client.rpc('test')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.apikey).toBe(MOCK_CONFIG.supabaseAnonKey)
    })

    it('includes Authorization header with service role key', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await client.rpc('test')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBe(`Bearer ${MOCK_CONFIG.serviceRoleKey}`)
    })

    it('includes X-CLI-User-Id header', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await client.rpc('test')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['X-CLI-User-Id']).toBe(MOCK_CONFIG.userId)
    })

    it('includes X-Request-ID', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await client.rpc('test')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['X-Request-ID']).toBe('test-uuid')
    })

    it('includes Content-Type JSON', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await client.rpc('test')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  // ─── rpc() ──────────────────────────────────────────────────

  describe('rpc()', () => {
    it('calls agent-tools with method/params envelope', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ ready: true }))
      await client.rpc('preflight', { foo: 'bar' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/functions/v1/agent-tools',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ method: 'preflight', params: { foo: 'bar' } }),
        }),
      )
    })

    it('defaults params to empty object', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ ok: true }))
      await client.rpc('test-method')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual({ method: 'test-method', params: {} })
    })

    it('returns parsed JSON response', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ tracks: [1, 2, 3] }))
      const result = await client.rpc('search')
      expect(result).toEqual({ tracks: [1, 2, 3] })
    })
  })

  // ─── call() ─────────────────────────────────────────────────

  describe('call()', () => {
    it('calls specified edge function', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ lyrics: 'hello' }))
      await client.call('suno-proxy', { method: 'generateLyrics', params: {} })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/functions/v1/suno-proxy',
        expect.anything(),
      )
    })
  })

  // ─── query() ────────────────────────────────────────────────

  describe('query()', () => {
    it('builds correct URL with query params', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse([]))
      await client.query('sunoma_items', {
        'id': 'eq.trk-1',
        'select': 'id,title',
      })

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('/functions/v1/skill-api/sunoma_items')
      expect(calledUrl).toContain('id=eq.trk-1')
      expect(calledUrl).toContain('select=id%2Ctitle')
    })

    it('defaults to GET method', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse([]))
      await client.query('sunoma_items')
      expect(mockFetch.mock.calls[0][1].method).toBe('GET')
    })

    it('sets Prefer header for POST', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse([{ id: 'new' }]))
      await client.query('sunoma_items', undefined, {
        method: 'POST',
        body: { title: 'Test' },
      })
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.Prefer).toBe('return=representation')
    })
  })

  // ─── Error Handling ─────────────────────────────────────────

  describe('error handling', () => {
    it('throws CynapsApiError for 4xx responses (no retry)', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse(
        { error: 'Invalid input', code: 'VALIDATION_ERROR' },
        400,
      ))

      await expect(client.rpc('test')).rejects.toThrow(CynapsApiError)
      // 4xx should NOT retry — only 1 call
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('retries on 5xx errors', async () => {
      vi.useFakeTimers()
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ error: 'Internal error' }, 500))
        .mockResolvedValueOnce(mockJsonResponse({ error: 'Internal error' }, 500))
        .mockResolvedValueOnce(mockJsonResponse({ ok: true }))

      const promise = client.rpc('test')
      await vi.advanceTimersByTimeAsync(5_000)
      const result = await promise
      expect(result).toEqual({ ok: true })
      expect(mockFetch).toHaveBeenCalledTimes(3) // initial + 2 retries
      vi.useRealTimers()
    })

    it('throws after exhausting retries', async () => {
      vi.useFakeTimers()
      mockFetch
        .mockResolvedValue(mockJsonResponse({ error: 'Server down' }, 500))

      const promise = client.rpc('test')
      // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
      const assertion = expect(promise).rejects.toThrow(CynapsApiError)
      await vi.advanceTimersByTimeAsync(5_000)
      await assertion
      expect(mockFetch).toHaveBeenCalledTimes(3) // initial + 2 retries
      vi.useRealTimers()
    })

    it('parses error body with code and errorId', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse(
        { error: 'Bad request', code: 'BAD_INPUT', errorId: 'err-42' },
        400,
      ))

      try {
        await client.rpc('test')
      } catch (err) {
        expect(err).toBeInstanceOf(CynapsApiError)
        const apiErr = err as CynapsApiError
        expect(apiErr.message).toBe('Bad request')
        expect(apiErr.status).toBe(400)
        expect(apiErr.code).toBe('BAD_INPUT')
        expect(apiErr.errorId).toBe('err-42')
      }
    })

    it('handles non-JSON error response', async () => {
      vi.useFakeTimers()
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('not json')),
        headers: new Headers(),
      })

      // Will retry 5xx, so 3 calls total, then throw
      const promise = client.rpc('test')
      const assertion = expect(promise).rejects.toThrow(CynapsApiError)
      await vi.advanceTimersByTimeAsync(5_000)
      await assertion
      vi.useRealTimers()
    })

    it('throws CynapsApiError on query 4xx', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse(
        { error: 'Not found' },
        404,
      ))

      await expect(client.query('nonexistent')).rejects.toThrow(CynapsApiError)
    })
  })
})

// ─── Helpers ──────────────────────────────────────────────────

function mockJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  }
}
