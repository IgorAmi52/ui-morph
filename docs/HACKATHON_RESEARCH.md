# Hackathon research — ui-morph expansion ideas

## What wins juries (similar projects)

| Project | Hook | Why it wins |
|---------|------|-------------|
| **GenUI** (Devpost / UofTHacks) | Self-evolving storefront from behavior | Live adaptation, persistence, multi-agent pipeline, measurable latency story |
| **Gridly** (AI ATL 2025) | Prompt → grid → full-stack export | Tangible artifact (zip export), visual editor + AI, “30 min to production” |
| **PerplexiGrid** | NL → dashboard widgets | Structured JSON schema, 25+ viz types, template/share angle |
| **AIP / Tableau hackathon** | Command center + session replay | Enterprise polish, collaboration, “DVR for analytics” demo moment |
| **Flutter GenUI** | Agent renders real widgets, not text walls | High-bandwidth agent UX, schema-driven UI from existing catalog |

**Jury pattern:** don’t pitch “we added a button.” Pitch a **new plane** — persistence story, share/embed, presets/marketplace, versioning, replay, or agent that manipulates *your* product UI safely.

---

## 10 expansion ideas for ui-morph

Each maps to a feature branch (`feat/*`).

| # | Branch | Plane shift | Demo line |
|---|--------|-------------|-----------|
| 1 | `feat/layout-presets` | One-click layout personalities | “Compact / Executive / Focus — whole dashboard transforms” |
| 2 | `feat/config-versioning` | Time travel for layouts | “Restore last Tuesday’s layout in one click” |
| 3 | `feat/inline-text-edit` | Direct manipulation | “Double-click any headline — Figma for your SaaS copy” |
| 4 | `feat/layout-diff-viewer` | Trust layer for AI | “See exactly what the agent changed before you approve” |
| 5 | `feat/share-preview` | Distribution | “Send stakeholders a read-only preview link — no account” |
| 6 | `feat/semantic-roles` | Intent layer | “Tell the agent ‘make stat cards smaller’ — it knows what stat cards are” |
| 7 | `feat/brand-theme` | Multi-tenant SaaS story | “One brand theme, every page — white-label ready” |
| 8 | `feat/edit-session-replay` | Narrative demo | “Replay how this layout was built — DVR for customization” |
| 9 | `feat/agent-tool-streaming` | Agent transparency | “Watch the agent call tools in real time, not a black box” |
| 10 | `feat/layout-export-import` | Portability | “Export layout JSON, import on another env — no lock-in” |

---

## Recommended merge order (after review)

1. `feat/layout-diff-viewer` + `feat/inline-text-edit` — low conflict, high demo value  
2. `feat/layout-presets` + `feat/semantic-roles` — agent gets smarter  
3. `feat/config-versioning` + `feat/share-preview` — persistence & GTM story  
4. `feat/brand-theme` + `feat/layout-export-import` — SaaS positioning  
5. `feat/edit-session-replay` + `feat/agent-tool-streaming` — wow demos  
