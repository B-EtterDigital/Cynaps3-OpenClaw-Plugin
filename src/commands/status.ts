/**
 * cynaps3-status — Auto-reply command that shows account overview.
 *
 * Bypasses the LLM agent entirely — returns formatted status directly.
 * Invoked via "/cynaps3-status" in any channel.
 */

import type { CynapsConfig, PreflightResult } from '../core/types.js'
import { CynapsApiClient } from '../core/api-client.js'

export function createStatusCommand(config: CynapsConfig) {
  return {
    name: 'cynaps3-status',
    description: 'Show Cynaps3 account status, tier, credits, and daily usage',
    acceptsArgs: false,
    requireAuth: true,

    async handler(): Promise<{ text: string }> {
      try {
        const client = new CynapsApiClient(config)
        const result = await client.rpc<PreflightResult>('preflight')
        return { text: formatStatus(result) }
      } catch {
        return { text: 'Could not fetch status. Please try again.' }
      }
    },
  }
}

function formatStatus(pf: PreflightResult): string {
  const c = pf.checks
  const lines: string[] = [
    '**Cynaps3 Status**',
    '',
    `Tier: **${c.tier}**`,
    `API Key: ${c.suno_api_key ? 'Configured' : 'Missing'}`,
  ]

  if (c.credits_available !== null) {
    lines.push(`Credits: **${c.credits_available}**`)
  }

  lines.push(`Daily Usage: **${c.daily_used}/${c.daily_limit}**`)
  lines.push('')

  if (pf.ready) {
    lines.push('Status: Ready')
  } else {
    lines.push('**Issues:**')
    for (const action of pf.actions_needed) {
      lines.push(`- ${action.issue}: ${action.message}`)
      if (action.instructions) {
        lines.push(`  ${action.instructions}`)
      }
    }
  }

  return lines.join('\n')
}
