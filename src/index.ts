/**
 * Cynaps3 OpenClaw Plugin — Main Entry Point
 *
 * Registers:
 * - Agent tools (typed, schema-validated) per enabled module
 * - Auto-reply commands (/cynaps3-status)
 *
 * Architecture:
 *   SKILL.md files  ->  Domain knowledge (what to do)
 *   Plugin tools    ->  Typed capabilities (how to call)
 *   Edge functions  ->  Server-side authority (all enforcement)
 */

import type { OpenClawPluginApi, CynapsConfig } from './core/types.js'
import { parseConfig } from './core/config.js'
import { registerAllTools } from './tools/_registry.js'
import { createStatusCommand } from './commands/status.js'

export default {
  id: 'cynaps3',
  name: 'Cynaps3 Creative Suite',
  description: 'AI-powered creative suite — music generation, library management, and more',

  configSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      supabaseUrl: { type: 'string', description: 'Supabase project URL' },
      supabaseAnonKey: { type: 'string', description: 'Supabase public key' },
      serviceRoleKey: { type: 'string', description: 'Service role key for server-to-server auth' },
      userId: { type: 'string', description: 'Clerk user ID for auth scoping' },
      contentDomain: { type: 'string', description: 'Base URL for content links (default: https://content.7cycle.life)' },
      enabledModules: { type: 'array', items: { type: 'string' }, default: ['musicmation'] },
      agentId: { type: 'string', description: 'Optional static override for agent identity. Auto-detected from OpenClaw runtime context; only set this if auto-detection fails.' },
    },
  },

  register(api: OpenClawPluginApi) {
    // --- Parse & Validate Config ---
    let config: CynapsConfig
    try {
      config = parseConfig(api.pluginConfig)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[cynaps3] Config error: ${msg}`)
      console.error('[cynaps3] Plugin disabled due to config error. Check plugins.entries.cynaps3 in openclaw.json.')
      return
    }

    const moduleList = config.enabledModules.join(', ')
    console.log(`[cynaps3] Initializing — modules: [${moduleList}]`)

    // --- Agent Tools ---
    registerAllTools(api, config)

    // --- Auto-Reply Commands ---
    api.registerCommand(createStatusCommand(config))

    // --- Done ---
    console.log('[cynaps3] Plugin registered successfully')
  },
}

// Re-export types for consumers
export type { CynapsConfig } from './core/types.js'
// NOTE (MED-4): CynapsApiClient is exported intentionally for library consumers
// who need programmatic access. The server enforces all security — this export
// cannot bypass auth, ownership scoping, or tier limits.
export { CynapsApiClient } from './core/api-client.js'
export { CynapsApiError } from './core/errors.js'
