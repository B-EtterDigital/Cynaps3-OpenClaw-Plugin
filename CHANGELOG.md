# Changelog

All notable changes to `@cynaps3/openclaw-plugin` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-02-25

### Added

- **26 agent tools** across 6 categories: core, generation, library, write, projects, content
- **Dual-provider generation**: Suno (2 variations per call) and Sonauto (1 song, fixed 100 credits)
- **Bulk pipeline**: `musicmation_bulk_generate` + `musicmation_bulk_poll_status` for batch generation of up to 20 tracks
- **Project management**: create, update, delete (triple-confirm), list, context mappings
- **Content management**: `musicmation_create_item` and `musicmation_update_item` for direct row CRUD
- **Library tools**: search, browse 150+ styles, influence groups, recommendations, personas, top-rated, stats
- **Write tools** with autonomy-gated confirmation tokens: rate, album, dramaturgy, bulk rename
- **AI lyrics generation** via `musicmation_generate_lyrics` with multi-language support
- **Generation poller** background service — monitors queue, detects completions via set-based eviction
- **`/cynaps3-status`** auto-reply command for diagnostics
- **2 bundled skills**: `cynaps3-core` (agent baseline) and `musicmation` (full pipeline playbook)
- **Thin client / fat server** architecture — zero security enforcement in plugin; auth, tier limits, rate limits, and ownership scoping all in Supabase edge functions
- **240 tests** (vitest) covering config, types, errors, registry, schemas, handler behavior, poller lifecycle, plugin integration
- **Full TypeScript** with strict mode, shipped `.d.ts` declarations
- **OpenClaw plugin manifest** (`openclaw.plugin.json`) with config schema and UI hints
