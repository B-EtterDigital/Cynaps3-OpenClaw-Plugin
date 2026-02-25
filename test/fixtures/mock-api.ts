import type {
  OpenClawPluginApi, AgentTool, OpenClawPluginToolFactory, OpenClawPluginToolContext,
  ServiceDefinition, CommandDefinition, ToolRegisterOpts,
} from '../../src/core/types.js'

/** Default mock tool context simulating the OpenClaw runtime */
const MOCK_TOOL_CONTEXT: OpenClawPluginToolContext = {
  agentId: 'test-agent',
  workspaceDir: '/tmp/test-workspace',
  sandboxed: false,
}

/**
 * Mock OpenClawPluginApi that captures all registrations for testing.
 * Handles both static tools and tool factories (invokes factories with MOCK_TOOL_CONTEXT).
 */
export function createMockPluginAPI(pluginConfigOverrides?: Record<string, unknown>): MockPluginAPI {
  return new MockPluginAPI(pluginConfigOverrides)
}

export class MockPluginAPI implements OpenClawPluginApi {
  config: Record<string, unknown>
  pluginConfig?: Record<string, unknown>
  tools: AgentTool[] = []
  services: ServiceDefinition[] = []
  commands: CommandDefinition[] = []

  constructor(pluginConfig?: Record<string, unknown>) {
    this.config = {}
    this.pluginConfig = pluginConfig ?? {
      supabaseUrl: 'https://test-project.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key',
      serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key',
      userId: 'user_test_123',
      contentDomain: 'https://content.7cycle.life',
      enabledModules: ['musicmation'],
    }
  }

  registerTool(tool: AgentTool | OpenClawPluginToolFactory, _opts?: ToolRegisterOpts): void {
    if (typeof tool === 'function') {
      // Tool factory — invoke with mock context
      const result = tool(MOCK_TOOL_CONTEXT)
      if (Array.isArray(result)) {
        this.tools.push(...result)
      } else if (result) {
        this.tools.push(result)
      }
    } else {
      this.tools.push(tool)
    }
  }

  registerService(def: ServiceDefinition): void {
    this.services.push(def)
  }

  registerCommand(def: CommandDefinition): void {
    this.commands.push(def)
  }

  /** Find a registered tool by name */
  getTool(name: string): AgentTool | undefined {
    return this.tools.find((t) => t.name === name)
  }

  /** Find a registered service by id */
  getService(id: string): ServiceDefinition | undefined {
    return this.services.find((s) => s.id === id)
  }

  /** Find a registered command by name */
  getCommand(name: string): CommandDefinition | undefined {
    return this.commands.find((c) => c.name === name)
  }
}
