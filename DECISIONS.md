# Decisions

## 2026-05-23

- The requested `C:\Users\ATOM FAMILY\Desktop\diet\mobile_app_requirements.md` file was not present at the root. The same document was available at `C:\Users\ATOM FAMILY\Desktop\diet\die-control\uploads\mobile_app_requirements.md`, so that copy was used as the mobile requirements reference.
- `npm create vite@latest` scaffolded a Vite 8 / React 19 project, but the handoff targets Vite 5 / React 18 and `vite-plugin-pwa@0.20`. The scaffold was normalized to the handoff target stack before committing.
- Phase 5 installed `firebase-tools` as a local dev dependency so rule deploys run through `npx firebase` and stay pinned to the project.
- Phase 6 audited vulnerabilities:
  - `esbuild` (moderate): Transitive dependency under Vite. Safe to ignore as it only affects local dev server, and upgrading requires Vite 8 which is a breaking change.
  - `undici` (high): Transitive dependency inside firebase client packages. Safe because client-side browser execution does not expose node fetch endpoints, and client-side auth is stable.
  - `uuid` (moderate): Transitive dependency inside firebase-tools (dev CLI tool only).

