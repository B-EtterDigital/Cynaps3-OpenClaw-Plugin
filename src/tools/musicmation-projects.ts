/**
 * Musicmation Project Tools
 *
 * Tools for managing projects and project-context mappings:
 * - musicmation_list_projects
 * - musicmation_create_project
 * - musicmation_update_project
 * - musicmation_delete_project (triple confirmation required)
 * - musicmation_get_project_context
 * - musicmation_set_project_context
 */

import type { OpenClawPluginApi, CynapsConfig, AgentTool, Project, ProjectContext } from '../core/types.js'
import { CynapsApiClient } from '../core/api-client.js'
import { CynapsApiError, wrapError } from '../core/errors.js'
import { pick } from '../core/pick.js'
import { jsonResult } from '../core/result.js'

// Default gradients per content type so agent-created projects look styled
const GRADIENT_BY_TYPE: Record<string, string> = {
  music: 'linear(to-r, #f97316, #ea580c, #dc2626)',
  instrumental: 'linear(to-r, #1e3a8a, #1e40af, #0c4a6e)',
  meditation: 'linear(to-r, #667eea, #764ba2, #5b3a8f)',
  solfeggio: 'linear(to-r, #155e75, #0891b2, #0e7490)',
  nature_ambient: 'linear(to-r, #065f46, #047857, #064e3b)',
  pop: 'linear(to-r, #ec4899, #db2777, #be185d)',
  rock: 'linear(to-r, #7f1d1d, #991b1b, #881337)',
  hip_hop: 'linear(to-r, #fbbf24, #f59e0b, #d97706)',
  rnb: 'linear(to-r, #a855f7, #9333ea, #7e22ce)',
  electronic: 'linear(to-r, #0ea5e9, #0284c7, #0369a1)',
  jazz: 'linear(to-r, #ea580c, #c2410c, #9a3412)',
  classical: 'linear(to-r, #4f46e5, #4338ca, #3730a3)',
  lo_fi: 'linear(to-r, #14b8a6, #0d9488, #0f766e)',
  synthwave: 'linear(to-r, #d946ef, #c026d3, #a21caf)',
  soundtrack: 'linear(to-r, #475569, #334155, #1e293b)',
  soundstage: 'linear(to-r, #db2777, #be185d, #9f1239)',
}
const FALLBACK_GRADIENT = 'linear(to-r, #1e1b4b, #312e81, #1e3a8a)'

