/**
 * Plugin Configuration — reads and validates config from OpenClaw's
 * plugin system, applying sensible defaults.
 *
 * Resolves values from pluginConfig first, then falls back to env vars.
 */

import type { CynapsConfig, CynapsModule } from './types.js'

const VALID_MODULES = new Set<CynapsModule>([
  'musicmation', 'storymation', 'skillmation', 'contentmation',
])

/**
 * Parse plugin config into a validated CynapsConfig.
 * Accepts pluginConfig from OpenClaw (or undefined) and falls back to env vars.
 */
export function parseConfig(pluginConfig?: Record<string, unknown>): CynapsConfig {
  const supabaseUrl = getString(pluginConfig, 'supabaseUrl') || process.env.CYNAPS3_SUPABASE_URL
  const supabaseAnonKey = getString(pluginConfig, 'supabaseAnonKey') || process.env.CYNAPS3_ANON_KEY
  const serviceRoleKey = getString(pluginConfig, 'serviceRoleKey') || process.env.CYNAPS3_SERVICE_ROLE_KEY
  const userId = getString(pluginConfig, 'userId') || process.env.CYNAPS3_USER_ID
  const contentDomain = getString(pluginConfig, 'contentDomain')
    || process.env.CYNAPS3_CONTENT_DOMAIN
    || 'https://content.7cycle.life'

  // Static agent identity from config. Dynamic per-agent env vars
  // (OPENCLAW_AGENT_ID, CYNAPS3_AGENT_ID) are read at request time
  // in the API client so sub-agents get their own identity.
  const agentId = getString(pluginConfig, 'agentId')

  if (!supabaseUrl) throw new Error('Missing required config: supabaseUrl')
  if (!supabaseAnonKey) throw new Error('Missing required config: supabaseAnonKey')
  if (!serviceRoleKey) throw new Error('Missing required config: serviceRoleKey')
  if (!userId) throw new Error('Missing required config: userId')

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error(`Invalid supabaseUrl: ${supabaseUrl}`)
  }

  // Parse enabled modules (default: musicmation only)
  const rawModules = pluginConfig && Array.isArray(pluginConfig.enabledModules)
    ? pluginConfig.enabledModules
    : ['musicmation']
  const enabledModules = rawModules
    .filter((m): m is CynapsModule => typeof m === 'string' && VALID_MODULES.has(m as CynapsModule))

  if (enabledModules.length === 0) {
    enabledModules.push('musicmation')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
    userId,
    contentDomain,
    enabledModules,
    agentId,
  }
}

function getString(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!obj) return undefined
  const val = obj[key]
  return typeof val === 'string' && val.length > 0 ? val : undefined
}
