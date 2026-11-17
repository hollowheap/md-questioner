import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const SKILL_MD_CONTENT = `---
name: md-questioner
description: Compiles structured Markdown study guides and quiz notes into standalone, single-file offline interactive HTML quiz applications with zero external CDN dependencies.
---

# md-questioner Skill

## Scope

- Covers: compiling structured Markdown Q&A study guides into single-file, offline HTML quizzes, including batch directories and headless verification.
- Excludes: authoring source notes, online hosting, and non-Markdown input formats.

## Agent Instructions & Workflow

1. **Format Input Markdown**:
   - Ensure the markdown document conforms to \`reference/schema.md\`.
   - Include an H1 title (\`# Title\`) and optional lead-in quote (\`> Intro...\`).
   - Use H2 (\`## Section\`) to group questions into sections (rendered as top tabs).
   - Use H3 (\`### Question\`) to declare questions.
   - Use the first blockquote under H3 (\`> Hint...\`) for hints (rendered as a collapsible accordion).
   - Question types are inferred automatically according to strict priority:
     - **Short Answer**: \`#### <canonical-answer>\` immediately under H3.
     - **Match Pairs**: GFM table with prompt and answer columns.
     - **True / False**: Exactly two task items \`[x] True\` and \`[ ] False\` (or vice-versa).
     - **Multi Choice**: Single \`[x]\` with $>2$ task items.
     - **Multi Select**: Multiple \`[x]\` task items.
     - **Reflection**: Free-form prompt with textarea for self-assessment.
   - Refer to \`reference/example.md\` for a complete reference implementation.

2. **Invoke the Compiler**:
   \`\`\`bash
   ./scripts/md-questioner <input.md> -o <output.html>
   \`\`\`
   Or for directory batch mode:
   \`\`\`bash
   ./scripts/md-questioner <input-directory> -o <output-directory>/
   \`\`\`

3. **CLI Options**:
   - \`-o, --out <path>\`: Destination file or output directory (default: \`./out/\`).
   - \`--theme <light|dark|auto>\`: Theme preset (default: \`auto\`).
   - \`--no-shuffle\`: Keep original option ordering within questions.
   - \`--title <title>\`: Override the page title and main H1 heading.
   - \`--quiet\`: Suppress compilation status logs.
   - \`--verify\`: Run headless browser verification check after compiling.
   - \`-h, --help\`: Display help instructions.
   - \`-v, --version\`: Display version information.

4. **Reference Artifacts**:
   - \`reference/schema.md\`: Full DSL specification and inference rules.
   - \`reference/example.md\`: Comprehensive sample guide covering all question types.
   - \`reference/schema.json\`: Formal JSON Schema Draft 2020-12 data model definition.
   - \`reference/design-tokens.md\`: Complete design system token reference.
`;

const SCHEMA_MD_CONTENT = `# Quiz DSL reference

The compiler accepts Markdown study guides. \`schema.json\` beside this file is the formal
JSON Schema (Draft 2020-12) of the parsed model, generated from the compiler's embedded
schema, so it always matches what the compiler accepts.

- Frontmatter: optional YAML block with \`title\`, \`description\`, \`author\`, \`tags\`.
- Sections: \`## <section title>\`.
- Questions: \`### <question title>\`; the body shape selects the type: an H4 \`Rubric\`
  makes an essay, any other H4 a short answer, a GFM table a match-pairs question, a task
  list a multi-choice / multi-select / true-false question, and a body without answer
  markers a reflection.
- Hints: a blockquote before the answer element becomes the hint; a blockquote after the
  answer becomes the explanation.

\`example.md\` beside this file is a complete guide covering every question type.
`;

const README_MD_CONTENT = `To compile a Markdown study guide into an interactive single-file HTML quiz, invoke \`./scripts/md-questioner <input.md> -o <output-dir-or-file>\`. Directory inputs compile all \`.md\` files into \`<output-dir>/\`. Ensure input matches \`../reference/schema.md\`.
`;

