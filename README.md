# @cynaps3/openclaw-plugin

[![npm version](https://img.shields.io/npm/v/@cynaps3/openclaw-plugin)](https://www.npmjs.com/package/@cynaps3/openclaw-plugin)
[![license](https://img.shields.io/npm/l/@cynaps3/openclaw-plugin)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-240%20passed-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

### Augment your OpenClaw Agent with amazing Creative Cynaps3s — Crafted by Creatives for you!

```bash
openclaw plugins install @cynaps3/openclaw-plugin
```

---

## What Your Agent Can Do

Once installed, your OpenClaw agent becomes a **music production powerhouse**. These aren't toy demos — this is what real users do every day:

### Daily Rituals

- **"Create my morning meditation"** — Your agent generates a calming ambient track with solfeggio frequencies, saves it to your Meditation project, and has it ready before your coffee is done
- **"Make me something uplifting for my commute"** — It picks an energetic style, writes lyrics, generates 2 variations, and lets you choose your favorite
- **"Generate today's focus music"** — Lo-fi, ambient, or classical — your agent knows your preferences and delivers without asking

### Creative Sessions

- **"Produce a 10-track album about city nights"** — Your agent creates the project, names every track creatively, writes unique lyrics for each, bulk-generates all 10, then organizes them into an album with an energy curve
- **"Write me a standup comedy set"** — Comedy tracks with punchline timing, crowd reactions, and that open-mic energy *(beta quality — improving fast)*
- **"Create a synthwave EP in German"** — Multi-language lyrics, genre-specific styles, full album packaging
- **"Browse jazz styles and make something like Coltrane meets lo-fi"** — 150+ artist styles to blend and explore

### Library Management

- **"Clean up my library"** — Bulk rename tracks with creative titles, sort by mood, move between projects, rate everything 1-10
- **"Find my best tracks and make an album"** — Search by rating, mood, genre, energy — then package the hits
- **"Organize last week's generations"** — Your agent remembers what's unrated, unsorted, and unnamed

### Automation (with OpenClaw Heartbeat/Cron)

- **Wake up to fresh music** — Schedule daily generation: meditation at 6am, focus music at 9am, workout beats at 5pm
- **Weekly album drops** — Auto-generate themed albums every Friday from your highest-rated tracks of the week
- **Library health checks** — Periodic cleanup: flag unrated tracks, archive stale drafts, surface forgotten gems
- **Mood-based playlists** — Generate seasonal or time-of-day collections automatically

### What's Coming Next

- **Comicmation** — AI comic and visual storytelling — panel layouts, character consistency, speech bubbles, full issue generation
- **Storymation** — Interactive storytelling with branching narratives, character arcs, world-building, and voice-acted scenes
- **Skillmation** — Guided learning paths, adaptive exercises, skill trees for music theory and production
- **Contentmation** — Cross-platform publishing, release scheduling, distribution pipeline
- **Release tools** — One-click distribution prep, metadata formatting, cover art generation

**26 tools. 2 bundled skills. Dual-provider generation. And this is just the Musicmation module.**

---

### Limited Lifetime Deals

We're offering **limited lifetime deals** for early adopters during our launch phase. Lock in permanent access to all current and future Cynaps3 modules at a fraction of the subscription price — before we close the window.

Early supporters get lifetime access to Musicmation, Comicmation, Storymation, Skillmation, and Contentmation as they ship. No recurring fees. No upgrade costs. Ever.

Visit [cynaps3.io](https://cynaps3.io) to claim yours while they last.

---

## Technical Highlights

- **Dual-provider** — Suno (2 variations) or Sonauto (1 song) — the agent auto-selects or you choose
- **Bulk generate** up to 20 tracks in a single batch
- **150+ artist styles** across 15 categories (hip-hop, electronic, jazz, kpop, classical, and more)
- **AI lyrics** in any language via Suno's lyrics API, or agent-written for Sonauto
- **Project management** — organize tracks into projects with auto-context mappings
- **Library curation** — search, rate, recommend, create albums, set energy curves
- **Autonomy-gated writes** — destructive operations require user confirmation via signed tokens
- **Zero security enforcement client-side** — thin client / fat server, all rules enforced in Supabase edge functions

---

## Architecture

```
Plugin (this package)        --> Typed tools + auto-reply commands
Bundled Skills (skills/)     --> Agent playbooks (SKILL.md)
Edge Functions (server-side) --> All security enforcement
```

**Thin client / fat server.** The plugin is a typed interface layer. It sends authenticated requests to Supabase edge functions that enforce every rule: auth, credits, tier limits, rate limits, ownership scoping, and content moderation. The plugin itself has zero dependencies beyond TypeScript.

---

## Tools (26)

### Core

| Tool | Purpose |
|------|---------|
| `cynaps3_preflight` | Readiness check — auth, credits, tier, daily limits, provider keys |

### Generation (3)

| Tool | Purpose |
|------|---------|
| `musicmation_generate` | Create a track + enqueue generation (Suno: 2 variations, Sonauto: 1 song) |
| `musicmation_bulk_generate` | Enqueue multiple existing items at once (max 20) |
| `musicmation_bulk_poll_status` | Poll generation progress for multiple tracks |

### Library (10 read-only)

| Tool | Purpose |
|------|---------|
| `musicmation_search_tracks` | Search by mood, genre, energy, BPM, key, text |
| `musicmation_browse_styles` | Browse 150+ artist styles by category or query |
| `musicmation_library_stats` | Genre/mood breakdown, recent tracks |
| `musicmation_recommend` | Mood-based recommendations from the user's library |
| `musicmation_get_personas` | Voice and style personas |
| `musicmation_get_top_rated` | Highest-rated tracks with configurable threshold |
| `musicmation_browse_influence_groups` | Curated style reference sets |
| `musicmation_get_influence_group_detail` | Group members with weights |
| `musicmation_poll_status` | Poll single track generation progress |
| `musicmation_generate_lyrics` | AI lyrics via Suno (free, uses API key, no credits) |

### Projects (6)

| Tool | Purpose |
|------|---------|
| `musicmation_list_projects` | List user's projects |
| `musicmation_create_project` | Create a project with auto-styled gradients |
| `musicmation_update_project` | Update name, image, copyright, content type |
| `musicmation_delete_project` | Delete project + all items (triple confirmation required) |
| `musicmation_get_project_context` | Get auto-mapping rules for a project |
| `musicmation_set_project_context` | Save project-context mappings |

### Content Management (2)

| Tool | Purpose |
|------|---------|
| `musicmation_create_item` | Add a content item (track row) to a project |
| `musicmation_update_item` | Update any field on an existing item |

### Write — Autonomy-Gated (4)

| Tool | Purpose |
|------|---------|
| `musicmation_rate_tracks` | Rate tracks 1–10 with optional feedback |
| `musicmation_create_album` | Create album from selected tracks |
| `musicmation_set_dramaturgy` | Energy curve and mood arc for track ordering |
| `musicmation_bulk_rename` | Batch rename tracks |

Write tools use a **confirmation token flow**: call once to get a `confirmation_token`, present the action to the user, call again with the token to execute. Tokens expire after 5 minutes.

---

## Bundled Skills

Skills are agent playbooks (SKILL.md files) that tell the AI *when* and *how* to use the tools. They're auto-discovered by OpenClaw when the plugin is installed.

| Skill | Description |
|-------|-------------|
| `cynaps3-core` | Cross-module baseline — auth handling, preflight protocol, autonomy levels, error communication |
| `musicmation` | Full generation pipeline — single track (3-turn), bulk pipeline (3-turn), provider selection, decision guide, style categories, tag vocabulary |

---

## Dual-Provider Generation

Two music AI providers are supported:

| Aspect | Suno | Sonauto |
|--------|------|---------|
| Variations per call | 2 | 1 |
| Credits per song | Varies by model | 100 (fixed) |
| Style control | `weirdness` + `style_weight` | `prompt_strength` (0–5) |
| Models | V4, V5 | v3 |
| Output format | mp3 | mp3/flac/wav/ogg/m4a |
| Lyrics API | Yes (`musicmation_generate_lyrics`) | No (agent writes them) |
| Extend/Cover/Vocals | Yes | No |

The agent auto-selects the provider based on available API keys and user preference. Both providers go through the same pipeline and produce items in the same library.

---

## Modules

| Module | Status | What it unlocks |
|--------|--------|-----------------|
| **musicmation** | Live (25 tools) | Music generation, library management, albums, styles, lyrics, bulk ops |
| **comicmation** | In development | AI comics, panel layouts, character consistency, speech bubbles, full issues |
| **storymation** | In development | Branching narratives, character arcs, world-building, voice-acted scenes |
| **skillmation** | In development | Learning paths, practice exercises, adaptive difficulty, skill trees |
| **contentmation** | In development | Cross-platform publishing, release scheduling, distribution analytics |

Each module registers its own tools and ships its own skill playbook. Enable only what you need — the plugin loads cleanly with any combination.

---

## Configuration

After installing, configure the plugin in your OpenClaw settings:

```json
{
  "plugins": {
    "entries": {
      "cynaps3": {
        "enabled": true,
        "config": {
          "supabaseUrl": "https://your-project.supabase.co",
          "supabaseAnonKey": "eyJhbGci...",
          "serviceRoleKey": "eyJhbGci...",
          "userId": "user_...",
          "enabledModules": ["musicmation"]
        }
      }
    }
  }
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `supabaseUrl` | Yes | — | Supabase project URL |
| `supabaseAnonKey` | Yes | — | Supabase anon/public key (client-safe, not a secret) |
| `serviceRoleKey` | Yes | — | Service role key for server-to-server auth |
| `userId` | Yes | — | Clerk user ID for auth scoping |
| `contentDomain` | No | `https://content.7cycle.life` | Base URL for content links |
| `enabledModules` | No | `["musicmation"]` | Which modules to activate |
| `agentId` | No | Auto-detected | Override for agent identity |

---

## Installation

```bash
# Install from npm
openclaw plugins install @cynaps3/openclaw-plugin

# Or install locally for development
openclaw plugins install -l ./

# Verify
openclaw plugins list
openclaw plugins info cynaps3
```

---

## Development

```bash
# Install dependencies
pnpm install

# Build (TypeScript → dist/)
pnpm run build

# Run tests (240 tests, vitest)
pnpm run test

# Watch mode
pnpm run test:watch

# Type check only
pnpm run lint
```

### Project Structure

```
src/
  core/
    types.ts              # Shared type definitions + OpenClaw API contract
    config.ts             # Config parsing + validation
    api-client.ts         # Authenticated HTTP client (retry, timeout, headers)
    errors.ts             # CynapsApiError with user-safe messages
    pick.ts               # Safe object field picker
    result.ts             # Standardized tool result formatting
  tools/
    _registry.ts          # Module-gated tool registration orchestrator
    cynaps3-preflight.ts  # Readiness check (1 tool)
    musicmation-generate.ts   # Generate + bulk generate + bulk poll (3 tools)
    musicmation-library.ts    # Search, browse, stats, recommend, etc. (10 tools)
    musicmation-write.ts      # Rate, album, dramaturgy, rename (4 tools)
    musicmation-projects.ts   # Project CRUD + context mappings (6 tools)
    musicmation-content.ts    # Item create + update (2 tools)
  commands/
    status.ts             # /cynaps3-status auto-reply command
  index.ts                # Plugin entry point + exports
skills/
  cynaps3-core/SKILL.md   # Cross-module agent baseline
  musicmation/SKILL.md    # Full generation pipeline playbook
test/
  core/                   # Config, types, errors, pick tests
  tools/                  # Registry, schema validation, handler behavior tests
  fixtures/               # Shared mocks (API, config, responses)
  plugin.test.ts          # Integration test
```

---

## Security Model

- **All enforcement is server-side.** The plugin makes authenticated requests; edge functions verify auth, check tier limits, enforce rate limits, and scope queries to the authenticated user.
- **No secrets in the plugin runtime.** The `serviceRoleKey` is used for server-to-server calls only, never exposed to the agent or end user.
- **Write tools require confirmation tokens.** Destructive operations (rating, album creation, renaming, deletion) go through a 2-call flow with signed, time-limited tokens.
- **Project deletion requires triple confirmation.** The agent must warn the user, state the item count, and request the project name typed back before proceeding.

---

## Links

- **Homepage**: [cynaps3.io](https://cynaps3.io)
- **Repository**: [github.com/B-EtterDigital/Cynaps3-OpenClaw-Plugin](https://github.com/B-EtterDigital/Cynaps3-OpenClaw-Plugin)
- **Issues**: [github.com/B-EtterDigital/Cynaps3-OpenClaw-Plugin/issues](https://github.com/B-EtterDigital/Cynaps3-OpenClaw-Plugin/issues)
- **npm**: [@cynaps3/openclaw-plugin](https://www.npmjs.com/package/@cynaps3/openclaw-plugin)
- **OpenClaw**: [docs.openclaw.ai](https://docs.openclaw.ai)

---

## License

[MIT](./LICENSE) — Better Digital LLC, New Mexico — Made with Passion
