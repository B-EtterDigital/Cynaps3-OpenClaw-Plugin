/**
 * Musicmation Content Management Tools
 *
 * CRUD operations for content items (tracks, rows in the content screen):
 * - musicmation_create_item
 * - musicmation_update_item
 */

import type { OpenClawPluginApi, CynapsConfig, AgentTool } from '../core/types.js'
import { CynapsApiClient } from '../core/api-client.js'
import { CynapsApiError, wrapError } from '../core/errors.js'
import { jsonResult } from '../core/result.js'

export function registerMusicmationContentTools(api: OpenClawPluginApi, config: CynapsConfig): void {
  api.registerTool((ctx) => {
    const client = CynapsApiClient.fromContext(config, ctx)

    return [
      // --- Create Item ---
      {
        name: 'musicmation_create_item',
        label: 'Create Content Item',
        description:
          'Add a new content item (track row) to a project. ' +
          'Generates ID client-side (item_{timestamp}_{hex}). ' +
          'Auto-scoped to owner by the server.',

        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Item title', maxLength: 200 },
            project_id: { type: 'string', description: 'Project ID to add the item to' },
            item_type: { type: 'string', description: 'Item type (default: "track")', default: 'track' },
            status: { type: 'string', description: 'Item status (default: "draft")', default: 'draft' },
            transcript: { type: 'string', description: 'Lyrics or transcript text', maxLength: 5000 },
            copyright: { type: 'string', description: 'Copyright notice', maxLength: 200 },
            artist: { type: 'string', description: 'Artist name', maxLength: 200 },
            composer: { type: 'string', description: 'Composer name', maxLength: 200 },
            genre: { type: 'string', description: 'Genre tag', maxLength: 100 },
            mood: { type: 'string', description: 'Mood tag', maxLength: 100 },
            tone: { type: 'string', description: 'Tone descriptor', maxLength: 100 },
            instrument: { type: 'string', description: 'Primary instrument', maxLength: 100 },
            album: { type: 'string', description: 'Album name', maxLength: 200 },
            style_d: { type: 'string', description: 'Style slot 1', maxLength: 200 },
            style_e: { type: 'string', description: 'Style slot 2', maxLength: 200 },
            style_f: { type: 'string', description: 'Style slot 3', maxLength: 200 },
            sub_cluster: { type: 'string', description: 'Sub-cluster grouping', maxLength: 100 },
            type: { type: 'string', description: 'Content type classification', maxLength: 100 },
            series_name: { type: 'string', description: 'Series name', maxLength: 200 },
            part: { type: 'string', description: 'Part identifier', maxLength: 50 },
            short_summary: { type: 'string', description: 'Brief summary', maxLength: 500 },
            transcript_draft: { type: 'string', description: 'Draft transcript', maxLength: 5000 },
            image_url: { type: 'string', description: 'Cover image URL' },
            audio_url: { type: 'string', description: 'Audio file URL' },
            generation_source: {
              type: 'string',
              enum: ['suno', 'sonauto'],
              description: 'Generation provider. Set this when creating items for bulk generation.',
            },
          },
          required: ['title', 'project_id'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const timestamp = Math.floor(Date.now() / 1000)
            const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
              .map(b => b.toString(16).padStart(2, '0')).join('')
            const generatedId = `item_${timestamp}_${hex}`

            const body: Record<string, unknown> = {
              id: generatedId,
              title: params.title as string,
              project_id: params.project_id as string,
              item_type: (params.item_type as string) || 'track',
              status: (params.status as string) || 'draft',
            }

            for (const key of [
              'transcript', 'transcript_draft', 'short_summary', 'copyright',
              'artist', 'composer', 'genre', 'mood', 'tone', 'instrument',
              'album', 'style_d', 'style_e', 'style_f', 'sub_cluster',
              'type', 'series_name', 'part', 'image_url', 'audio_url',
              'generation_source',
            ]) {
              if (params[key] !== undefined) body[key] = params[key]
            }

            const items = await client.query<Record<string, unknown>[]>('sunoma_items', undefined, {
              method: 'POST',
              body,
            })

            const item = items?.[0]
            if (!item) {
              throw new CynapsApiError('Failed to create item — no ID returned', 500, 'CREATE_FAILED')
            }

            return jsonResult({
              item,
              message: `Item "${params.title}" created successfully.`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Update Item ---
      {
        name: 'musicmation_update_item',
        label: 'Update Content Item',
        description:
          'Update any field on an existing content item. ' +
          'Only provided fields are updated. Can move items between projects by setting project_id. ' +
          'Auto-scoped to owner by the server.',

        parameters: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'Item ID to update' },
            project_id: { type: 'string', description: 'Move item to a different project by setting a new project ID' },
            title: { type: 'string', description: 'New title', maxLength: 200 },
            status: { type: 'string', description: 'New status' },
            transcript: { type: 'string', description: 'Lyrics or transcript text', maxLength: 5000 },
            transcript_draft: { type: 'string', description: 'Draft transcript (for editing before approval)', maxLength: 5000 },
            short_summary: { type: 'string', description: 'Brief summary of the item', maxLength: 500 },
            copyright: { type: 'string', description: 'Copyright notice', maxLength: 200 },
            artist: { type: 'string', description: 'Artist name', maxLength: 200 },
            composer: { type: 'string', description: 'Composer name', maxLength: 200 },
            genre: { type: 'string', description: 'Genre tag', maxLength: 100 },
            mood: { type: 'string', description: 'Mood tag', maxLength: 100 },
            tone: { type: 'string', description: 'Tone descriptor', maxLength: 100 },
            instrument: { type: 'string', description: 'Primary instrument', maxLength: 100 },
            album: { type: 'string', description: 'Album name', maxLength: 200 },
            style_d: { type: 'string', description: 'Style slot 1', maxLength: 200 },
            style_e: { type: 'string', description: 'Style slot 2', maxLength: 200 },
            style_f: { type: 'string', description: 'Style slot 3', maxLength: 200 },
            sub_cluster: { type: 'string', description: 'Sub-cluster grouping', maxLength: 100 },
            type: { type: 'string', description: 'Content type classification', maxLength: 100 },
            series_name: { type: 'string', description: 'Series name', maxLength: 200 },
            part: { type: 'string', description: 'Part identifier (e.g. "Part 1")', maxLength: 50 },
            image_url: { type: 'string', description: 'Cover image URL' },
            audio_url: { type: 'string', description: 'Audio file URL' },
            rating: { type: 'number', description: 'Rating 1-10', minimum: 1, maximum: 10 },
            shortlisted: { type: 'boolean', description: 'Whether the item is shortlisted' },
            selected_for_upload: { type: 'boolean', description: 'Whether the item is selected for upload' },
            done_flag: { type: 'boolean', description: 'Whether the item is marked done' },
          },
          required: ['item_id'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const itemId = params.item_id as string
            const body: Record<string, unknown> = {}

            const updatableFields = [
              'project_id', 'title', 'status', 'transcript', 'transcript_draft',
              'short_summary', 'copyright', 'artist', 'composer', 'genre', 'mood',
              'tone', 'instrument', 'album', 'style_d', 'style_e', 'style_f',
              'sub_cluster', 'type', 'series_name', 'part',
              'image_url', 'audio_url', 'rating',
              'shortlisted', 'selected_for_upload', 'done_flag',
            ]

            for (const key of updatableFields) {
              if (params[key] !== undefined) body[key] = params[key]
            }

            if (Object.keys(body).length === 0) {
              return jsonResult({ message: 'No fields to update.' })
            }

            const items = await client.query<Record<string, unknown>[]>('sunoma_items', {
              id: `eq.${itemId}`,
            }, {
              method: 'PATCH',
              body,
            })

            const item = items?.[0]
            return jsonResult({
              item: item || { id: itemId },
              message: `Item updated successfully.`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },
    ] as AgentTool[]
  })
}
