# Tailwind default fonts

## Setup
- Start the app with Node.js and pnpm installed.
- Open a new thread and DevTools with network cache disabled.

## Actions and expected results
1. In light theme, reload the app. The body uses Tailwind's default sans family, and the new-thread heading inherits it.
2. Switch to dark theme and repeat. Font families stay the same and surfaces remain dark.
3. Inspect a chat code block and diff review: both use Tailwind's default monospace family. Inline code retains its existing sans styling.
4. Open the terminal: its family remains Menlo, Monaco, Consolas, "Courier New", monospace at 12px.
5. Check Network after reload: no IBM Plex or Bricolage font requests or font preloads occur.
6. Run `PROFILE_BASE_URL=http://127.0.0.1:4173 node scripts/check-fonts.cjs` on the new-thread screen.

## Cleanup
Restore the original theme and DevTools cache setting. No persistent test data is required.

## Performance audit
Source inspection: removes two font preloads and six font-face declarations; no new requests, blocking JavaScript, fanout, payloads, or cache logic. Existing font assets remain unused by the app. Browser timings and light/dark visual checks were not run because this environment lacks Node.js and pnpm.
