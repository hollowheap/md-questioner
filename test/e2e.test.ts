import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { runCli } from "../src/cli.js";
import { parseMarkdown } from "../src/parse/markdown.js";
import { bundleStandaloneHtml } from "../src/bundle/inline.js";

const rootDir = path.resolve(__dirname, "..");
const outDir = path.resolve(rootDir, "out/e2e");

describe("E2E Compiler Integration Suite", () => {
  beforeAll(async () => {
    await fs.mkdir(outDir, { recursive: true });
  });

  it("compiles minimal.md into a standalone offline HTML quiz", async () => {
    const inputPath = path.resolve(rootDir, "test/fixtures/minimal.md");
    const outputPath = path.resolve(outDir, "minimal.html");

    const exitCode = await runCli([inputPath, "-o", outputPath, "--quiet"]);
    expect(exitCode).toBe(0);
    expect(fsSync.existsSync(outputPath)).toBe(true);

    const html = await fs.readFile(outputPath, "utf-8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('id="root"');
    expect(html).toContain('id="mdq-data"');

    // Strict single-file assertions
    expect(html).toMatch(/<style[\s>]/i);
    expect(html).toMatch(/<script[\s>]/i);
    expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet["']/i);
    expect(html).not.toMatch(/<script[^>]+src=/i);

    // Size budget check (< 10 MB)
    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeLessThan(10 * 1024 * 1024);
    expect(stat.size).toBeGreaterThan(1000);
  });

  it("compiles full-feature.md preserving all question types and styles", async () => {
    const inputPath = path.resolve(rootDir, "test/fixtures/full-feature.md");
    const outputPath = path.resolve(outDir, "full-feature.html");

    const exitCode = await runCli([
      inputPath,
      "-o",
      outputPath,
      "--title",
      "Full Feature Test",
      "--quiet",
    ]);
    expect(exitCode).toBe(0);
    expect(fsSync.existsSync(outputPath)).toBe(true);

    const html = await fs.readFile(outputPath, "utf-8");
    expect(html).toContain("Full Feature Test");
    expect(html).toContain("Section Alpha");

    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeLessThan(10 * 1024 * 1024);
  });

  it("handles directory mode by compiling all markdown files into sibling HTML files", async () => {
    const inputDir = path.resolve(rootDir, "test/fixtures/multi-file");
    const outputDir = path.resolve(outDir, "multi-output");

    const exitCode = await runCli([inputDir, "-o", outputDir, "--quiet"]);
    expect(exitCode).toBe(0);

    const htmlA = path.resolve(outputDir, "a.html");
    const htmlB = path.resolve(outputDir, "b.html");

    expect(fsSync.existsSync(htmlA)).toBe(true);
    expect(fsSync.existsSync(htmlB)).toBe(true);

    const contentA = await fs.readFile(htmlA, "utf-8");
    const contentB = await fs.readFile(htmlB, "utf-8");

    expect(contentA).toContain('id="root"');
    expect(contentB).toContain('id="root"');
  });

  it("returns exit code 2 and reports line numbers for invalid schema (0 [x] choices)", async () => {
    const invalidMd = `# Invalid Quiz\n\n### Choice Question\n\n- [ ] Unchecked A\n- [ ] Unchecked B\n`;
    const invalidPath = path.resolve(outDir, "invalid.md");
    await fs.writeFile(invalidPath, invalidMd, "utf-8");

    const outputPath = path.resolve(outDir, "invalid.html");
    const exitCode = await runCli([invalidPath, "-o", outputPath, "--quiet"]);

    expect(exitCode).toBe(2);
    expect(fsSync.existsSync(outputPath)).toBe(false);
  });

  it("refuses to ship markup that still carries script or handlers", async () => {
    const mdPath = path.resolve(__dirname, "fixtures/minimal.md");
    const content = await fs.readFile(mdPath, "utf-8");
    const model = parseMarkdown(content, mdPath, { validate: true });
    model.sections[0].questions[0].promptHtml = '<div><script>alert(1)</script></div>';

    await expect(bundleStandaloneHtml(model)).rejects.toThrow(/script/i);
  });
});
