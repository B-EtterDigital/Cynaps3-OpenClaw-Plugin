/**
 * Cynaps3 OpenClaw Plugin — Shared Type Definitions
 *
 * Every interface here mirrors a server-side contract.
 * Changes to edge function responses must be reflected here.
 *
 * Types marked @public are exported for consumer use even if
 * not referenced internally by the plugin itself.
 */

// ─── Plugin Config ──────────────────────────────────────────────────

export interface CynapsConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  serviceRoleKey: string
  userId: string
  contentDomain: string
  enabledModules: CynapsModule[]
  /** OpenClaw agent ID (e.g. 'flow', 'pete'). Sent as X-Agent-Id header
   *  so the server can attribute actions to specific agents/sub-agents. */
  agentId?: string
}

export type CynapsModule = 'musicmation' | 'storymation' | 'skillmation' | 'contentmation'

export type AutonomyLevel = 'auto' | 'suggest' | 'ask' | 'forbidden'

// ─── API Types ──────────────────────────────────────────────────────

/** Standard error shape from edge functions */
export interface ApiErrorBody {
  error: string
  code?: string
  errorId?: string
}

// ─── Preflight ──────────────────────────────────────────────────────

export interface PreflightResult {
  ready: boolean
  checks: {
    authenticated: boolean
    suno_api_key: boolean
    sonauto_api_key: boolean
    credits_available: number | null
    sonauto_credits_available: number | null
    tier: string
    daily_used: number
    daily_used_suno: number
    daily_used_sonauto: number
    daily_limit: number
  }
  actions_needed: PreflightAction[]
  autonomy: Record<string, AutonomyLevel>
  agent_visibility: Record<string, boolean>
  projects_summary?: Array<{ id: string; name: string; content_type: string }>
}

export interface PreflightAction {
  issue: string
  message: string
  action_url?: string
  instructions?: string
}

// ─── Tracks ─────────────────────────────────────────────────────────

export interface Track {
  id: string
  title: string
  audio_url: string | null
  image_url: string | null
  duration: number | null
  duration_sec?: number | null
  detected_bpm: number | null
  detected_key: string | null
  tags_mood: string[] | null
  tags_genre: string[] | null
  tags_energy_level: string | null
  rating: number | null
  style_label: string | null
  short_summary: string | null
  status: string
  created_at: string
  project_id?: string
  parent_id?: string | null
  item_type?: string
  variation_index?: number | null
  generation_source?: string | null
}

// ─── Search ─────────────────────────────────────────────────────────

export interface SearchResult {
  tracks: Track[]
  count: number
}

// ─── Styles ─────────────────────────────────────────────────────────

export interface ArtistStyle {
  id: string
  name: string
  category: string
  subcategory?: string
  tags?: string[]
  era?: string
  description?: string
  stylePrompt?: string
}

export interface BrowseStylesResult {
  styles: ArtistStyle[]
  count: number
  categories?: Array<{ id: string; label: string }>
  total_available?: number
  mode: 'browse' | 'detail'
}

// ─── Generation ─────────────────────────────────────────────────────

export interface EnqueueResult {
  success: boolean
  enqueued: number
  skipped: number
  total: number
  tier: string
}

// ─── Confirmation ───────────────────────────────────────────────────

export interface ConfirmationResponse {
  confirmation_required: true
  autonomy_level: AutonomyLevel
  capability: string
  confirmation_token: string
  expires_in: number
  message: string
}

export function isConfirmationResponse(v: unknown): v is ConfirmationResponse {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as Record<string, unknown>).confirmation_required === true
  )
}

// ─── Projects ────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  content_type: string
  description?: string
  owner_id: string
  copyright?: string
  artwork_url?: string
  header_gradient?: string
  settings?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProjectContextRule {
  context: string
  keywords: string[]
  project_id: string
  project_name: string
}

export interface ProjectContext {
  default_project_id?: string
  rules: ProjectContextRule[]
}

// ─── Library Stats ──────────────────────────────────────────────────

export interface LibraryStats {
  total_tracks: number
  genres: Record<string, number>
  moods: Record<string, number>
  avg_bpm: number | null
  top_keys: string[]
  energy_distribution: Record<string, number>
  recent_5: Array<{
    id: string
    title: string
    genre: string | null
    mood: string | null
    created_at: string
  }>
}

// ─── OpenClaw SDK Types (matching real contract) ────────────────────

/** Context passed by the OpenClaw runtime when resolving tool factories.
 *  `agentId` is auto-resolved from the active session — no config needed. */
export interface OpenClawPluginToolContext {
  config?: Record<string, unknown>
  workspaceDir?: string
  agentDir?: string
  agentId?: string
  sessionKey?: string
  messageChannel?: string
  agentAccountId?: string
  sandboxed?: boolean
}

/** Factory function that creates tools with per-session context (e.g. agentId). */
export type OpenClawPluginToolFactory = (
  ctx: OpenClawPluginToolContext,
) => AgentTool | AgentTool[] | null | undefined

export interface OpenClawPluginApi {
  config: Record<string, unknown>
  pluginConfig?: Record<string, unknown>
  logger?: {
    info(msg: string, ...args: unknown[]): void
    warn(msg: string, ...args: unknown[]): void
    error(msg: string, ...args: unknown[]): void
  }
  registerTool(tool: AgentTool | OpenClawPluginToolFactory, opts?: ToolRegisterOpts): void
  registerCommand(def: CommandDefinition): void
  registerService?(def: ServiceDefinition): void
}

export interface AgentTool {
  name: string
  label: string
  description: string
  parameters: Record<string, unknown>
  execute(toolCallId: string, params: Record<string, unknown>): Promise<AgentToolResult>
}

export interface AgentToolResult {
  content: Array<{ type: 'text'; text: string }>
  details?: unknown
}

export interface ToolRegisterOpts {
  name?: string
  names?: string[]
  optional?: boolean
}

export interface ServiceDefinition {
  id: string
  start(): void
  stop(): void
}

export interface CommandDefinition {
  name: string
  description: string
  acceptsArgs: boolean
  requireAuth: boolean
  handler(ctx: CommandContext): Promise<{ text: string }>
}

export interface CommandContext {
  args?: string
}
