/**
 * Musicmation Write Tools
 *
 * Tools that modify user data. All gated by the autonomy system
 * (confirmation tokens for suggest/ask levels).
 *
 * - musicmation_rate_tracks
 * - musicmation_create_album
 * - musicmation_set_dramaturgy
 * - musicmation_bulk_rename
 */

import type { OpenClawPluginApi, CynapsConfig, AgentTool } from '../core/types.js'
import { isConfirmationResponse } from '../core/types.js'
import { CynapsApiClient } from '../core/api-client.js'
import { wrapError } from '../core/errors.js'
import { pick } from '../core/pick.js'
import { jsonResult } from '../core/result.js'

export function registerMusicmationWriteTools(api: OpenClawPluginApi, config: CynapsConfig): void {
  api.registerTool((ctx) => {
    const client = CynapsApiClient.fromContext(config, ctx)

    return [
      // --- Rate Tracks ---
      {
        name: 'musicmation_rate_tracks',
        label: 'Rate Tracks',
        description:
          'Rate one or more tracks (1-5). May require user confirmation depending on autonomy settings. ' +
          'If confirmation_required is returned, present the action to the user and call again with the token.',

        parameters: {
          type: 'object',
          properties: {
            ratings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  track_id: { type: 'string' },
                  rating: { type: 'number', minimum: 1, maximum: 5 },
                  feedback: { type: 'string' },
                },
                required: ['track_id', 'rating'],
                additionalProperties: false,
              },
              description: 'Array of { track_id, rating (1-5), feedback? }',
            },
            confirmation_token: {
              type: 'string',
              description: 'Token from a previous confirmation_required response',
            },
          },
          required: ['ratings'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const result = await client.rpc('rate-tracks',
              pick(params, ['ratings', 'confirmation_token']))

            if (isConfirmationResponse(result)) {
              return jsonResult({
                ...result,
                instruction: 'Present this action to the user. Call again with the confirmation_token when approved.',
              })
            }
            return jsonResult(result)
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Create Album ---
      {
        name: 'musicmation_create_album',
        label: 'Create Album',
        description:
          'Create an album from selected tracks. May require user confirmation. ' +
          'If confirmation_required is returned, present to user and call again with token.',

        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Album title' },
            track_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Track UUIDs to include (in order)',
            },
            project_id: { type: 'string' },
            genre: { type: 'string' },
            description: { type: 'string' },
            confirmation_token: { type: 'string' },
          },
          required: ['title', 'track_ids'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const result = await client.rpc('create-album',
              pick(params, ['title', 'track_ids', 'project_id', 'genre', 'description', 'confirmation_token']))

            if (isConfirmationResponse(result)) {
              return jsonResult({
                ...result,
                instruction: 'Present this album creation to the user. Call again with the confirmation_token when approved.',
              })
            }
            return jsonResult(result)
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Set Dramaturgy ---
      {
        name: 'musicmation_set_dramaturgy',
        label: 'Set Dramaturgy',
        description:
          'Set track order, energy curve, and mood arc for an album. ' +
          'May require user confirmation.',

        parameters: {
          type: 'object',
          properties: {
            album_id: { type: 'string', description: 'Album UUID' },
            tracks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  track_id: { type: 'string' },
                  order: { type: 'number', minimum: 1 },
                  energy: { type: 'number', minimum: 1, maximum: 10 },
                  mood_level: { type: 'number', minimum: 1, maximum: 10 },
                  voice_type: { type: 'string' },
                  title: { type: 'string' },
                },
                required: ['track_id', 'order'],
                additionalProperties: false,
              },
            },
            confirmation_token: { type: 'string' },
          },
          required: ['album_id', 'tracks'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const result = await client.rpc('set-dramaturgy',
              pick(params, ['album_id', 'tracks', 'confirmation_token']))

            if (isConfirmationResponse(result)) {
              return jsonResult({
                ...result,
                instruction: 'Present this dramaturgy plan to the user. Call again with the confirmation_token when approved.',
              })
            }
            return jsonResult(result)
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Bulk Rename ---
      {
        name: 'musicmation_bulk_rename',
        label: 'Bulk Rename Tracks',
        description:
          'Rename multiple tracks at once. May require user confirmation.',

        parameters: {
          type: 'object',
          properties: {
            renames: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Track UUID' },
                  new_title: { type: 'string', description: 'New track title' },
                },
                required: ['id', 'new_title'],
                additionalProperties: false,
              },
            },
            confirmation_token: { type: 'string' },
          },
          required: ['renames'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const result = await client.rpc('bulk-rename-tracks',
              pick(params, ['renames', 'confirmation_token']))

            if (isConfirmationResponse(result)) {
              return jsonResult({
                ...result,
                instruction: 'Present these renames to the user. Call again with the confirmation_token when approved.',
              })
            }
            return jsonResult(result)
          } catch (err) { throw wrapError(err) }
        },
      },
    ] as AgentTool[]
  })
}
