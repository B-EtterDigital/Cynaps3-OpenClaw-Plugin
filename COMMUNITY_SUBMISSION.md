# OpenClaw Community Plugin Submission

> This file contains the PR template for submitting to the
> [OpenClaw Community Plugins](https://docs.openclaw.ai/plugins/community) listing.

---

## PR Entry

**Cynaps3 Creative Suite** — AI-powered music creation, library management, and content curation with 26 agent tools, dual-provider generation (Suno + Sonauto), and bundled skill playbooks.

- **npm**: `@cynaps3/openclaw-plugin`
- **repo**: `https://github.com/B-EtterDigital/cynaps3-openclaw-plugin`
- **install**: `openclaw plugins install @cynaps3/openclaw-plugin`

---

## Extended Description (for listing page)

### Cynaps3 Creative Suite

Turn your OpenClaw agent into a music production assistant. Generate tracks with Suno and Sonauto, browse 150+ artist styles, manage projects and albums, and curate your library — all through natural language.

**26 typed tools** across 6 categories:
- **Generation** — Single track or bulk (up to 20), dual-provider (Suno for 2 variations, Sonauto for 1 song)
- **Library** — Search, browse styles, recommendations, influence groups, personas, top-rated
- **Projects** — Create, update, delete (triple-confirm), context mappings
- **Content** — Direct item CRUD for the content screen
- **Write** — Autonomy-gated: rate, album, dramaturgy, bulk rename (confirmation token flow)
- **Core** — Preflight readiness check (auth, credits, tier limits, daily quotas)

**2 bundled skills** with full agent playbooks: 3-turn generation pipeline, provider selection logic, decision guides for every user intent, style categories, and tag vocabulary.

**Thin client / fat server architecture** — zero security enforcement in the plugin. All auth, rate limits, tier checks, and ownership scoping enforced server-side via Supabase edge functions.

240 tests. Full TypeScript with strict mode. MIT licensed.

### Key Features

| Feature | Description |
|---------|-------------|
| Dual-provider | Suno (2 variations, V4/V5) and Sonauto (1 song, multi-format output) |
| 150+ artist styles | Hip-hop, electronic, jazz, pop, rock, classical, kpop, afrobeats, and more |
| AI lyrics | Multi-language via Suno API, or agent-written for Sonauto |
| Bulk pipeline | Create items, generate lyrics, enqueue batch — all in 3 turns |
| Confirmation tokens | Write operations require signed, time-limited user approval |
| Background poller | Monitors generation queue, detects completions automatically |

### Requirements

- OpenClaw CLI
- Supabase project with Cynaps3 schema deployed
- Suno and/or Sonauto API key (configured via the web app)

---

## Checklist

- [x] Published on npmjs.com (`@cynaps3/openclaw-plugin`)
- [x] Public GitHub repository
- [x] README with setup and usage docs
- [x] GitHub Issues enabled
- [x] MIT license
- [x] 240 passing tests
- [x] Active maintenance
