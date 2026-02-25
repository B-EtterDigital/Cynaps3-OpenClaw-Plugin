import type { PreflightResult, Track, SearchResult, BrowseStylesResult, LibraryStats } from '../../src/core/types.js'

export const PREFLIGHT_READY: PreflightResult = {
  ready: true,
  checks: {
    authenticated: true,
    suno_api_key: true,
    credits_available: 500,
    tier: 'paid',
    daily_used: 3,
    daily_limit: 999,
  },
  actions_needed: [],
  autonomy: {
    rename_tracks: 'auto',
    rate_tracks: 'auto',
    create_albums: 'suggest',
    set_dramaturgy: 'auto',
    bulk_generate: 'suggest',
  },
  agent_visibility: {
    show_credits: true,
    show_generation_queue: true,
  },
}

export const PREFLIGHT_NOT_READY: PreflightResult = {
  ready: false,
  checks: {
    authenticated: true,
    suno_api_key: false,
    credits_available: null,
    tier: 'free',
    daily_used: 0,
    daily_limit: 5,
  },
  actions_needed: [
    {
      issue: 'NO_API_KEY',
      message: 'No Suno API key configured',
      instructions: 'Go to Settings > API Keys to add your Suno API key',
    },
  ],
  autonomy: {},
  agent_visibility: {},
}

export const MOCK_TRACK: Track = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  title: 'Test Track',
  audio_url: 'https://cdn.example.com/audio/test.mp3',
  image_url: 'https://cdn.example.com/images/test.jpg',
  duration: 210,
  duration_sec: 210,
  detected_bpm: 120,
  detected_key: 'C major',
  tags_mood: ['energetic'],
  tags_genre: ['electronic'],
  tags_energy_level: 'high',
  rating: 4,
  style_label: 'Kraftwerk-inspired electro',
  short_summary: null,
  status: 'COMPLETE',
  created_at: '2026-02-20T10:00:00Z',
  project_id: '550e8400-e29b-41d4-a716-446655440000',
}

export const MOCK_VARIATION: Track = {
  ...MOCK_TRACK,
  id: '550e8400-e29b-41d4-a716-446655440002',
  title: 'Test Track (v2)',
  parent_id: MOCK_TRACK.id,
  item_type: 'variation',
  variation_index: 1,
}

export const MOCK_SEARCH_RESULT: SearchResult = {
  tracks: [MOCK_TRACK],
  count: 1,
}

export const MOCK_BROWSE_STYLES: BrowseStylesResult = {
  styles: [
    {
      id: 'kraftwerk',
      name: 'Kraftwerk',
      category: 'electronic-dance',
      subcategory: 'synthpop',
      tags: ['electronic', 'minimalist', 'german'],
      era: '1970s-1980s',
      description: 'Pioneering electronic music',
    },
  ],
  count: 1,
  mode: 'browse',
}

export const MOCK_LIBRARY_STATS: LibraryStats = {
  total_tracks: 42,
  genres: { electronic: 15, 'hip-hop': 10, pop: 8, jazz: 5, rock: 4 },
  moods: { energetic: 12, calm: 10, melancholic: 8, dreamy: 7, dark: 5 },
  avg_bpm: 118,
  top_keys: ['C major', 'A minor', 'G major'],
  energy_distribution: { low: 10, medium: 15, high: 12, intense: 5 },
  recent_5: [
    { id: MOCK_TRACK.id, title: 'Test Track', genre: 'electronic', mood: 'energetic', created_at: '2026-02-20T10:00:00Z' },
  ],
}

export const CONFIRMATION_RESPONSE = {
  confirmation_required: true as const,
  autonomy_level: 'suggest' as const,
  capability: 'create_albums',
  confirmation_token: 'Y3JlYXRlX2FsYnVtX3Rlc3RfdG9rZW4',
  expires_in: 300,
  message: 'Suggested action: create_albums. Present to user, then call again with confirmation_token.',
}
