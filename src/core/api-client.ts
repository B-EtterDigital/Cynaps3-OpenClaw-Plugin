/**
 * Cynaps3 API Client
 *
 * Authenticated HTTP client for Supabase edge functions.
 * Handles token injection, error wrapping, timeout, and retry.
 *
 * Design principle: this is a THIN CLIENT. All security enforcement
 * (auth, tier limits, rate limits, ownership) lives in the edge functions.
 * This client just makes the calls pleasant.
 */

import type { CynapsConfig, ApiErrorBody } from './types.js'
import { CynapsApiError } from './errors.js'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1_000

export class CynapsApiClient {
  private readonly baseUrl: string
  private readonly anonKey: string
  private readonly serviceRoleKey: string
  private readonly userId: string
  private readonly agentId: string | undefined

  constructor(config: CynapsConfig) {
    this.baseUrl = config.supabaseUrl.replace(/\/$/, '')
    this.anonKey = config.supabaseAnonKey
    this.serviceRoleKey = config.serviceRoleKey
    this.userId = config.userId
    this.agentId = config.agentId
  }

  /**
   * Create a client with agent identity from the OpenClaw tool context.
   * Context agentId (runtime) takes priority over config agentId (static).
   */
  static fromContext(config: CynapsConfig, ctx?: { agentId?: string }): CynapsApiClient {
    const effective = ctx?.agentId ? { ...config, agentId: ctx.agentId } : config
    return new CynapsApiClient(effective)
  }

  /**
   * Call an edge function (RPC-style for agent-tools, raw for others).
   *
   * @param functionName - Edge function name (e.g., 'agent-tools', 'suno-proxy')
   * @param body - Request body
   * @param options - Method override, timeout, retry control
   */
  async call<T = unknown>(
    functionName: string,
    body: Record<string, unknown>,
    options?: {
      method?: string
      timeout?: number
      retries?: number
    },
  ): Promise<T> {
    const url = `${this.baseUrl}/functions/v1/${functionName}`
    const method = options?.method ?? 'POST'
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS
    const maxRetries = options?.retries ?? MAX_RETRIES

    const headers = this.buildHeaders()

    let lastError: CynapsApiError | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: method !== 'GET' ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(timeout),
        })

        if (response.ok) {
          return (await response.json()) as T
        }

        // Parse error body
        const errorBody = await response.json().catch(
          () => ({ error: `HTTP ${response.status}` }),
        ) as ApiErrorBody

        const apiError = new CynapsApiError(
          errorBody.error || `HTTP ${response.status}`,
          response.status,
          errorBody.code,
          errorBody.errorId,
        )

        // Don't retry client errors (4xx) — they won't change
        if (apiError.isClientError) throw apiError

        // Retry server errors (5xx) and rate limits (429)
        lastError = apiError
        if (attempt < maxRetries) {
          const delay = apiError.isRateLimited
            ? parseRetryAfter(response) * 1_000
            : RETRY_DELAY_MS * Math.pow(2, attempt)
          await sleep(delay)
          continue
        }
      } catch (err) {
        if (err instanceof CynapsApiError) throw err

        // Timeout or network error
        const message = err instanceof Error ? err.message : String(err)
        lastError = new CynapsApiError(
          message.includes('timeout') ? `Request timed out after ${timeout}ms` : message,
          0,
          'NETWORK_ERROR',
        )

        if (attempt < maxRetries) {
          await sleep(RETRY_DELAY_MS * Math.pow(2, attempt))
          continue
        }
      }
    }

    throw lastError ?? new CynapsApiError('Request failed after retries', 500)
  }

  /**
   * Call agent-tools RPC endpoint.
   * Convenience wrapper that builds the { method, params } envelope.
   */
  async rpc<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    options?: { timeout?: number },
  ): Promise<T> {
    return this.call<T>('agent-tools', { method, params }, options)
  }

  /**
   * Query skill-api (PostgREST proxy).
   *
   * @param table - Table name from the whitelist
   * @param params - PostgREST query parameters
   * @param options - Method and body for write operations
   *
   * SECURITY NOTE (MED-3): PostgREST filter values (e.g., `eq.${trackId}`)
   * are safe against injection because URL.searchParams.set() handles
   * percent-encoding. A value like "abc;owner_id=eq.attacker" becomes
   * "abc%3Bowner_id%3Deq.attacker" which PostgREST treats as a literal.
   * Do NOT refactor this to use string concatenation for URL construction.
   */
  async query<T = unknown>(
    table: string,
    params?: Record<string, string>,
    options?: { method?: string; body?: Record<string, unknown> },
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/functions/v1/skill-api/${table}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v)
      }
    }

    const method = options?.method ?? 'GET'
    const headers = this.buildHeaders()

    if (method === 'POST' || method === 'PATCH') {
      headers['Prefer'] = 'return=representation'
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(
        () => ({ error: `HTTP ${response.status}` }),
      ) as ApiErrorBody
      throw new CynapsApiError(
        errorBody.error || `HTTP ${response.status}`,
        response.status,
        errorBody.code,
      )
    }

    // DELETE returns 204 No Content — no body to parse
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return ([] as unknown) as T
    }

    return (await response.json()) as T
  }

  // ─── Private ────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.anonKey,
      'Authorization': `Bearer ${this.serviceRoleKey}`,
      'X-CLI-User-Id': this.userId,
      'X-Request-ID': crypto.randomUUID(),
    }
    // Send agent identity so the server can attribute actions to
    // specific agents/sub-agents instead of generic 'openclaw'.
    // Read env at request time (not config time) so sub-agents with
    // per-process env vars get their own identity.
    const agentId = this.agentId
      || process.env.OPENCLAW_AGENT_ID
      || process.env.CYNAPS3_AGENT_ID
    if (agentId) {
      headers['X-Agent-Id'] = agentId
    }
    return headers
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfter(response: Response): number {
  const header = response.headers.get('Retry-After')
  if (!header) return 5
  const seconds = parseInt(header, 10)
  return Number.isFinite(seconds) ? Math.min(seconds, 60) : 5
}
