import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CynapsApiError } from '../../src/core/errors.js'

/**
 * Handler behavior tests — verify that tool execute() functions:
 * - Map params to correct API calls
 * - Handle error wrapping properly
 * - Handle confirmation token flow (write tools)
 * - Return AgentToolResult format
 */

// ─── Mock API Client ─────────────────────────────────────────────

const mockRpc = vi.fn()
const mockQuery = vi.fn()
const mockCall = vi.fn()

vi.mock('../../src/core/api-client.js', () => {
  class MockCynapsApiClient {
    rpc = mockRpc
    query = mockQuery
    call = mockCall
    static fromContext() { return new MockCynapsApiClient() }
  }
  return { CynapsApiClient: MockCynapsApiClient }
})

// Import AFTER mocks are established
const { registerMusicmationLibraryTools } = await import('../../src/tools/musicmation-library.js')
const { registerMusicmationWriteTools } = await import('../../src/tools/musicmation-write.js')
const { registerPreflightTool } = await import('../../src/tools/cynaps3-preflight.js')
const { registerMusicmationGenerateTool } = await import('../../src/tools/musicmation-generate.js')
const { createMockPluginAPI } = await import('../fixtures/mock-api.js')
const { MOCK_CONFIG } = await import('../fixtures/mock-config.js')

// ─── Setup ───────────────────────────────────────────────────────

function setupTools() {
  const api = createMockPluginAPI()
  registerPreflightTool(api, MOCK_CONFIG)
  registerMusicmationGenerateTool(api, MOCK_CONFIG)
  registerMusicmationLibraryTools(api, MOCK_CONFIG)
  registerMusicmationWriteTools(api, MOCK_CONFIG)
  return api
}