export function registerMusicmationProjectTools(api: OpenClawPluginApi, config: CynapsConfig): void {
  api.registerTool((ctx) => {
    const client = CynapsApiClient.fromContext(config, ctx)

    return [
      // --- List Projects ---
      {
        name: 'musicmation_list_projects',
        label: 'List Projects',
        description:
          'List the user\'s projects. Returns id, name, content_type, description, created_at. ' +
          'Auto-scoped to owner by the server.',

        parameters: { type: 'object', properties: {}, additionalProperties: false },

        async execute(_id: string, _params: Record<string, unknown>) {
          try {
            const projects = await client.query<Project[]>('sunoma_projects', {
              'select': 'id,name,content_type,description,created_at',
              'order': 'created_at.desc',
            })
            return jsonResult({ projects: projects || [], count: (projects || []).length })
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Create Project ---
      {
        name: 'musicmation_create_project',
        label: 'Create Project',
        description:
          'Create a new project. Server enforces tier limits. ' +
          'Generates ID client-side (proj_{timestamp}_{hex}).',

        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name', maxLength: 200 },
            content_type: { type: 'string', description: 'Content type (e.g., "music", "podcast", "audiobook")', maxLength: 50 },
            description: { type: 'string', description: 'Project description', maxLength: 500 },
            header_gradient: { type: 'string', description: 'Optional Chakra bgGradient value, e.g. "linear(to-r, #f97316, #ea580c, #dc2626)". Auto-assigned from content_type if omitted.' },
          },
          required: ['name', 'content_type'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const timestamp = Math.floor(Date.now() / 1000)
            const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
              .map(b => b.toString(16).padStart(2, '0')).join('')
            const generatedId = `proj_${timestamp}_${hex}`

            const contentType = params.content_type as string
            const gradient = (params.header_gradient as string) ||
              GRADIENT_BY_TYPE[contentType] || FALLBACK_GRADIENT

            const projects = await client.query<Project[]>('sunoma_projects', undefined, {
              method: 'POST',
              body: {
                id: generatedId,
                name: params.name as string,
                content_type: contentType,
                description: (params.description as string) || null,
                header_gradient: gradient,
              },
            })

            const project = projects?.[0]
            if (!project) {
              throw new CynapsApiError('Failed to create project — no ID returned', 500, 'CREATE_FAILED')
            }

            return jsonResult({
              project,
              message: `Project "${params.name}" created successfully.`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Update Project ---
      {
        name: 'musicmation_update_project',
        label: 'Update Project',
        description:
          'Update an existing project. Can change name, description, content_type, copyright, ' +
          'header_gradient, or artwork_url. Only provided fields are updated.',

        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID to update' },
            name: { type: 'string', description: 'New project name', maxLength: 200 },
            description: { type: 'string', description: 'New project description', maxLength: 500 },
            content_type: {
              type: 'string',
              description: 'Content type',
              enum: ['meditation', 'music_track', 'instrumental', 'nature_ambient', 'soundstage', 'solfeggio', '8bit_chiptune', 'drum_and_bass'],
            },
            copyright: { type: 'string', description: 'Copyright notice', maxLength: 200 },
            header_gradient: { type: 'string', description: 'Chakra bgGradient value' },
            artwork_url: { type: 'string', description: 'Project artwork/cover image URL' },
          },
          required: ['project_id'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const projectId = params.project_id as string
            const body: Record<string, unknown> = {}

            for (const key of ['name', 'description', 'content_type', 'copyright', 'header_gradient', 'artwork_url']) {
              if (params[key] !== undefined) body[key] = params[key]
            }

            if (Object.keys(body).length === 0) {
              return jsonResult({ message: 'No fields to update.' })
            }

            // Auto-assign gradient when content_type changes and no explicit gradient given
            if (body.content_type && !body.header_gradient) {
              body.header_gradient = GRADIENT_BY_TYPE[body.content_type as string] || FALLBACK_GRADIENT
            }

            const projects = await client.query<Project[]>('sunoma_projects', {
              id: `eq.${projectId}`,
            }, {
              method: 'PATCH',
              body,
            })

            const project = projects?.[0]
            return jsonResult({
              project: project || { id: projectId },
              message: `Project updated successfully.`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Get Project Context ---
      {
        name: 'musicmation_get_project_context',
        label: 'Get Project Context',
        description:
          'Get the user\'s project-context mappings. Returns rules for auto-selecting projects ' +
          'based on keywords and a default_project_id.',

        parameters: { type: 'object', properties: {}, additionalProperties: false },

        async execute(_id: string, _params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc<ProjectContext>('get-project-context'))
          } catch (err) { throw wrapError(err) }
        },
      },

      // --- Set Project Context ---
      {
        name: 'musicmation_set_project_context',
        label: 'Set Project Context',
        description:
          'Save project-context mappings. The agent builds the full context object from conversation ' +
          'and existing context, then saves it here. Includes rules (keyword-to-project mappings) ' +
          'and an optional default_project_id.',

        parameters: {
          type: 'object',
          properties: {
            context: {
              type: 'object',
              description: 'Full ProjectContext object: { default_project_id?, rules: [{ context, keywords, project_id, project_name }] }',
              properties: {
                default_project_id: { type: 'string' },
                rules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      context: { type: 'string' },
                      keywords: { type: 'array', items: { type: 'string' } },
                      project_id: { type: 'string' },
                      project_name: { type: 'string' },
                    },
                    required: ['context', 'keywords', 'project_id', 'project_name'],
                  },
                },
              },
              required: ['rules'],
            },
          },
          required: ['context'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            return jsonResult(await client.rpc('set-project-context',
              pick(params, ['context'])))
          } catch (err) { throw wrapError(err) }
        },
      },
      // --- Delete Project (triple confirmation required) ---
      {
        name: 'musicmation_delete_project',
        label: 'Delete Project',
        description:
          'DESTRUCTIVE: Permanently delete a project and ALL its content items (CASCADE). ' +
          'The agent MUST have obtained triple confirmation from the user before calling this: ' +
          '(1) warned about data loss with item count, (2) asked "are you sure?", ' +
          '(3) user typed back the exact project name. ' +
          'Pass confirm_name matching the project name exactly or the call is rejected.',

        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID to delete' },
            confirm_name: { type: 'string', description: 'User must type the exact project name to confirm deletion' },
          },
          required: ['project_id', 'confirm_name'],
          additionalProperties: false,
        },

        async execute(_id: string, params: Record<string, unknown>) {
          try {
            const projectId = params.project_id as string
            const confirmName = params.confirm_name as string

            // Fetch project to verify name match
            const projects = await client.query<Project[]>('sunoma_projects', {
              id: `eq.${projectId}`,
              select: 'id,name',
            })
            const project = projects?.[0]
            if (!project) {
              return jsonResult({ error: 'Project not found.', deleted: false })
            }

            // Triple-confirmation gate: confirm_name must match exactly
            if (project.name !== confirmName) {
              return jsonResult({
                error: `Confirmation name "${confirmName}" does not match project name "${project.name}". Deletion aborted.`,
                deleted: false,
                hint: 'Ask the user to type the exact project name to confirm.',
              })
            }

            // Perform the delete — CASCADE will remove all items
            await client.query('sunoma_projects', {
              id: `eq.${projectId}`,
            }, { method: 'DELETE' })

            return jsonResult({
              deleted: true,
              message: `Project "${project.name}" and all its content have been permanently deleted.`,
            })
          } catch (err) { throw wrapError(err) }
        },
      },
    ] as AgentTool[]
  })
}
