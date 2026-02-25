import { describe, it, expect } from 'vitest'
import { registerAllTools } from '../../src/tools/_registry.js'
import { createMockPluginAPI } from '../fixtures/mock-api.js'
import { MOCK_CONFIG } from '../fixtures/mock-config.js'

describe('registerAllTools', () => {
  it('registers core tools (preflight) for any config', () => {
    const api = createMockPluginAPI()
    registerAllTools(api, MOCK_CONFIG)

    expect(api.getTool('cynaps3_preflight')).toBeDefined()
  })

  it('registers all musicmation tools when module is enabled', () => {
    const api = createMockPluginAPI()
    registerAllTools(api, { ...MOCK_CONFIG, enabledModules: ['musicmation'] })

    const toolNames = api.tools.map((t) => t.name)

    // Core tool
    expect(toolNames).toContain('cynaps3_preflight')

    // Generate tools (3)
    expect(toolNames).toContain('musicmation_generate')
    expect(toolNames).toContain('musicmation_bulk_generate')
    expect(toolNames).toContain('musicmation_bulk_poll_status')

    // Library tools (10)
    expect(toolNames).toContain('musicmation_search_tracks')
    expect(toolNames).toContain('musicmation_browse_styles')
    expect(toolNames).toContain('musicmation_library_stats')
    expect(toolNames).toContain('musicmation_recommend')
    expect(toolNames).toContain('musicmation_get_personas')
    expect(toolNames).toContain('musicmation_poll_status')
    expect(toolNames).toContain('musicmation_get_top_rated')
    expect(toolNames).toContain('musicmation_browse_influence_groups')
    expect(toolNames).toContain('musicmation_get_influence_group_detail')
    expect(toolNames).toContain('musicmation_generate_lyrics')

    // Write tools (4)
    expect(toolNames).toContain('musicmation_rate_tracks')
    expect(toolNames).toContain('musicmation_create_album')
    expect(toolNames).toContain('musicmation_set_dramaturgy')
    expect(toolNames).toContain('musicmation_bulk_rename')

    // Project tools (6)
    expect(toolNames).toContain('musicmation_list_projects')
    expect(toolNames).toContain('musicmation_create_project')
    expect(toolNames).toContain('musicmation_update_project')
    expect(toolNames).toContain('musicmation_delete_project')
    expect(toolNames).toContain('musicmation_get_project_context')
    expect(toolNames).toContain('musicmation_set_project_context')

    // Content tools (2)
    expect(toolNames).toContain('musicmation_create_item')
    expect(toolNames).toContain('musicmation_update_item')
  })

  it('does not register musicmation tools when module is disabled', () => {
    const api = createMockPluginAPI()
    registerAllTools(api, { ...MOCK_CONFIG, enabledModules: ['storymation'] })

    const toolNames = api.tools.map((t) => t.name)

    // Core always present
    expect(toolNames).toContain('cynaps3_preflight')

    // Musicmation tools should NOT be present
    expect(toolNames).not.toContain('musicmation_generate')
    expect(toolNames).not.toContain('musicmation_search_tracks')
    expect(toolNames).not.toContain('musicmation_rate_tracks')
  })

  it('registers correct number of tools for musicmation module', () => {
    const api = createMockPluginAPI()
    registerAllTools(api, { ...MOCK_CONFIG, enabledModules: ['musicmation'] })

    // 1 core + 3 generate + 10 library + 4 write + 6 project + 2 content = 26 tools
    expect(api.tools.length).toBe(26)
  })

  it('all tools have name, label, description, parameters, and execute', () => {
    const api = createMockPluginAPI()
    registerAllTools(api, { ...MOCK_CONFIG, enabledModules: ['musicmation'] })

    for (const tool of api.tools) {
      expect(tool.name).toBeTruthy()
      expect(tool.label).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.parameters).toBeDefined()
      expect(typeof tool.execute).toBe('function')
    }
  })

  it('tool names follow namespace_action convention', () => {
    const api = createMockPluginAPI()
    registerAllTools(api, { ...MOCK_CONFIG, enabledModules: ['musicmation'] })

    for (const tool of api.tools) {
      expect(tool.name).toMatch(/^(cynaps3|musicmation)_[a-z_]+$/)
    }
  })

  it('no duplicate tool names', () => {
    const api = createMockPluginAPI()
    registerAllTools(api, { ...MOCK_CONFIG, enabledModules: ['musicmation'] })

    const names = api.tools.map((t) => t.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })
})
