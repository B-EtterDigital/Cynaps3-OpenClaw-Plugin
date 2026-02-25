/**
 * Musicmation Generation Tools
 *
 * - musicmation_generate — Create a single track item and enqueue generation
 * - musicmation_bulk_generate — Enqueue multiple existing items for generation
 * - musicmation_bulk_poll_status — Poll status for multiple tracks at once
 *
 * NOTE: musicmation_generate explicitly constructs the POST body rather than
 * using pick(), because it renames fields (lyrics → transcript),
 * applies defaults (status: 'draft'), and transforms values.
 * This is intentional and more secure for CREATE operations.
 */

import type { OpenClawPluginApi, CynapsConfig, AgentTool, Track, EnqueueResult } from '../core/types.js'
import { CynapsApiClient } from '../core/api-client.js'
import { CynapsApiError, wrapError } from '../core/errors.js'
import { jsonResult } from '../core/result.js'

export function registerMusicmationGenerateTool(api: OpenClawPluginApi, config: CynapsConfig): void {
  api.registerTool((ctx) => {
    const client = CynapsApiClient.fromContext(config, ctx)

    return [
      // --- Single Generate ---
      {
      name: 'musicmation_generate',
      label: 'Generate Track',
      description:
        'Generate a music track. Supports two providers: Suno (default, 2 variations) and ' +
        'Sonauto (1 song, different style controls). Creates the track record and enqueues generation. ' +
        'Poll for status after calling.',

      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Track title',
            maxLength: 200,
          },
          lyrics: {
            type: 'string',
            description: 'Track lyrics. Leave empty for instrumental.',
            maxLength: 5000,
          },
          style_tags: {
            type: 'string',
            description: 'Musical style prompt (e.g., "Kraftwerk-inspired electro, 120 BPM")',
            maxLength: 2000,
          },
          project_id: {
            type: 'string',
            description: 'Project UUID to add the track to',
          },
          mood: {
            type: 'string',
            description: 'Track mood (calm, energetic, melancholic, etc.)',
          },
          genre: {
            type: 'string',
            description: 'Track genre (electronic, hip-hop, jazz, etc.)',
          },
          provider: {
            type: 'string',
            enum: ['suno', 'sonauto'],
            default: 'suno',
            description: 'Music generation provider. Suno = 2 variations, more features. Sonauto = 1 song, 100 credits/song.',
          },
          // --- Suno-specific params ---
          model: {
            type: 'string',
            enum: ['V4', 'V5'],
            default: 'V5',
            description: 'Suno only. Model version. V5 = higher quality (default). V4 = faster.',
          },
          weirdness: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.5,
            description: 'Suno only. Creativity/randomness (0 = conservative, 1 = experimental). Default 0.5.',
          },
          style_weight: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.83,
            description: 'Suno only. How closely to follow the style prompt (0 = loose, 1 = strict). Default 0.83.',
          },
          // --- Sonauto-specific params ---
          prompt_strength: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            default: 2.0,
            description: 'Sonauto only. How strongly tags/prompt influence output (0 = ignore, 5 = strict). Default 2.0.',
          },
          output_format: {
            type: 'string',
            enum: ['mp3', 'flac', 'wav', 'ogg', 'm4a'],
            default: 'ogg',
            description: 'Sonauto only. Audio output format. Default ogg.',
          },
          align_lyrics: {
            type: 'boolean',
            default: false,
            description: 'Sonauto only. Request timestamped lyrics alignment.',
          },
        },
        required: ['title'],
        additionalProperties: false,
      },

      async execute(_id: string, params: Record<string, unknown>) {
        const provider = (params.provider as string) || 'suno'
        const isSonauto = provider === 'sonauto'

        // Generate track ID — DB requires explicit TEXT PRIMARY KEY, no auto-generation.
        // Format: track_{unix_epoch}_{random_hex} (matches existing convention)
        const timestamp = Math.floor(Date.now() / 1000)
        const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
        const generatedId = `track_${timestamp}_${hex}`

        // Step 1: Create the track item
        // Explicit body construction — renames fields, applies defaults (not a pick() use case)
        const items = await client.query<Track[]>('sunoma_items', undefined, {
          method: 'POST',
          body: {
            id: generatedId,
            title: params.title as string,
            transcript: (params.lyrics as string) || '',
            style_tags: (params.style_tags as string) || '',
            project_id: (params.project_id as string) || null,
            item_type: 'track',
            mood: (params.mood as string) || null,
            genre: (params.genre as string) || null,
            status: 'draft',
            generation_source: isSonauto ? 'sonauto' : 'suno',
          },
        })

        const trackId = items?.[0]?.id
        if (!trackId) {
          throw new CynapsApiError('Failed to create track item — no ID returned', 500, 'CREATE_FAILED')
        }

        // Step 2: Enqueue generation — route by provider
        try {
          const endpoint = isSonauto ? 'sonauto-generation-enqueue' : 'suno-generation-enqueue'
          const enqueueBody = isSonauto
            ? {
                trackIds: [trackId],
                projectId: (params.project_id as string) || null,
                generationsRequested: 1,
                prompt_strength: params.prompt_strength ?? 2.0,
                output_format: (params.output_format as string) || 'ogg',
                align_lyrics: params.align_lyrics ?? false,
              }
            : {
                trackIds: [trackId],
                projectId: (params.project_id as string) || null,
                generationsRequested: 1,
                model: (params.model as string) || 'V5',
                weirdness: params.weirdness ?? 0.5,
                styleWeight: params.style_weight ?? 0.83,
              }

          const result = await client.call<EnqueueResult>(endpoint, enqueueBody)

          const variationMsg = isSonauto ? '1 song' : '2 variations'
          return jsonResult({
            track_id: trackId,
            provider,
            enqueued: result.enqueued > 0,
            tier: result.tier,
            message: result.enqueued > 0
              ? `Track "${params.title}" enqueued via ${provider}. Generating ${variationMsg} — takes 30-90 seconds.`
              : `Track created but generation failed. ${result.skipped} skipped.`,
          })
        } catch (err) {
          // Track was created but enqueue failed — return partial success
          const wrapped = wrapError(err)
          return jsonResult({
            track_id: trackId,
            provider,
            enqueued: false,
            tier: 'unknown',
            message: `Track created (${trackId}) but ${provider} generation failed: ${wrapped.userMessage}`,
          })
        }
      },
      },

      // --- Bulk Generate ---
      {
        name: 'musicmation_bulk_generate',
        label: 'Bulk Generate Tracks',
        description:
          'Enqueue multiple existing track items for generation in one batch. ' +
          'Supports Suno (default, 2 variations each) and Sonauto (1 song each). ' +
          'Items must already exist (created via musicmation_create_item). Max 20 per batch. ' +
          'Use musicmation_bulk_poll_status to check progress.',

        parameters: {
          type: 'object',
          properties: {
            track_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of track/item IDs to enqueue for generation',
              maxItems: 20,
            },
            project_id: {
              type: 'string',
              description: 'Project ID (used for style resolution)',
            },
            provider: {
              type: 'string',
              enum: ['suno', 'sonauto'],
              default: 'suno',
              description: 'Music generation provider. Suno = 2 variations. Sonauto = 1 song, 100 credits/song.',
            },
            // --- Suno-specific params ---
            model: {
              type: 'string',
              enum: ['V4', 'V5'],
              default: 'V5',
              description: 'Suno only. Model version. V5 = higher quality (default). V4 = faster.',
            },
            weirdness: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 0.5,
              description: 'Suno only. Creativity/randomness (0 = conservative, 1 = experimental). Default 0.5.',
            },
            style_weight: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 0.83,
              description: 'Suno only. How closely to follow the style prompt (0 = loose, 1 = strict). Default 0.83.',
            },
            // --- Sonauto-specific params ---
            prompt_strength: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              default: 2.0,
              description: 'Sonauto only. How strongly tags/prompt influence output (0 = ignore, 5 = strict). Default 2.0.',
            },
            output_format: {
              type: 'string',
              enum: ['mp3', 'flac', 'wav', 'ogg', 'm4a'],
              default: 'ogg',
              description: 'Sonauto only. Audio output format. Default ogg.',
            },
            align_lyrics: {
              type: 'boolean',
              default: false,
              description: 'Sonauto only. Request timestamped lyrics alignment.',
            },
          },
          required: ['track_ids'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const trackIds = params.track_ids as string[]
            if (!trackIds.length) {
              return jsonResult({ error: 'track_ids array is empty', enqueued: 0 })
            }

            const provider = (params.provider as string) || 'suno'
            const isSonauto = provider === 'sonauto'
            const endpoint = isSonauto ? 'sonauto-generation-enqueue' : 'suno-generation-enqueue'
            const enqueueBody = isSonauto
              ? {
                  trackIds,
                  projectId: (params.project_id as string) || null,
                  generationsRequested: 1,
                  prompt_strength: params.prompt_strength ?? 2.0,
                  output_format: (params.output_format as string) || 'ogg',
                  align_lyrics: params.align_lyrics ?? false,
                }
              : {
                  trackIds,
                  projectId: (params.project_id as string) || null,
                  generationsRequested: 1,
                  model: (params.model as string) || 'V5',
                  weirdness: params.weirdness ?? 0.5,
                  styleWeight: params.style_weight ?? 0.83,
                }

            const result = await client.call<EnqueueResult>(endpoint, enqueueBody)

            const variationMsg = isSonauto
              ? `Each produces 1 song (100 credits each)`
              : `Each produces 2 variations`

            return jsonResult({
              provider,
              enqueued: result.enqueued,
              skipped: result.skipped,
              total: trackIds.length,
              tier: result.tier,
              message: result.enqueued > 0
                ? `${result.enqueued} track(s) enqueued via ${provider}. ${variationMsg} — takes 30-90 seconds per track.`
                : `No tracks enqueued. ${result.skipped} skipped (check tier limits or track status).`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Bulk Poll Status ---
      {
        name: 'musicmation_bulk_poll_status',
        label: 'Bulk Poll Status',
        description:
          'Poll generation status for multiple tracks at once. Returns status summary ' +
          'and details for each track. Use after musicmation_bulk_generate.',

        parameters: {
          type: 'object',
          properties: {
            track_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of track IDs to poll',
              maxItems: 20,
            },
          },
          required: ['track_ids'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const trackIds = params.track_ids as string[]
            if (!trackIds.length) {
              return jsonResult({ error: 'track_ids array is empty' })
            }

            // Fetch all tracks in one query
            const tracks = await client.query<Track[]>('sunoma_items', {
              'id': `in.(${trackIds.join(',')})`,
              'select': 'id,title,status,audio_url,image_url,duration_sec,generation_source',
            })

            const trackMap = new Map((tracks || []).map(t => [t.id, t]))

            // Fetch all variations for completed tracks
            const completedIds = (tracks || [])
              .filter(t => t.status === 'COMPLETE')
              .map(t => t.id)

            let variationMap = new Map<string, Track[]>()
            if (completedIds.length > 0) {
              const variations = await client.query<Track[]>('sunoma_items', {
                'parent_id': `in.(${completedIds.join(',')})`,
                'item_type': 'eq.variation',
                'select': 'id,title,status,audio_url,image_url,duration_sec,variation_index,parent_id',
                'order': 'variation_index.asc',
              })
              for (const v of (variations || [])) {
                const parentId = (v as unknown as Record<string, unknown>).parent_id as string
                if (!variationMap.has(parentId)) variationMap.set(parentId, [])
                variationMap.get(parentId)!.push(v)
              }
            }

            // Build per-track results
            const results = trackIds.map(id => {
              const track = trackMap.get(id)
              if (!track) return { track_id: id, status: 'not_found' }

              const status = (track.status || 'unknown').toLowerCase()
              const variations = variationMap.get(id) || []

              return {
                track_id: id,
                title: track.title,
                status,
                ...(status === 'complete' ? {
                  audio_url: track.audio_url,
                  image_url: track.image_url,
                  duration_sec: track.duration_sec,
                  variations: variations.map(v => ({
                    id: v.id,
                    title: v.title,
                    audio_url: v.audio_url,
                    image_url: v.image_url,
                    listen_url: `${config.contentDomain}/details/${v.id}`,
                  })),
                  listen_url: `${config.contentDomain}/details/${id}`,
                } : {}),
              }
            })

            const completed = results.filter(r => r.status === 'complete').length
            const generating = results.filter(r => r.status === 'generating').length
            const queued = results.filter(r => r.status === 'queued').length

            return jsonResult({
              summary: {
                total: trackIds.length,
                completed,
                generating,
                queued,
                all_done: completed === trackIds.length,
              },
              tracks: results,
              message: completed === trackIds.length
                ? `All ${completed} tracks complete!`
                : `${completed}/${trackIds.length} done, ${generating} generating, ${queued} queued...`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },
    ] as AgentTool[]
  })
}
