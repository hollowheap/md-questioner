# md-questioner

TypeScript ESM CLI that compiles Markdown study guides into one standalone, offline, single-file HTML quiz per input.

## Essential Commands

- Build / check: `npm run build`
- Test suite: `npm test`
- Single test file: `npx vitest run test/parser.test.ts`
- Full verification: `CHROMIUM_PATH=$(command -v chromium) npm run verify`

## Conventions

- Run `npm run build` after any `src/render/**` or `src/styles/**` edit: `src/bundle/client-bundle.generated.ts` is generated and committed, so a stale bundle ships stale UI and `npm run verify` fails on it.
- Keep author-supplied HTML behind the allowlist sanitizer in `src/parse/markdown.ts`; the bundler refuses a model whose markup still carries a script or inline handler.
- Keep the emitted quiz offline: it must run from `file://` with zero network calls and no external `<link>` or `<script src>`.
- Gluestack silently drops numeric `maxW`/`width` props; express widths through inline `style` or `src/render/layout.ts`.
- No linter or formatter is configured; do not add one.
- Never store workspace artifacts outside the hidden workspace directory.
- Never emit internal workspace record terms, record IDs, or hidden workspace paths in commits, PRs, code comments, or public docs.
- Never disable compiler flags, skip tests, or weaken verification gates to force a pass.
- Never force-push without `--force-with-lease`.
