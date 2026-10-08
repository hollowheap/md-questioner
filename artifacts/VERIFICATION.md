# Verification Report: md-questioner

**Date:** 2026-10-08T19:16:13.920Z  
**Status:** PASSED (100%)  
**Environment:** Linux (NixOS) / Node.js v24.21.0 / Bun (Host Compiler)  

## Summary
The §10 Mandatory Verification Suite was executed across all 8 required criteria. Every test executed against real compiled artifacts using the production toolchain and headless browser automation.

| # | Check Name | Status | Details |
| :-: | :--- | :-: | :--- |
| **1** | **Schema round-trip** | ✅ PASS | PASSED: Deep equality verified across 2 sections and 7 questions. Content hash: ce7de4e68b0e7a53199ed5044d8f8c2e9163edf1cef3322581b4c085af47dcaf |
| **2** | **Render smoke** | ✅ PASS | PASSED: Single standalone HTML generated (861.1 KB) with inlined CSS & JS; 0 external <link> or <script src=> tags. |
| **5** | **Size cap (< 10 MB)** | ✅ PASS | PASSED: File size is 861.1 KB (under 10 MB limit) |
| **3** | **Offline check (zero network calls)** | ✅ PASS | PASSED: Zero external HTTP/HTTPS network calls made |
| **3** | **React hydration ([data-testid='mdq-root'])** | ✅ PASS | PASSED: Element with [data-testid="mdq-root"] is present and visible |
| **4** | **Style application (serif typography & dark accent)** | ✅ PASS | PASSED: Serif font family detected in computed styles (body: Signifier, "Iowan Old Style", Charter, "Source Serif 4", Georgia, serif, h1: none) |
| **7** | **Dark mode toggle (data-theme flip & accent change)** | ✅ PASS | PASSED: Theme flipped from "light" to "dark"; accent changed (#5d2a1a -> #7fb88a) |
| **2** | **Prose, code block, explanation & model answer rendering** | ✅ PASS | PASSED: Code blocks (pre code.hljs), explanations, and model answers are rendered in the DOM |
| **6** | **Mobile viewport (375x667 drawer & stepper)** | ✅ PASS | PASSED: Stepper is visible and sidebar collapsed to drawer (hamburger toggle active, sidebar transformed off-screen) |
| **8** | **Directory mode** | ✅ PASS | PASSED: Directory batch compilation successfully emitted a.html (857.2 KB) and b.html (857.2 KB) into target output directory. |

## Raw Check Results

### 1. Schema Round-Trip
```
PASSED: Deep equality verified across 2 sections and 7 questions. Content hash: ce7de4e68b0e7a53199ed5044d8f8c2e9163edf1cef3322581b4c085af47dcaf
```

### 2. Render Smoke Test & Content Rendering
```
PASSED: Single standalone HTML generated (861.1 KB) with inlined CSS & JS; 0 external <link> or <script src=> tags.
PASSED: Code blocks (pre code.hljs), explanations, and model answers are rendered in the DOM
```

### 3. Offline Check & Hydration
```
PASSED: Zero external HTTP/HTTPS network calls made
PASSED: Element with [data-testid="mdq-root"] is present and visible
```

### 4. Style Application
```
PASSED: Serif font family detected in computed styles (body: Signifier, "Iowan Old Style", Charter, "Source Serif 4", Georgia, serif, h1: none)
```

### 5. Bundle Size Budget (< 10 MB)
```
PASSED: File size is 861.1 KB (under 10 MB limit)
```

### 6. Mobile Viewport (375x667)
```
PASSED: Stepper is visible and sidebar collapsed to drawer (hamburger toggle active, sidebar transformed off-screen)
```

### 7. Dark Mode Toggle
```
PASSED: Theme flipped from "light" to "dark"; accent changed (#5d2a1a -> #7fb88a)
```

### 8. Directory Mode Batching
```
PASSED: Directory batch compilation successfully emitted a.html (857.2 KB) and b.html (857.2 KB) into target output directory.
```

---
*Generated automatically by `scripts/verify.mjs`.*
