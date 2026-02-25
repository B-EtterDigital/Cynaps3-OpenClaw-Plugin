/**
 * Tool Registry — Orchestrates tool registration based on enabled modules.
 *
 * Core tools (preflight, search) always register.
 * Module tools register only when their module is in enabledModules.
 */

import type { OpenClawPluginApi, CynapsConfig, CynapsModule } from '../core/types.js'
import { registerPreflightTool } from './cynaps3-preflight.js'
import { registerMusicmationGenerateTool } from './musicmation-generate.js'
import { registerMusicmationLibraryTools } from './musicmation-library.js'
import { registerMusicmationWriteTools } from './musicmation-write.js'
import { registerMusicmationProjectTools } from './musicmation-projects.js'
import { registerMusicmationContentTools } from './musicmation-content.js'

type ModuleRegistrar = (api: OpenClawPluginApi, config: CynapsConfig) => void

/** Maps module names to their tool registrars */
const MODULE_TOOLS: Record<CynapsModule, ModuleRegistrar[]> = {
  musicmation: [
    registerMusicmationGenerateTool,
    registerMusicmationLibraryTools,
    registerMusicmationWriteTools,
    registerMusicmationProjectTools,
    registerMusicmationContentTools,
  ],
  storymation: [
    // registerStorymationTools — Phase 2
  ],
  skillmation: [
    // registerSkillmationTools — Phase 3
  ],
  contentmation: [
    // registerContentmationTools — Phase 4
  ],
}

/**
 * Register all tools for the configured modules.
 * Core tools register unconditionally.
 * Module tools register based on enabledModules config.
 */
export function registerAllTools(api: OpenClawPluginApi, config: CynapsConfig): void {
  // Core tools — always available
  registerPreflightTool(api, config)

  // Module-specific tools
  const enabled = new Set(config.enabledModules)

  for (const [module, registrars] of Object.entries(MODULE_TOOLS)) {
    if (enabled.has(module as CynapsModule)) {
      for (const registrar of registrars) {
        registrar(api, config)
      }
    }
  }
}
