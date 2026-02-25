/**
 * Musicmation Library Tools
 *
 * Read-only tools for browsing the user's music library:
 * - musicmation_search_tracks
 * - musicmation_browse_styles
 * - musicmation_library_stats
 * - musicmation_recommend
 * - musicmation_get_personas
 * - musicmation_get_top_rated
 * - musicmation_browse_influence_groups
 * - musicmation_get_influence_group_detail
 * - musicmation_poll_status
 * - musicmation_generate_lyrics
 */

import type {
  OpenClawPluginApi, CynapsConfig, AgentTool,
  SearchResult, BrowseStylesResult, LibraryStats, Track,
} from '../core/types.js'
import { CynapsApiClient } from '../core/api-client.js'
import { wrapError } from '../core/errors.js'
import { pick } from '../core/pick.js'
import { jsonResult } from '../core/result.js'

export function registerMusicmationLibraryTools(api: OpenClawPluginApi, config: CynapsConfig): void {
  api.registerTool((ctx) => {
    const client = CynapsApiClient.fromContext(config, ctx)

    return [
      // --- Search Tracks ---
      {
        name: 'musicmation_search_tracks',
        label: 'Search Tracks',
        description: 'Search the user\'s track library by mood, genre, energy, BPM, key, or text.',

        parameters: {
          type: 'object',
          properties: {
            mood: { type: 'array', items: { type: 'string' }, description: 'Filter by mood(s)' },
            genre: { type: 'array', items: { type: 'string' }, description: 'Filter by genre(s)' },
            energy_level: { type: 'string', enum: ['low', 'medium', 'high', 'intense'] },
            bpm_range: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[min, max] BPM' },
            key: { type: 'string', description: 'Musical key (e.g., "C major")' },
            text: { type: 'string', description: 'Search in track titles' },
            limit: { type: 'number', default: 20, minimum: 1, maximum: 50 },
          },
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc<SearchResult>('search-tracks',
              pick(params, ['mood', 'genre', 'energy_level', 'bpm_range', 'key', 'text', 'limit'])))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Browse Styles ---
      {
        name: 'musicmation_browse_styles',
        label: 'Browse Styles',
        description:
          'Browse 150+ artist styles. Use query/category to search. ' +
          'Use detail_ids to get full stylePrompt for specific styles.',

        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g., "kraftwerk")' },
            category: { type: 'string', description: 'Category filter (e.g., "electronic-dance")' },
            tags: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number', default: 25, minimum: 1, maximum: 50 },
            detail_ids: { type: 'array', items: { type: 'string' }, description: 'Get full detail for these style IDs' },
          },
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc<BrowseStylesResult>('browse-styles',
              pick(params, ['query', 'category', 'tags', 'limit', 'detail_ids'])))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Library Stats ---
      {
        name: 'musicmation_library_stats',
        label: 'Library Stats',
        description: 'Get overview of user\'s track library — genre breakdown, mood distribution, recent tracks.',

        parameters: { type: 'object', properties: {}, additionalProperties: false },

        async execute(_id: string, _params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc<LibraryStats>('library-stats'))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Recommend ---
      {
        name: 'musicmation_recommend',
        label: 'Recommend Tracks',
        description: 'Get mood-based recommendations from user\'s library.',

        parameters: {
          type: 'object',
          properties: {
            mood: { type: 'string', description: 'Target mood (e.g., "energetic", "calm")' },
            energy: { type: 'string', enum: ['low', 'medium', 'high', 'intense'] },
            context: { type: 'string', description: 'Context hint (e.g., "workout", "study", "sleep")' },
            exclude_ids: { type: 'array', items: { type: 'string' }, description: 'Track IDs to exclude' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 25 },
          },
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc('recommend',
              pick(params, ['mood', 'energy', 'context', 'exclude_ids', 'limit'])))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Get Personas ---
      {
        name: 'musicmation_get_personas',
        label: 'Get Personas',
        description: 'List available voice/style personas for music generation.',

        parameters: { type: 'object', properties: {}, additionalProperties: false },

        async execute(_id: string, _params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc('get-personas'))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Get Top Rated ---
      {
        name: 'musicmation_get_top_rated',
        label: 'Top Rated Tracks',
        description: 'Get highest-rated tracks from user\'s library.',

        parameters: {
          type: 'object',
          properties: {
            min_rating: { type: 'number', minimum: 1, maximum: 10, default: 4, description: 'Minimum rating threshold (1-10 scale)' },
            project_id: { type: 'string', description: 'Filter by project' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 50 },
          },
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc('get-top-rated',
              pick(params, ['min_rating', 'project_id', 'limit'])))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Browse Influence Groups ---
      {
        name: 'musicmation_browse_influence_groups',
        label: 'Browse Influence Groups',
        description: 'List influence groups — curated style reference sets for generation.',

        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project' },
            query: { type: 'string', description: 'Search by group name' },
            limit: { type: 'number', default: 20, minimum: 1, maximum: 50 },
          },
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc('browse-influence-groups',
              pick(params, ['project_id', 'query', 'limit'])))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Get Influence Group Detail ---
      {
        name: 'musicmation_get_influence_group_detail',
        label: 'Influence Group Detail',
        description: 'Get full detail of an influence group, including its member styles and weights.',

        parameters: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'Influence group UUID' },
          },
          required: ['group_id'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc('get-influence-group-detail',
              pick(params, ['group_id'])))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Poll Status ---
      {
        name: 'musicmation_poll_status',
        label: 'Poll Generation Status',
        description:
          'Poll a track\'s generation status. Returns the track with audio_url when complete. ' +
          'Also fetches child variations. Call every 15 seconds until status is COMPLETE.',

        parameters: {
          type: 'object',
          properties: {
            track_id: { type: 'string', description: 'Track UUID to poll' },
          },
          required: ['track_id'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const trackId = params.track_id as string

            // Fetch the original track
            const tracks = await client.query<Track[]>('sunoma_items', {
              'id': `eq.${trackId}`,
              'select': 'id,title,status,audio_url,image_url,duration_sec,generation_source',
            })

            const track = tracks?.[0]
            if (!track) {
              return jsonResult({ status: 'not_found', track_id: trackId, message: 'Track not found' })
            }

            // Server returns uppercase statuses: COMPLETE, QUEUED, GENERATING
            if (track.status === 'COMPLETE') {
              const variations = await client.query<Track[]>('sunoma_items', {
                'parent_id': `eq.${trackId}`,
                'item_type': 'eq.variation',
                'select': 'id,title,status,audio_url,image_url,duration_sec,variation_index',
                'order': 'variation_index.asc',
              })

              return jsonResult({
                status: 'complete',
                track,
                variations: variations || [],
                total_variations: (variations?.length ?? 0) + 1,
                listen_urls: [
                  `${config.contentDomain}/details/${track.id}`,
                  ...(variations || []).map((v: Track) =>
                    `${config.contentDomain}/details/${v.id}`
                  ),
                ],
              })
            }

            // MED-1: Guard against null/undefined status from server
            const safeStatus = (track.status || 'unknown').toLowerCase()
            return jsonResult({
              status: safeStatus,
              track,
              variations: [],
              message: track.status === 'QUEUED'
                ? 'Track is queued for generation...'
                : track.status === 'GENERATING'
                  ? 'Track is being generated...'
                  : `Status: ${track.status || 'unknown'}`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Generate Lyrics ---
      {
        name: 'musicmation_generate_lyrics',
        label: 'Generate Lyrics',
        description:
          'Generate song lyrics using Suno AI. Requires API key but does not consume generation credits. ' +
          'Uses influence groups and style context from the pipeline. ' +
          'Use the language parameter to generate lyrics in a specific language.',

        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Description of the song (mood, theme, story)',
              maxLength: 1000,
            },
            language: {
              type: 'string',
              description: 'Language for the lyrics (e.g., "German", "Spanish", "Japanese", "French"). If not specified, defaults to English.',
            },
          },
          required: ['prompt'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const language = params.language as string | undefined
            const rawPrompt = params.prompt as string
            const prompt = language
              ? `Write the lyrics in ${language}. ${rawPrompt}`
              : rawPrompt

            return jsonResult(await client.call('suno-proxy', {
              method: 'generateLyrics',
              params: { prompt },
            }))
          } catch (err) { throw wrapError(err) }
        },
      },
    ] as AgentTool[]
  })
}
