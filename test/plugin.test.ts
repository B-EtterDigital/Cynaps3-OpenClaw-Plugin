import { describe, it, expect, vi } from 'vitest'
import plugin from '../src/index.js'
import { createMockPluginAPI } from './fixtures/mock-api.js'

describe('Cynaps3 Plugin', () => {
  it('exports id and name', () => {
    expect(plugin.id).toBe('cynaps3')
    expect(plugin.name).toBe('Cynaps3 Creative Suite')
  })

  it('has a register function', () => {
    expect(typeof plugin.register).toBe('function')
  })

  it('registers tools and commands with valid config', () => {
    const api = createMockPluginAPI()
    plugin.register(api)

    // Should register tools
    expect(api.tools.length).toBeGreaterThan(0)
    expect(api.tools.some((t) => t.name === 'cynaps3_preflight')).toBe(true)

    // No background services (poller removed per HIGH-3)
    expect(api.services.length).toBe(0)

    // Should register the status command
    expect(api.commands.length).toBe(1)
    expect(api.commands[0].name).toBe('cynaps3-status')
  })

  it('gracefully handles invalid config (missing url)', () => {
    const api = createMockPluginAPI({ supabaseAnonKey: 'test' })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Should not throw
    plugin.register(api)

    // Should log error
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[cynaps3] Config error'),
    )

    // Should NOT register anything
    expect(api.tools.length).toBe(0)
    expect(api.services.length).toBe(0)
    expect(api.commands.length).toBe(0)

    consoleSpy.mockRestore()
  })

  it('command has required fields', () => {
    const api = createMockPluginAPI()
    plugin.register(api)

    const cmd = api.getCommand('cynaps3-status')
    expect(cmd).toBeDefined()
    expect(cmd!.description).toBeTruthy()
    expect(cmd!.requireAuth).toBe(true)
    expect(typeof cmd!.handler).toBe('function')
  })
})
