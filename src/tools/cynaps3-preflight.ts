/**
 * cynaps3_preflight — Cross-module readiness check.
 *
 * Verifies: authentication, API key presence, credit balance,
 * tier limits, daily usage, and autonomy settings.
 * Must be called before any generation operation.
 */

import type { OpenClawPluginApi, CynapsConfig, PreflightResult } from '../core/types.js'
import { CynapsApiClient } from '../core/api-client.js'
import { wrapError } from '../core/errors.js'
import { jsonResult } from '../core/result.js'

export function registerPreflightTool(api: OpenClawPluginApi, config: CynapsConfig): void {
  api.registerTool((ctx) => {
    const client = CynapsApiClient.fromContext(config, ctx)

    return {
      name: 'cynaps3_preflight',
      label: 'Preflight Check',
      description:
        'Check readiness before any generation. Returns API key status, credit balance, ' +
        'tier info, daily usage, and autonomy settings. Always call this first.',

      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },

      async execute(_id: string, _params: Record<string, unknown>) {
        try {
          return jsonResult(await client.rpc<PreflightResult>('preflight'))
        } catch (err) {
          throw wrapError(err)
        }
      },
    }
  })
}
