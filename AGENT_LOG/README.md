# AGENT_LOG — File-based handoff between Claude (reviewer) and Codex (builder)

## The Loop

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [Codex]  read REVIEW.md  →  execute phase  →  commit            │
│             │                                                    │
│             └→ write STATUS.md  →  append HISTORY.md  →  STOP    │
│                                                                  │
│  [Human]  tells Claude "Phase N done"                            │
│                                                                  │
│  [Claude] read STATUS.md  →  verify files on disk                │
│             │                                                    │
│             ├→ if PASS → overwrite REVIEW.md with NEXT phase     │
│             └→ if FAIL → overwrite REVIEW.md with fixes needed   │
│                                                                  │
│  [Human]  tells Codex "REVIEW.md updated, continue"              │
│                                                                  │
│  [Codex]  read REVIEW.md  →  ... (loop)                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Files

| File | Owner | Purpose |
|---|---|---|
| `REVIEW.md` | **Claude writes / Codex reads** | Current phase brief + feedback from review |
| `STATUS.md` | **Codex writes / Claude reads** | Latest phase completion report + DoD |
| `HISTORY.md` | **Both append** | Append-only log of every phase outcome |
| `DECISIONS.md` (project root) | Codex writes | Decisions made on ambiguity |

## Rules

1. **Codex never starts a new phase without re-reading REVIEW.md** — it changes between phases
2. **Codex never skips writing STATUS.md** before stopping
3. **Codex never proceeds past STOP** — wait for human to say "REVIEW.md updated"
4. **Claude never changes code** — only updates REVIEW.md and HISTORY.md
5. **Append only** to HISTORY.md (never edit past entries)
6. If Codex hits a true blocker, write `## BLOCKED` section in STATUS.md and stop

## Phase Map

| # | Phase | Approx effort |
|---|---|---|
| 1 | Initial scaffold | ✅ done |
| 2 | Primitives + design system | ✅ done |
| 3 | All 15 screens with mock data | 4-7 days |
| 4 | PWA + Vercel deploy | ~1 day |
| 5 | Firebase wire-up (needs human-provided .env) | 2-3 days |
| 6 | Polish + README + v1.0 tag | 3-4 days |

Refer to `BUILD_HANDOFF.md` (project root) for full phase specs.
