/**
 * Cynaps3 API Error
 *
 * Typed error for edge function responses. Carries the HTTP status code
 * and optional error code from the server's standardized error system.
 */
export class CynapsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly errorId?: string,
  ) {
    super(message)
    this.name = 'CynapsApiError'
  }

  /** True if this is a client error (4xx) */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  /** True if this is a server error (5xx) */
  get isServerError(): boolean {
    return this.status >= 500
  }

  /** True if the user needs to authenticate */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }

  /** True if rate limited */
  get isRateLimited(): boolean {
    return this.status === 429
  }

  /** User-safe message (never includes internal details) */
  get userMessage(): string {
    if (this.isAuthError) return 'Having trouble connecting — try again in a moment.'
    if (this.isRateLimited) return this.message
    if (this.isServerError) return 'Something went wrong on our end. Please try again.'
    return this.message
  }
}

/**
 * Wrap an unknown error into a CynapsApiError.
 * Ensures every error flowing through the plugin has a consistent shape.
 */
export function wrapError(err: unknown): CynapsApiError {
  if (err instanceof CynapsApiError) return err
  if (err instanceof Error) {
    return new CynapsApiError(err.message, 500, 'PLUGIN_ERROR')
  }
  return new CynapsApiError(String(err), 500, 'UNKNOWN_ERROR')
}
