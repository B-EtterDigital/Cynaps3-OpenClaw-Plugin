/**
 * Strip unknown fields from an object, keeping only the specified keys.
 *
 * Every tool handler pipes LLM-provided params through this before
 * forwarding to the server. This is the PRIMARY defense against
 * prompt-injected extra fields (CCC HIGH-2).
 *
 * @example
 *   pick({ mood: ['calm'], __proto__: true, evil: 1 }, ['mood', 'genre'])
 *   // => { mood: ['calm'] }
 */
export function pick(obj: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}
