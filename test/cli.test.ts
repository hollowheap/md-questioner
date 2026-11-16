import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { parseMarkdown } from "../src/parse/markdown.js";
import { bundleStandaloneHtml } from "../src/bundle/inline.js";

describe("Standalone Bundling", () => {
  it("bundles full-feature.md into standalone HTML under 10 MB", async () => {
    const mdPath = path.resolve(__dirname, "fixtures/full-feature.md");
    const content = await fs.readFile(mdPath, "utf-8");
    const model = parseMarkdown(content, mdPath, { validate: true });
    const html = await bundleStandaloneHtml(model, {
      title: "Custom Title",
      theme: "dark",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Custom Title");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('id="mdq-data"');
    expect(html).toContain('data-theme="dark"');

    const byteLength = Buffer.byteLength(html, "utf-8");
    expect(byteLength).toBeLessThan(10 * 1024 * 1024);
  });
});

describe("CLI operations", () => {
  it("--version prints version and returns 0", async () => {
    const code = await runCli(["--version"]);
    expect(code).toBe(0);
  });

  it("--help prints usage and returns 0", async () => {
    const code = await runCli(["--help"]);
    expect(code).toBe(0);
  });

  it("returns 1 for missing input file", async () => {
    const code = await runCli(["non-existent-file-xyz.md"]);
    expect(code).toBe(1);
  });

  it("rejects an unknown flag and writes no output", async () => {
    const inputPath = path.resolve(__dirname, "fixtures/full-feature.md");
    const outputPath = path.resolve(__dirname, "../out/test-strict-unknown.html");
    await fs.rm(outputPath, { force: true });
    const code = await runCli([inputPath, "-o", outputPath, "--bogus-flag"]);
    expect(code).toBe(1);

    const exists = await fs.stat(outputPath).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });

  it("rejects an option without a value", async () => {
    const inputPath = path.resolve(__dirname, "fixtures/full-feature.md");
    expect(await runCli([inputPath, "-o"])).toBe(1);
  });

  it("rejects an unsupported theme value", async () => {
    const inputPath = path.resolve(__dirname, "fixtures/full-feature.md");
    const outputPath = path.resolve(__dirname, "../out/test-strict-theme.html");
    expect(await runCli([inputPath, "-o", outputPath, "--theme", "purple"])).toBe(1);
  });

  it("keeps --help working ahead of validation", async () => {
    expect(await runCli(["--bogus-flag", "--help"])).toBe(0);
  });

  it("writes no outputs when a directory input fails", async () => {
    const inputDir = path.resolve(__dirname, "../out/test-atomic-input");
    const outputDir = path.resolve(__dirname, "../out/test-atomic-output");
    await fs.rm(inputDir, { recursive: true, force: true });
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(inputDir, { recursive: true });
    await fs.writeFile(
      path.join(inputDir, "a.md"),
      "# A\n\n## Section\n\n### Q1: pick one\n\n- [x] yes\n- [ ] no\n"
    );
    await fs.writeFile(path.join(inputDir, "b.md"), "# B\n\n### Q1: broken\n\n- [ ] one\n- [ ] two\n");

    const code = await runCli([inputDir, "-o", outputDir, "--quiet"]);
    expect(code).toBe(2);

    const written = await fs.readdir(outputDir).catch(() => []);
    expect(written).toEqual([]);
  });

  it("compiles a single file to output", async () => {
    const inputPath = path.resolve(__dirname, "fixtures/full-feature.md");
    const outputPath = path.resolve(__dirname, "../out/test-single.html");
    const code = await runCli([inputPath, "-o", outputPath, "--quiet"]);
    expect(code).toBe(0);

    const exists = await fs.stat(outputPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it("compiles a directory of files in directory mode", async () => {
    const inputDir = path.resolve(__dirname, "fixtures/multi-file");
    const outputDir = path.resolve(__dirname, "../out/test-multi/");
    const code = await runCli([inputDir, "-o", outputDir, "--quiet"]);
    expect(code).toBe(0);

    const aExists = await fs.stat(path.join(outputDir, "a.html")).then(() => true).catch(() => false);
    const bExists = await fs.stat(path.join(outputDir, "b.html")).then(() => true).catch(() => false);
    expect(aExists).toBe(true);
    expect(bExists).toBe(true);
  });
});
