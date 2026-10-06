# Project Plan: md-questioner

## Objective
Build `md-questioner`, a CLI compiler that transforms Markdown study-guide files into a single-file, offline, interactive HTML quiz application. Package the compiler as a Claude Skill in `dist/` with a standalone host-platform binary in `dist/scripts/`, supporting a hybrid Bun / Node toolchain.

---

## Decisions & Defaults
1. **Syntax-Highlighting Theme Pair**: Custom themes derived directly from design tokens (Light: `#17191c` ink on `#f2f2f3`/`#ffffff` mist/paper with `#5d2a1a` sienna accents; Dark: `#14181a`/`#1b2024` surface with `#e8e6e1` warm text and `#7fb88a` AA warm green accents).
2. **`--verify` Flag**: Default is **off**; activated via `--verify` flag to avoid running headless browser checks unnecessarily during normal compiles.
3. **Environment & Headless Browser**: Verified availability of `chromium` via `nix-shell -p chromium` and `bun` via `nix-shell -p bun` on host. Headless verification will leverage Chromium in headless mode.
4. **Node Binary Strategy**: Attempt native packaging via `@yao-pkg/pkg`; seamlessly fallback to an executable Node launcher shim (`#!/usr/bin/env node`) with inlined bundle if binary packaging is restricted by host environment (e.g., NixOS sandbox).
5. **Project Artifacts Location**: All specification, tracking, and verification reports reside exclusively in `artifacts/` (`artifacts/plan.md`, `artifacts/SPEC.md`, `artifacts/VERIFICATION.md`, `artifacts/repomap.md`).

---

## Master List of Goals
- [x] Goal 1: Architecture Specification & Planning (`artifacts/SPEC.md`)
- [x] Goal 2: Project Scaffolding & Configuration (`package.json`, `tsconfig.json`, `.swcrc`, `esbuild.config.ts`)
- [x] Goal 3: Core Parser Implementation (`src/parse/` with AST, frontmatter, schema, validation, line-aware error reporting)
- [x] Goal 4: Test Fixtures & Parser Verification (`full-feature.md`, `minimal.md`, `multi-file/`, round-trip tests)
- [x] Goal 5: React UI Rendering & Theme System (`src/render/` with tokens, theme toggle, layout, all 6 question types, stepper, progress, shuffle)
- [x] Goal 6: Single-File Inlining & Bundler (`src/bundle/` inlining JS, CSS, template, and curated syntax highlighting)
- [x] Goal 7: CLI & Hybrid Runtime Implementation (`src/cli.ts`, `src/runtime.ts`, Bun/Node branching, directory processing)
- [x] Goal 8: Claude Skill Packaging & Binary Compilation (`dist/` layout, `SKILL.md`, references, host binary compilation)
- [x] Goal 9: Comprehensive Verification & Audit (8 verification checks in `artifacts/VERIFICATION.md`)
- [x] Goal 10: Final Handoff Documentation & Polish

---

## Detailed Execution Roadmap

### Phase 1: Architecture Specification
- [x] Generate comprehensive `artifacts/SPEC.md` covering data flow, AST transformation, module boundaries, dependencies, question-type detection rules, and design tokens.
- [x] Verify `artifacts/SPEC.md` for internal consistency against all brief constraints.

### Phase 2: Project Scaffolding
- [x] Scaffold directory tree:
  ```
  src/
    cli.ts
    runtime.ts
    parse/
    render/
      question-types/
    styles/
    bundle/
    verify/
  scripts/
  test/
    fixtures/
      multi-file/
  ```
- [x] Create `package.json`, `tsconfig.json`, `.swcrc`, `esbuild.config.ts`, and install dependencies (`react`, `react-dom`, `esbuild`, `@swc/core`, `yaml`, `ajv`, `highlight.js`, `vitest`, `@types/...`).

### Phase 3: Core Parser Implementation
- [x] Implement `src/parse/schema.ts` defining `QuizModel`, `Question`, `Section`, `Frontmatter`, and question type union.
- [x] Implement `src/parse/frontmatter.ts` for YAML extraction (`title`, `description`, `author`, `tags`).
- [x] Implement `src/parse/markdown.ts` converting Markdown AST to `QuizModel` respecting the 5 question-type detection rules and hint blockquote rules with source line tracking.
- [x] Implement `src/parse/validate.ts` validating `QuizModel` against JSON Schema Draft 2020-12 with human-readable line numbers and exit code 2 on error.

### Phase 4: Test Fixtures & Parser Verification
- [x] Create test fixtures: `minimal.md`, `full-feature.md`, `multi-file/a.md`, `multi-file/b.md`.
- [x] Create canonical reference files for the Claude Skill: `dist/reference/schema.json`, `dist/reference/example.md`, `dist/reference/schema.md` (tokens and themes are compiled deterministically into bundle).
- [x] Run parser tests and round-trip validation.

