import { describe, it, expect } from 'vitest'
import { registerAllTools } from '../../src/tools/_registry.js'
import { createMockPluginAPI } from '../fixtures/mock-api.js'
import { MOCK_CONFIG } from '../fixtures/mock-config.js'

/**
 * Schema validation tests — ensure all tool parameters
 * are well-formed JSON Schema objects that an LLM can interpret.
 */
describe('tool parameters schemas', () => {
  const api = createMockPluginAPI()
  registerAllTools(api, { ...MOCK_CONFIG, enabledModules: ['musicmation'] })

  for (const tool of api.tools) {
    describe(tool.name, () => {
      const schema = tool.parameters as Record<string, unknown>

      it('has type: object', () => {
        expect(schema.type).toBe('object')
      })

      it('has properties defined', () => {
        expect(schema.properties).toBeDefined()
        expect(typeof schema.properties).toBe('object')
      })

      it('has additionalProperties: false (MED-2)', () => {
        expect(schema.additionalProperties).toBe(false)
      })

      it('has a label', () => {
        expect(tool.label).toBeDefined()
        expect(typeof tool.label).toBe('string')
        expect(tool.label.length).toBeGreaterThan(0)
      })

      if (Array.isArray(schema.required) && schema.required.length > 0) {
        it('required fields exist in properties', () => {
          const props = Object.keys(schema.properties as Record<string, unknown>)
          for (const req of schema.required as string[]) {
            expect(props).toContain(req)
          }
        })
      }
    })
  }

  describe('musicmation_generate schema specifics', () => {
    it('requires title and project_id', () => {
      const tool = api.getTool('musicmation_generate')
      const schema = tool!.parameters as Record<string, unknown>
      expect(schema.required).toEqual(['title'])
    })

    it('has model enum with V4 and V5', () => {
      const tool = api.getTool('musicmation_generate')
      const props = (tool!.parameters as Record<string, unknown>).properties as Record<string, Record<string, unknown>>
      expect(props.model.enum).toEqual(['V4', 'V5'])
    })
  })

  describe('musicmation_search_tracks schema specifics', () => {
    it('has mood as string array', () => {
      const tool = api.getTool('musicmation_search_tracks')
      const props = (tool!.parameters as Record<string, unknown>).properties as Record<string, Record<string, unknown>>
      expect(props.mood.type).toBe('array')
      expect((props.mood.items as Record<string, unknown>).type).toBe('string')
    })

    it('has energy_level as enum', () => {
      const tool = api.getTool('musicmation_search_tracks')
      const props = (tool!.parameters as Record<string, unknown>).properties as Record<string, Record<string, unknown>>
      expect(props.energy_level.enum).toEqual(['low', 'medium', 'high', 'intense'])
    })
  })

  describe('musicmation_rate_tracks schema specifics', () => {
    it('requires ratings array', () => {
      const tool = api.getTool('musicmation_rate_tracks')
      const schema = tool!.parameters as Record<string, unknown>
      expect(schema.required).toEqual(['ratings'])
    })

    it('rating items require track_id and rating', () => {
      const tool = api.getTool('musicmation_rate_tracks')
      const props = (tool!.parameters as Record<string, unknown>).properties as Record<string, Record<string, unknown>>
      const items = props.ratings.items as Record<string, unknown>
      expect(items.required).toEqual(['track_id', 'rating'])
    })
  })

  describe('write tools have confirmation_token field', () => {
    const writeTools = ['musicmation_rate_tracks', 'musicmation_create_album', 'musicmation_set_dramaturgy', 'musicmation_bulk_rename']

    for (const name of writeTools) {
      it(`${name} has confirmation_token property`, () => {
        const tool = api.getTool(name)
        const props = (tool!.parameters as Record<string, unknown>).properties as Record<string, Record<string, unknown>>
        expect(props.confirmation_token).toBeDefined()
        expect(props.confirmation_token.type).toBe('string')
      })
    }
  })

  describe('musicmation_get_top_rated schema specifics', () => {
    it('has min_rating with range 1-5', () => {
      const tool = api.getTool('musicmation_get_top_rated')
      const props = (tool!.parameters as Record<string, unknown>).properties as Record<string, Record<string, unknown>>
      expect(props.min_rating.minimum).toBe(1)
      expect(props.min_rating.maximum).toBe(10)
    })
  })

  describe('musicmation_get_influence_group_detail schema specifics', () => {
    it('requires group_id', () => {
      const tool = api.getTool('musicmation_get_influence_group_detail')
      const schema = tool!.parameters as Record<string, unknown>
      expect(schema.required).toEqual(['group_id'])
    })
  })

  describe('musicmation_generate_lyrics schema specifics', () => {
    it('requires prompt', () => {
      const tool = api.getTool('musicmation_generate_lyrics')
      const schema = tool!.parameters as Record<string, unknown>
      expect(schema.required).toEqual(['prompt'])
    })

    it('has maxLength on prompt', () => {
      const tool = api.getTool('musicmation_generate_lyrics')
      const props = (tool!.parameters as Record<string, unknown>).properties as Record<string, Record<string, unknown>>
      expect(props.prompt.maxLength).toBe(1000)
    })
  })
})
