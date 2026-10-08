import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMarkdown, validateQuizModel } from "../dist/scripts/md-questioner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

async function verifyAll() {
  console.log("=================================================");
  console.log("   md-questioner §10 Mandatory Verification Suite");
  console.log("=================================================\n");

  const reports = [];

  // Ensure fresh build and out directories
  console.log("[Setup] Running scripts/build.mjs...");
  const buildRes = spawnSync("node", ["scripts/build.mjs"], {
    cwd: rootDir,
    stdio: "inherit",
  });
  if (buildRes.status !== 0) {
    throw new Error("scripts/build.mjs failed");
  }

  const { runHeadlessVerification } = await import("../dist/verify/headless.js");

  const outDir = path.resolve(rootDir, "out/verification");
  await fs.mkdir(outDir, { recursive: true });
  const cliScript = path.resolve(rootDir, "dist/scripts/md-questioner.mjs");

  // --------------------------------------------------------------------------
  // Check 1: Schema Round-Trip
  // --------------------------------------------------------------------------
  console.log("\n[Check 1/8] Schema Round-Trip on test/fixtures/full-feature.md...");
  try {
    const fixturePath = path.resolve(rootDir, "test/fixtures/full-feature.md");
    const raw = await fs.readFile(fixturePath, "utf-8");
    const model = parseMarkdown(raw, fixturePath);
    validateQuizModel(model, fixturePath);

    const serialized = JSON.stringify(model);
    const deserialized = JSON.parse(serialized);
    validateQuizModel(deserialized, fixturePath);

    const isEqual = JSON.stringify(model) === JSON.stringify(deserialized);
    if (!isEqual) {
      throw new Error("Serialized QuizModel does not match deserialized object");
    }
    const totalQ = model.totalQuestions;
    const sectionsCount = model.sections.length;
    reports.push({
      id: 1,
      name: "Schema round-trip",
      passed: true,
      output: `PASSED: Deep equality verified across ${sectionsCount} sections and ${totalQ} questions. Content hash: ${model.contentHash}`,
    });
    console.log("  ✓ PASSED");
  } catch (err) {
    reports.push({
      id: 1,
      name: "Schema round-trip",
      passed: false,
      output: `FAILED: ${err.message}`,
    });
    console.log(`  ✗ FAILED: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // Check 2: Render Smoke
  // --------------------------------------------------------------------------
  console.log("\n[Check 2/8] Render Smoke Test...");
  const smokeHtmlPath = path.resolve(outDir, "full-feature.html");
  try {
    const compileRes = spawnSync(
      "node",
      [cliScript, "test/fixtures/full-feature.md", "-o", smokeHtmlPath],
      { cwd: rootDir, stdio: "inherit" }
    );
    if (compileRes.status !== 0) {
      throw new Error(`CLI compilation exited with code ${compileRes.status}`);
    }

    const htmlContent = await fs.readFile(smokeHtmlPath, "utf-8");
    const hasStyleTag = /<style[\s>]/i.test(htmlContent);
    const hasScriptTag = /<script[\s>]/i.test(htmlContent);
    const hasExternalCss = /<link[^>]+rel=["']stylesheet["']/i.test(htmlContent);
    const hasExternalScript = /<script[^>]+src=/i.test(htmlContent);

    if (!hasStyleTag) throw new Error("Emitted HTML lacks inline <style> tag");
    if (!hasScriptTag) throw new Error("Emitted HTML lacks inline <script> tag");
    if (hasExternalCss) throw new Error("Emitted HTML contains external stylesheet <link>");
    if (hasExternalScript) throw new Error("Emitted HTML contains external script with src=");

    reports.push({
      id: 2,
      name: "Render smoke",
      passed: true,
      output: `PASSED: Single standalone HTML generated (${(htmlContent.length / 1024).toFixed(1)} KB) with inlined CSS & JS; 0 external <link> or <script src=> tags.`,
    });
    console.log("  ✓ PASSED");
  } catch (err) {
    reports.push({
      id: 2,
      name: "Render smoke",
      passed: false,
      output: `FAILED: ${err.message}`,
    });
    console.log(`  ✗ FAILED: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // Checks 3, 4, 5, 6, 7: Headless Browser Verification
  // --------------------------------------------------------------------------
  console.log("\n[Checks 3-7] Running Playwright Headless Verification Suite...");
  try {
    const headlessResults = await runHeadlessVerification(smokeHtmlPath, { headless: true });

    // Map headless results
    for (const res of headlessResults) {
      let checkId = 0;
      let checkName = res.checkName;

      if (res.checkName.includes("Zero Network")) {
        checkId = 3;
        checkName = "Offline check (zero network calls)";
      } else if (res.checkName.includes("Hydration")) {
        checkId = 3;
        checkName = "React hydration ([data-testid='mdq-root'])";
      } else if (res.checkName.includes("Serif Style")) {
        checkId = 4;
        checkName = "Style application (serif typography & dark accent)";
      } else if (res.checkName.includes("Size Cap")) {
        checkId = 5;
        checkName = "Size cap (< 10 MB)";
      } else if (res.checkName.includes("Mobile Viewport")) {
        checkId = 6;
        checkName = "Mobile viewport (375x667 drawer & stepper)";
      } else if (res.checkName.includes("Theme Toggle")) {
        checkId = 7;
        checkName = "Dark mode toggle (data-theme flip & accent change)";
      } else if (res.checkName.includes("Code Block") || res.checkName.includes("Markdown")) {
        checkId = 2;
        checkName = "Prose, code block, explanation & model answer rendering";
      }

      reports.push({
        id: checkId,
        name: checkName,
        passed: res.passed,
        output: `${res.passed ? "PASSED" : "FAILED"}: ${res.details}`,
      });
      console.log(`  ${res.passed ? "✓" : "✗"} [${res.checkName}] ${res.details}`);
    }
  } catch (err) {
    console.log(`  ✗ Playwright verification error: ${err.message}`);
    reports.push({
      id: 3,
      name: "Headless Verification Suite",
      passed: false,
      output: `FAILED: ${err.message}`,
    });
  }

  // --------------------------------------------------------------------------
  // Check 8: Directory Mode
  // --------------------------------------------------------------------------
  console.log("\n[Check 8/8] Directory Mode Compilation on test/fixtures/multi-file/...");
  const multiOutDir = path.resolve(outDir, "multi-mode");
  try {
    await fs.mkdir(multiOutDir, { recursive: true });
    const dirCompileRes = spawnSync(
      "node",
      [cliScript, "test/fixtures/multi-file/", "-o", multiOutDir],
      { cwd: rootDir, stdio: "inherit" }
    );
    if (dirCompileRes.status !== 0) {
      throw new Error(`Directory compilation exited with code ${dirCompileRes.status}`);
    }

    const htmlA = path.resolve(multiOutDir, "a.html");
    const htmlB = path.resolve(multiOutDir, "b.html");

    const aExists = fsSync.existsSync(htmlA);
    const bExists = fsSync.existsSync(htmlB);

    if (!aExists || !bExists) {
      throw new Error(`Expected a.html (${aExists}) and b.html (${bExists}) to be emitted`);
    }

    const statA = await fs.stat(htmlA);
    const statB = await fs.stat(htmlB);

    reports.push({
      id: 8,
      name: "Directory mode",
      passed: true,
      output: `PASSED: Directory batch compilation successfully emitted a.html (${(statA.size / 1024).toFixed(1)} KB) and b.html (${(statB.size / 1024).toFixed(1)} KB) into target output directory.`,
    });
    console.log("  ✓ PASSED");
  } catch (err) {
    reports.push({
      id: 8,
      name: "Directory mode",
      passed: false,
      output: `FAILED: ${err.message}`,
    });
    console.log(`  ✗ FAILED: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // Write artifacts/VERIFICATION.md
  // --------------------------------------------------------------------------
  console.log("\nGenerating artifacts/VERIFICATION.md report...");
  const allPassed = reports.every((r) => r.passed);
  const now = new Date().toISOString();

  let markdownReport = `# Verification Report: md-questioner

**Date:** ${now}  
**Status:** ${allPassed ? "PASSED (100%)" : "FAILED"}  
**Environment:** Linux (NixOS) / Node.js ${process.version} / Bun (Host Compiler)  

## Summary
The §10 Mandatory Verification Suite was executed across all 8 required criteria. Every test executed against real compiled artifacts using the production toolchain and headless browser automation.

| # | Check Name | Status | Details |
| :-: | :--- | :-: | :--- |
${reports
  .map(
    (r) =>
      `| **${r.id}** | **${r.name}** | ${r.passed ? "✅ PASS" : "❌ FAIL"} | ${r.output.replace(/\|/g, "\\|")} |`
  )
  .join("\n")}

## Raw Check Results

### 1. Schema Round-Trip
\`\`\`
${reports.find((r) => r.id === 1)?.output || "N/A"}
\`\`\`

### 2. Render Smoke Test & Content Rendering
\`\`\`
${reports.filter((r) => r.id === 2).map((r) => r.output).join("\n") || "N/A"}
\`\`\`

### 3. Offline Check & Hydration
\`\`\`
${reports.filter((r) => r.id === 3).map((r) => r.output).join("\n") || "N/A"}
\`\`\`

### 4. Style Application
\`\`\`
${reports.find((r) => r.id === 4)?.output || "N/A"}
\`\`\`

### 5. Bundle Size Budget (< 10 MB)
\`\`\`
${reports.find((r) => r.id === 5)?.output || "N/A"}
\`\`\`

### 6. Mobile Viewport (375x667)
\`\`\`
${reports.find((r) => r.id === 6)?.output || "N/A"}
\`\`\`

### 7. Dark Mode Toggle
\`\`\`
${reports.find((r) => r.id === 7)?.output || "N/A"}
\`\`\`

### 8. Directory Mode Batching
\`\`\`
${reports.find((r) => r.id === 8)?.output || "N/A"}
\`\`\`

---
*Generated automatically by \`scripts/verify.mjs\`.*
`;

  const verificationPath = path.resolve(rootDir, "artifacts/VERIFICATION.md");
  await fs.writeFile(verificationPath, markdownReport, "utf-8");
  console.log(`Report written to ${verificationPath}`);

  if (!allPassed) {
    console.error("\n❌ Verification failed. Check artifacts/VERIFICATION.md for details.");
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("   ALL §10 VERIFICATION CHECKS PASSED (8/8)");
  console.log("=================================================");
  process.exit(0);
}

verifyAll().catch((err) => {
  console.error("Fatal error during verification:", err);
  process.exit(1);
});
