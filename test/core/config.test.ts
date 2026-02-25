import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseConfig } from '../../src/core/config.js'
import { MOCK_RAW_CONFIG } from '../fixtures/mock-config.js'

describe('parseConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses valid config with all fields', () => {
    const config = parseConfig(MOCK_RAW_CONFIG)
    expect(config.supabaseUrl).toBe('https://test-project.supabase.co')
    expect(config.supabaseAnonKey).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key')
    expect(config.serviceRoleKey).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key')
    expect(config.userId).toBe('user_test_123')
    expect(config.enabledModules).toEqual(['musicmation'])
  })

  it('throws on missing supabaseUrl', () => {
    const raw = { ...MOCK_RAW_CONFIG, supabaseUrl: undefined }
    expect(() => parseConfig(raw)).toThrow('Missing required config: supabaseUrl')
  })

  it('throws on missing supabaseAnonKey', () => {
    const raw = { ...MOCK_RAW_CONFIG, supabaseAnonKey: '' }
    expect(() => parseConfig(raw)).toThrow('Missing required config: supabaseAnonKey')
  })

  it('throws on missing serviceRoleKey', () => {
    const raw = { ...MOCK_RAW_CONFIG, serviceRoleKey: undefined }
    expect(() => parseConfig(raw)).toThrow('Missing required config: serviceRoleKey')
  })

  it('throws on missing userId', () => {
    const raw = { ...MOCK_RAW_CONFIG, userId: '' }
    expect(() => parseConfig(raw)).toThrow('Missing required config: userId')
  })

  it('throws on invalid supabaseUrl format', () => {
    const raw = { ...MOCK_RAW_CONFIG, supabaseUrl: 'not-a-url' }
    expect(() => parseConfig(raw)).toThrow('Invalid supabaseUrl')
  })

  it('defaults enabledModules to musicmation when missing', () => {
    const raw = { ...MOCK_RAW_CONFIG, enabledModules: undefined }
    const config = parseConfig(raw)
    expect(config.enabledModules).toEqual(['musicmation'])
  })

  it('defaults enabledModules to musicmation when empty array', () => {
    const raw = { ...MOCK_RAW_CONFIG, enabledModules: [] }
    const config = parseConfig(raw)
    expect(config.enabledModules).toEqual(['musicmation'])
  })

  it('filters out invalid module names', () => {
    const raw = { ...MOCK_RAW_CONFIG, enabledModules: ['musicmation', 'invalid-module', 'storymation'] }
    const config = parseConfig(raw)
    expect(config.enabledModules).toEqual(['musicmation', 'storymation'])
  })

  it('accepts all valid modules', () => {
    const raw = { ...MOCK_RAW_CONFIG, enabledModules: ['musicmation', 'storymation', 'skillmation', 'contentmation'] }
    const config = parseConfig(raw)
    expect(config.enabledModules).toHaveLength(4)
  })

  it('returns all config fields', () => {
    const config = parseConfig(MOCK_RAW_CONFIG)
    expect(Object.keys(config).sort()).toEqual([
      'agentId', 'contentDomain', 'enabledModules', 'serviceRoleKey', 'supabaseAnonKey', 'supabaseUrl', 'userId',
    ])
  })

  // ─── contentDomain ───────────────────────────────────────────

  describe('contentDomain', () => {
    it('defaults to https://content.7cycle.life when not provided', () => {
      const config = parseConfig(MOCK_RAW_CONFIG)
      expect(config.contentDomain).toBe('https://content.7cycle.life')
    })

    it('uses pluginConfig value when provided', () => {
      const raw = { ...MOCK_RAW_CONFIG, contentDomain: 'https://custom.domain.io' }
      const config = parseConfig(raw)
      expect(config.contentDomain).toBe('https://custom.domain.io')
    })

    it('falls back to env var before default', () => {
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...process.env,
          CYNAPS3_SUPABASE_URL: 'https://env-project.supabase.co',
          CYNAPS3_ANON_KEY: 'env-anon-key',
          CYNAPS3_SERVICE_ROLE_KEY: 'env-service-role-key',
          CYNAPS3_USER_ID: 'env-user-id',
          CYNAPS3_CONTENT_DOMAIN: 'https://env-content.example.com',
        },
      })
      const config = parseConfig(undefined)
      expect(config.contentDomain).toBe('https://env-content.example.com')
    })
  })

  // ─── Env Var Fallback ─────────────────────────────────────────

  describe('env var fallback', () => {
    it('falls back to env vars when pluginConfig is undefined', () => {
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...process.env,
          CYNAPS3_SUPABASE_URL: 'https://env-project.supabase.co',
          CYNAPS3_ANON_KEY: 'env-anon-key',
          CYNAPS3_SERVICE_ROLE_KEY: 'env-service-role-key',
          CYNAPS3_USER_ID: 'env-user-id',
        },
      })
      const config = parseConfig(undefined)
      expect(config.supabaseUrl).toBe('https://env-project.supabase.co')
      expect(config.supabaseAnonKey).toBe('env-anon-key')
      expect(config.serviceRoleKey).toBe('env-service-role-key')
      expect(config.userId).toBe('env-user-id')
    })

    it('pluginConfig values take priority over env vars', () => {
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...process.env,
          CYNAPS3_SUPABASE_URL: 'https://env-project.supabase.co',
          CYNAPS3_ANON_KEY: 'env-anon-key',
          CYNAPS3_SERVICE_ROLE_KEY: 'env-service-role-key',
          CYNAPS3_USER_ID: 'env-user-id',
        },
      })
      const config = parseConfig(MOCK_RAW_CONFIG)
      // Should use pluginConfig values, not env vars
      expect(config.supabaseUrl).toBe('https://test-project.supabase.co')
      expect(config.serviceRoleKey).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key')
    })

    it('throws when required env vars are also missing', () => {
      expect(() => parseConfig(undefined)).toThrow('Missing required config: supabaseUrl')
    })
  })
})
