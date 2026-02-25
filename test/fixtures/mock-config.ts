import type { CynapsConfig } from '../../src/core/types.js'

export const MOCK_CONFIG: CynapsConfig = {
  supabaseUrl: 'https://test-project.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key',
  userId: 'user_test_123',
  contentDomain: 'https://content.7cycle.life',
  enabledModules: ['musicmation'],
}

export const MOCK_RAW_CONFIG: Record<string, unknown> = {
  supabaseUrl: 'https://test-project.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key',
  userId: 'user_test_123',
  enabledModules: ['musicmation'],
}
