# Project Structure: md-questioner

## Overview
CLI compiler transforming Markdown study guides into standalone, offline, single-file interactive HTML quizzes.

## Directory and File Layout
```
md-questioner/
  package.json                   # dependencies, build/compile scripts
  tsconfig.json                  # TypeScript compiler options
  .swcrc                         # SWC transpiler configuration
  esbuild.config.ts              # Node-path bundling configuration
  README.md                      # Project documentation and quickstart
  artifacts/                     # Project tracking and architecture specs
    plan.md                      # Master roadmap and tracking
    project-structure.md         # Directory and component outline
    SPEC.md                      # Technical architecture and DSL specification
    VERIFICATION.md              # Test execution and verification results
    logs/                        # Build and command execution logs
    errors/                      # Build and runtime error logs
  src/
    cli.ts                       # Arg parsing, I/O orchestration, directory recursion
    runtime.ts                   # Bun/Node runtime detection helper
    parse/
      frontmatter.ts             # YAML frontmatter extraction
      markdown.ts                # Markdown AST to QuizModel transformation
      schema.ts                  # TypeScript types for QuizModel, Section, Question
      validate.ts                # JSON Schema validator with line-number error reporting
    render/
      App.tsx                    # Root React quiz engine container
      Provider.tsx               # Gluestack theme token provider + dark mode context
      Sidebar.tsx                # Section list, question jumps, drawer on mobile
      Stepper.tsx                # Sticky prev/next navigation bar
      SectionTabs.tsx            # Section tab switcher (for >1 H2)
      Question.tsx               # Active question container and header
      Hint.tsx                   # Collapsible blockquote hint
      Progress.tsx               # Overall and per-section progress bars
      Shuffle.tsx                # Question shuffle toggle
      ThemeToggle.tsx            # Light/dark/auto mode switcher
      question-types/
        MultiChoice.tsx          # Single choice (radio)
        MultiSelect.tsx          # Multiple choice (checkboxes)
        TrueFalse.tsx            # True/False toggle buttons
        MatchPairs.tsx           # Left prompt to right dropdown matching
        ShortAnswer.tsx          # Text input with ±1 typo tolerance
        Reflection.tsx           # Free-text self-assessment prompt
    styles/
      tokens.css                 # CSS custom properties for light and dark palettes
      global.css                 # Serif typography, sans UI, responsive styles
    bundle/
      inline.ts                  # Bundler combining JS, CSS, and data into HTML
      template.html              # HTML shell with {{JS}} and {{CSS}} slots
    verify/
      headless.ts                # Playwright headless verification suite
  scripts/
    compile.mjs                  # Runtime-adaptive compiler runner
    build.mjs                    # CLI bundler
    dist.mjs                     # Claude Skill package generator
    verify.mjs                   # Headless verification runner
  dist/                          # Emitted Claude Skill package
    SKILL.md                     # Claude Skill descriptor
    reference/
      example.md                 # Canonical full-feature study guide example
      schema.md                  # Human-readable DSL reference
      schema.json                # JSON Schema Draft 2020-12
      design-tokens.json         # Extracted steep.app design tokens
      design-tokens.md           # Token reference documentation
    scripts/
      md-questioner              # Host-platform binary (chmod +x)
      README.md                  # Claude agent invocation instructions
  test/
    fixtures/
      minimal.md                 # Minimal valid markdown fixture
      full-feature.md            # Comprehensive test fixture exercising all rules
      multi-file/
        a.md                     # Multi-file directory test fixture A
        b.md                     # Multi-file directory test fixture B
    e2e.test.ts                  # End-to-end integration tests
```