describe('handler behavior', () => {
  let api: ReturnType<typeof setupTools>

  beforeEach(() => {
    vi.clearAllMocks()
    api = setupTools()
  })

  // ─── Result Format ──────────────────────────────────────────

  describe('result format (AgentToolResult)', () => {
    it('returns content array with type text', async () => {
      mockRpc.mockResolvedValue({ ready: true, checks: {} })
      const tool = api.getTool('cynaps3_preflight')!
      const result = await tool.execute('test-id', {})
      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')
      expect(typeof result.content[0].text).toBe('string')
    })

    it('returns details alongside content', async () => {
      mockRpc.mockResolvedValue({ tracks: [], count: 0 })
      const tool = api.getTool('musicmation_search_tracks')!
      const result = await tool.execute('test-id', { mood: ['chill'] })
      expect(result.details).toEqual({ tracks: [], count: 0 })
    })
  })

  // ─── Input Mapping ──────────────────────────────────────────

  describe('input mapping', () => {
    it('search_tracks forwards all known filter params', async () => {
      mockRpc.mockResolvedValue({ tracks: [], count: 0 })
      const tool = api.getTool('musicmation_search_tracks')!
      const params = {
        mood: ['calm', 'dreamy'],
        genre: ['ambient'],
        energy_level: 'low',
        bpm_range: [60, 90],
        limit: 10,
      }
      await tool.execute('test-id', params)
      expect(mockRpc).toHaveBeenCalledWith('search-tracks', params)
    })

    it('search_tracks strips unknown fields (HIGH-2)', async () => {
      mockRpc.mockResolvedValue({ tracks: [], count: 0 })
      const tool = api.getTool('musicmation_search_tracks')!
      const params = {
        mood: ['calm'],
        __proto_pollution__: true,
        sql_injection: 'DROP TABLE',
        unknown_field: 'should be stripped',
      }
      await tool.execute('test-id', params)
      // Only 'mood' should be forwarded — the rest are unknown and stripped
      expect(mockRpc).toHaveBeenCalledWith('search-tracks', { mood: ['calm'] })
    })

    it('browse_styles forwards query and detail_ids', async () => {
      mockRpc.mockResolvedValue({ styles: [], count: 0, mode: 'browse' })
      const tool = api.getTool('musicmation_browse_styles')!
      const params = { query: 'kraftwerk', detail_ids: ['s1', 's2'] }
      await tool.execute('test-id', params)
      expect(mockRpc).toHaveBeenCalledWith('browse-styles', params)
    })

    it('rate_tracks passes ratings and confirmation_token', async () => {
      mockRpc.mockResolvedValue({ updated: 2 })
      const tool = api.getTool('musicmation_rate_tracks')!
      const params = {
        ratings: [{ track_id: 'a', rating: 4 }, { track_id: 'b', rating: 5 }],
        confirmation_token: 'tok-123',
      }
      await tool.execute('test-id', params)
      expect(mockRpc).toHaveBeenCalledWith('rate-tracks', {
        ratings: params.ratings,
        confirmation_token: 'tok-123',
      })
    })

    it('get_top_rated forwards min_rating and limit', async () => {
      mockRpc.mockResolvedValue({ tracks: [] })
      const tool = api.getTool('musicmation_get_top_rated')!
      const params = { min_rating: 4, limit: 5 }
      await tool.execute('test-id', params)
      expect(mockRpc).toHaveBeenCalledWith('get-top-rated', params)
    })

    it('get_influence_group_detail forwards group_id', async () => {
      mockRpc.mockResolvedValue({ group: {} })
      const tool = api.getTool('musicmation_get_influence_group_detail')!
      await tool.execute('test-id', { group_id: 'grp-1' })
      expect(mockRpc).toHaveBeenCalledWith('get-influence-group-detail', { group_id: 'grp-1' })
    })

    it('generate_lyrics calls suno-proxy with method and params', async () => {
      mockCall.mockResolvedValue({ lyrics: 'test lyrics' })
      const tool = api.getTool('musicmation_generate_lyrics')!
      await tool.execute('test-id', { prompt: 'a sad song about rain' })
      expect(mockCall).toHaveBeenCalledWith('suno-proxy', {
        method: 'generateLyrics',
        params: { prompt: 'a sad song about rain' },
      })
    })
  })

  // ─── Confirmation Token Flow ────────────────────────────────

  describe('confirmation token flow', () => {
    const CONFIRM_RESPONSE = {
      confirmation_required: true,
      autonomy_level: 'suggest',
      capability: 'rate_tracks',
      confirmation_token: 'tok-abc',
      expires_in: 300,
      message: 'Please confirm rating',
    }

    it('rate_tracks returns confirmation instruction', async () => {
      mockRpc.mockResolvedValue(CONFIRM_RESPONSE)
      const tool = api.getTool('musicmation_rate_tracks')!
      const result = await tool.execute('test-id', { ratings: [{ track_id: 'x', rating: 3 }] })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.confirmation_required).toBe(true)
      expect(parsed.confirmation_token).toBe('tok-abc')
      expect(parsed.instruction).toContain('confirmation_token')
    })

    it('create_album returns confirmation instruction', async () => {
      mockRpc.mockResolvedValue({
        ...CONFIRM_RESPONSE,
        capability: 'create_album',
      })
      const tool = api.getTool('musicmation_create_album')!
      const result = await tool.execute('test-id', { title: 'Test Album', track_ids: ['a'] })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.confirmation_required).toBe(true)
      expect(parsed.instruction).toContain('confirmation_token')
    })

    it('set_dramaturgy returns confirmation instruction', async () => {
      mockRpc.mockResolvedValue({
        ...CONFIRM_RESPONSE,
        capability: 'set_dramaturgy',
      })
      const tool = api.getTool('musicmation_set_dramaturgy')!
      const result = await tool.execute('test-id', {
        album_id: 'album-1',
        tracks: [{ track_id: 'a', order: 1 }],
      })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.confirmation_required).toBe(true)
      expect(parsed.instruction).toContain('dramaturgy')
    })

    it('bulk_rename returns confirmation instruction', async () => {
      mockRpc.mockResolvedValue({
        ...CONFIRM_RESPONSE,
        capability: 'bulk_rename',
      })
      const tool = api.getTool('musicmation_bulk_rename')!
      const result = await tool.execute('test-id', {
        renames: [{ id: 'a', new_title: 'New Name' }],
      })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.confirmation_required).toBe(true)
      expect(parsed.instruction).toContain('confirmation_token')
    })

    it('write tool passes through success result (no confirmation)', async () => {
      const successResult = { updated: 3, message: 'Ratings saved' }
      mockRpc.mockResolvedValue(successResult)
      const tool = api.getTool('musicmation_rate_tracks')!
      const result = await tool.execute('test-id', {
        ratings: [{ track_id: 'a', rating: 5 }],
        confirmation_token: 'tok-confirmed',
      })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toEqual(successResult)
    })
  })

  // ─── Error Wrapping ─────────────────────────────────────────

  describe('error wrapping', () => {
    it('wraps API errors into CynapsApiError', async () => {
      mockRpc.mockRejectedValue(new Error('Connection refused'))
      const tool = api.getTool('cynaps3_preflight')!
      await expect(tool.execute('test-id', {})).rejects.toThrow(CynapsApiError)
    })

    it('preserves CynapsApiError from API client', async () => {
      const apiErr = new CynapsApiError('Rate limit', 429, 'RATE_LIMITED')
      mockRpc.mockRejectedValue(apiErr)
      const tool = api.getTool('musicmation_search_tracks')!
      await expect(tool.execute('test-id', {})).rejects.toBe(apiErr)
    })

    it('wraps string errors', async () => {
      mockRpc.mockRejectedValue('unexpected string error')
      const tool = api.getTool('musicmation_library_stats')!
      await expect(tool.execute('test-id', {})).rejects.toThrow(CynapsApiError)
    })
  })

  // ─── Poll Status ────────────────────────────────────────────

  describe('musicmation_poll_status', () => {
    it('returns not_found when track does not exist', async () => {
      mockQuery.mockResolvedValue([])
      const tool = api.getTool('musicmation_poll_status')!
      const result = await tool.execute('test-id', { track_id: 'missing-id' })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.status).toBe('not_found')
    })

    it('returns complete with variations when track is done', async () => {
      const track = { id: 'trk-1', title: 'Test', status: 'COMPLETE', audio_url: 'https://a.mp3' }
      const variations = [
        { id: 'var-1', title: 'Test v1', status: 'COMPLETE', variation_index: 0 },
        { id: 'var-2', title: 'Test v2', status: 'COMPLETE', variation_index: 1 },
      ]
      mockQuery
        .mockResolvedValueOnce([track])      // main track query
        .mockResolvedValueOnce(variations)   // variations query
      const tool = api.getTool('musicmation_poll_status')!
      const result = await tool.execute('test-id', { track_id: 'trk-1' })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.status).toBe('complete')
      expect(parsed.track).toEqual(track)
      expect(parsed.variations).toEqual(variations)
      expect(parsed.total_variations).toBe(3)
      expect(parsed.listen_urls.length).toBe(3)
    })

    it('returns queued status for pending tracks', async () => {
      const track = { id: 'trk-2', title: 'Pending', status: 'QUEUED' }
      mockQuery.mockResolvedValueOnce([track])
      const tool = api.getTool('musicmation_poll_status')!
      const result = await tool.execute('test-id', { track_id: 'trk-2' })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.status).toBe('queued')
      expect(parsed.message).toContain('queued')
    })

    it('returns generating status for in-progress tracks', async () => {
      const track = { id: 'trk-3', title: 'WIP', status: 'GENERATING' }
      mockQuery.mockResolvedValueOnce([track])
      const tool = api.getTool('musicmation_poll_status')!
      const result = await tool.execute('test-id', { track_id: 'trk-3' })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.status).toBe('generating')
      expect(parsed.message).toContain('generated')
    })
  })

  // ─── Generate (compound tool) ───────────────────────────────

  describe('musicmation_generate', () => {
    it('creates track then enqueues generation', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'new-trk-1' }])
      mockCall.mockResolvedValueOnce({ enqueued: 1, skipped: 0, total: 1, tier: 'creator' })

      const tool = api.getTool('musicmation_generate')!
      const result = await tool.execute('test-id', {
        title: 'My Track',
        project_id: 'proj-1',
        lyrics: 'La la la',
        style_tags: 'electronic',
        model: 'V4',
      })

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.track_id).toBe('new-trk-1')
      expect(parsed.enqueued).toBe(true)
      expect(parsed.tier).toBe('creator')
    })

    it('returns partial success when enqueue fails', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'new-trk-2' }])
      mockCall.mockRejectedValueOnce(new CynapsApiError('No credits', 402, 'NO_CREDITS'))

      const tool = api.getTool('musicmation_generate')!
      const result = await tool.execute('test-id', {
        title: 'No Credit Track',
        project_id: 'proj-1',
      })

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.track_id).toBe('new-trk-2')
      expect(parsed.enqueued).toBe(false)
      expect(parsed.message).toContain('generation failed')
    })

    it('throws when track creation fails', async () => {
      mockQuery.mockResolvedValueOnce([])

      const tool = api.getTool('musicmation_generate')!
      await expect(tool.execute('test-id', {
        title: 'Fail Track',
        project_id: 'proj-1',
      })).rejects.toThrow('Failed to create track item')
    })
  })
})
