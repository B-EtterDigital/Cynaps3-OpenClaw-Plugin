/** Wrap a payload into the OpenClaw AgentToolResult format */
export function jsonResult(payload: unknown): { content: Array<{ type: 'text'; text: string }>; details: unknown } {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    details: payload,
  }
}