async function dist() {
  console.log("[dist] Starting distribution packaging...");

  // 1. Run scripts/build.mjs
  console.log("[dist] Running scripts/build.mjs...");
  const buildScript = path.resolve(rootDir, "scripts/build.mjs");
  const buildRes = spawnSync("node", [buildScript], {
    cwd: rootDir,
    stdio: "inherit",
  });
  if (buildRes.status !== 0) {
    throw new Error(`Build failed with exit code ${buildRes.status}`);
  }

  const distScriptsDir = path.resolve(rootDir, "dist/scripts");
  const distReferenceDir = path.resolve(rootDir, "dist/reference");
  await fs.mkdir(distScriptsDir, { recursive: true });
  await fs.mkdir(distReferenceDir, { recursive: true });

  const binaryPath = path.resolve(distScriptsDir, "md-questioner");
  let packagedBinary = false;

  // 2. Check Bun for binary compilation
  try {
    // Check PATH or nix-shell for bun
    let bunCmd = "bun";
    let hasBun = false;
    try {
      const whichBun = spawnSync("which", ["bun"], { stdio: "ignore" });
      if (whichBun.status === 0 || typeof process.versions?.bun === "string") {
        hasBun = true;
      }
    } catch {}

    if (hasBun) {
      console.log("[dist] Bun detected in PATH. Compiling host binary with bun build --compile...");
      const bunRes = spawnSync(
        "bun",
        ["build", "--compile", "src/cli.ts", "--external", "playwright", "--external", "esbuild", "--outfile", binaryPath],
        { cwd: rootDir, stdio: "inherit" }
      );
      if (bunRes.status === 0 && fsSync.existsSync(binaryPath)) {
        console.log("[dist] Successfully packaged standalone binary with Bun.");
        packagedBinary = true;
      }
    } else {
      // Try nix-shell bun if on NixOS
      try {
        console.log("[dist] Checking nix-shell bun for host binary compilation...");
        const nixBunRes = spawnSync(
          "nix-shell",
          ["-p", "bun", "--run", `bun build --compile src/cli.ts --external playwright --external esbuild --outfile ${binaryPath}`],
          { cwd: rootDir, stdio: "inherit" }
        );
        if (nixBunRes.status === 0 && fsSync.existsSync(binaryPath)) {
          console.log("[dist] Successfully packaged standalone binary with Bun via nix-shell.");
          packagedBinary = true;
        }
      } catch {}
    }
  } catch (err) {
    console.log("[dist] Bun compilation bypassed:", err.message);
  }

  // 3. Fallback: emit executable shell launcher shim
  if (!packagedBinary) {
    console.log("[dist] Creating executable launcher shim at dist/scripts/md-questioner...");
    const shimContent = `#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/md-questioner.mjs" "$@"
`;
    await fs.writeFile(binaryPath, shimContent, "utf-8");
  }

  // Ensure binary is executable
  try {
    await fs.chmod(binaryPath, 0o755);
  } catch {}

  // 5. Emit dist/SKILL.md
  const skillPath = path.resolve(rootDir, "dist/SKILL.md");
  await fs.writeFile(skillPath, SKILL_MD_CONTENT, "utf-8");
  console.log(`[dist] Emitted ${skillPath}`);

  // 6. Emit dist/scripts/README.md
  const readmePath = path.resolve(distScriptsDir, "README.md");
  await fs.writeFile(readmePath, README_MD_CONTENT, "utf-8");
  console.log(`[dist] Emitted ${readmePath}`);

  // 7. Generate reference files from the compiler and its canonical fixture
  const examplePath = path.resolve(distReferenceDir, "example.md");
  const schemaMdPath = path.resolve(distReferenceDir, "schema.md");
  const schemaJsonPath = path.resolve(distReferenceDir, "schema.json");

  const builtModule = await import(
    pathToFileURL(path.resolve(distScriptsDir, "md-questioner.mjs")).href
  );
  if (!builtModule.quizModelSchema) {
    throw new Error("The built compiler does not export quizModelSchema.");
  }
  await fs.writeFile(
    schemaJsonPath,
    `${JSON.stringify(builtModule.quizModelSchema, null, 2)}\n`,
    "utf-8"
  );
  await fs.writeFile(schemaMdPath, SCHEMA_MD_CONTENT, "utf-8");
  await fs.copyFile(path.resolve(rootDir, "test/fixtures/full-feature.md"), examplePath);
  console.log(`[dist] Generated ${schemaJsonPath}, ${schemaMdPath} and ${examplePath}`);

  if (!fsSync.existsSync(examplePath)) {
    throw new Error(`Required reference file missing: ${examplePath}`);
  }
  if (!fsSync.existsSync(schemaMdPath)) {
    throw new Error(`Required reference file missing: ${schemaMdPath}`);
  }
  if (!fsSync.existsSync(schemaJsonPath)) {
    throw new Error(`Required reference file missing: ${schemaJsonPath}`);
  }

  // 8. Validate dist/ layout matches §8
  const requiredPaths = [
    skillPath,
    binaryPath,
    readmePath,
    path.resolve(distScriptsDir, "md-questioner.mjs"),
    examplePath,
    schemaMdPath,
    schemaJsonPath,
  ];

  for (const req of requiredPaths) {
    if (!fsSync.existsSync(req)) {
      throw new Error(`Distribution layout validation failed: missing ${req}`);
    }
  }
  console.log("[dist] Distribution layout validated.");

  // 9. Smoke test: compile dist/reference/example.md to out/example.html using the binary
  console.log("[dist] Running smoke test compilation on dist/reference/example.md...");
  const outDir = path.resolve(rootDir, "out");
  await fs.mkdir(outDir, { recursive: true });
  const outHtmlPath = path.resolve(outDir, "example.html");

  const smokeRes = spawnSync(
    binaryPath,
    [examplePath, "-o", outHtmlPath],
    { cwd: rootDir, stdio: "inherit" }
  );

  if (smokeRes.status !== 0) {
    throw new Error(`Smoke test compilation failed with exit code ${smokeRes.status}`);
  }

  const stat = await fs.stat(outHtmlPath);
  const sizeKb = (stat.size / 1024).toFixed(1);
  console.log(`[dist] Smoke test output size: ${sizeKb} KB`);
  if (stat.size >= 10 * 1024 * 1024) {
    throw new Error(`Smoke test output exceeded 10 MB budget: ${stat.size} bytes`);
  }

  console.log("[dist] Distribution build and smoke test completed successfully!");
}

dist().catch((err) => {
  console.error("[dist] Distribution failed:", err);
  process.exit(1);
});