### Phase 5: React UI Rendering & Theme System
- [x] Create `src/styles/tokens.css` with Refero steep.app light palette and dark warm-green AA palette.
- [x] Create `src/styles/global.css` with serif body/headings, sans UI controls, and responsive grid.
- [x] Implement `src/render/Provider.tsx` with Gluestack token context and dark mode state manager.
- [x] Implement question-type components:
  - `MultiChoice.tsx` (radio semantics, single correct, explanation paragraph)
  - `MultiSelect.tsx` (checkbox semantics, multiple correct, explanation paragraph)
  - `TrueFalse.tsx` (True/False toggle buttons, explanation paragraph)
  - `MatchPairs.tsx` (left column prompts, right column dropdowns with shuffled options)
  - `ShortAnswer.tsx` (input field, case-insensitive compare, ±1 typo tolerance, Enter key submit)
  - `Reflection.tsx` (free-text self-assessment textarea, "Next" marks practiced)
- [x] Implement layout components:
  - `App.tsx` (main quiz container and state engine)
  - `Sidebar.tsx` (desktop sidebar, mobile drawer, jump links, section progress)
  - `Stepper.tsx` (prev/next navigation, question indicator, sticky bottom)
  - `SectionTabs.tsx` (tabs for multiple H2s, resets stepper on section switch)
  - `Question.tsx` (active question card wrapper)
  - `Hint.tsx` (collapsible blockquote hint)
  - `Progress.tsx` (overall + per-section progress bars, localStorage sync keyed by content hash)
  - `Shuffle.tsx` (in-section shuffle toggle, hideable via `--no-shuffle`)
  - `ThemeToggle.tsx` (light/dark/auto toggle, localStorage sync)

### Phase 6: Single-File Inlining & Bundler
- [x] Curate highlight.js languages (js, ts, tsx, jsx, python, go, rust, sql, bash, json, yaml, html, css, md) and create syntax CSS for light and dark modes.
- [x] Implement `src/bundle/template.html` and `src/bundle/inline.ts` to bundle the React app, styles, and serialized QuizModel into a standalone offline HTML (<10MB).

### Phase 7: CLI & Hybrid Toolchain
- [x] Implement `src/runtime.ts` detecting Bun vs Node.
- [x] Implement `src/cli.ts` handling CLI arguments: `<input>`, `-o/--out`, `--theme`, `--no-shuffle`, `--title`, `--quiet`, `--verify`, `--version`, directory mode, and exit codes (0, 1, 2).
- [x] Implement build scripts: `scripts/compile.mjs`, `scripts/build.mjs`, `scripts/dist.mjs`, `scripts/verify.mjs`.

### Phase 8: Claude Skill Packaging & Binary Compilation
- [x] Scaffold `dist/` layout:
  - `dist/SKILL.md` (frontmatter + instructions)
  - `dist/reference/` (`example.md`, `schema.md`, `schema.json`, `design-tokens.json`, `design-tokens.md`)
  - `dist/scripts/md-questioner` (compiled host-platform binary with `chmod +x`)
  - `dist/scripts/README.md`
- [x] Package binary or executable shim.

### Phase 9: Verification & Audit
- [x] Implement `src/verify/headless.ts` checking all 8 criteria.
- [x] Execute:
  1. Schema round-trip deep equality.
  2. Render smoke (single HTML, inlined styles and scripts, no external links).
  3. Offline check (zero external requests, React hydration).
  4. Style application (serif typography, dark mode accent).
  5. Size cap (< 10 MB).
  6. Mobile viewport (375x667 drawer and sticky stepper).
  7. Dark mode toggle (flips `data-theme` and accent).
  8. Directory mode (multiple HTML files compiled from directory input).
- [x] Produce `artifacts/VERIFICATION.md` capturing all raw results.

### Phase 10: Commit History & Final Handoff
- [x] Create clean, conventional git commits.
- [x] Present comprehensive handoff summary and verification report.

---

## Validation Matrix
| Verification Check | Target | Criteria |
| :--- | :--- | :--- |
| **Schema Round-Trip** | `test/fixtures/full-feature.md` | Parse -> JSON serialize -> re-parse -> `deepEqual === true` |
| **Render Smoke** | Single HTML file | All `<style>` and `<script>` inlined; no external CDN / link tags |
| **Offline Verification** | Headless browser | Zero network calls intercepted; `data-testid="mdq-root"` hydrated |
| **Style Application** | Computed CSS | Serif font stack for body/headings; AA dark accent on controls |
| **Bundle Size Budget** | Emitted HTML file | Strictly < 10 MB (typically ~300KB-800KB) |
| **Mobile Responsiveness**| 375×667 viewport | Sidebar collapses to drawer; stepper stays fixed |
| **Theme Toggle** | `[data-theme]` | Toggling flips attribute between light and dark |
| **Directory Batching** | `test/fixtures/multi-file/`| 2 `.md` files map to 2 `.html` files in target directory |
