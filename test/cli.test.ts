import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectRuntime } from "../src/runtime.js";
import { runCli } from "../src/cli.js";
import { parseMarkdown } from "../src/parse/markdown.js";
import { bundleStandaloneHtml } from "../src/bundle/inline.js";

describe("Runtime detection", () => {
  it("detects current runtime as bun or node", () => {
    const runtime = detectRuntime();
    expect(["bun", "node"]).toContain(runtime);
  });
});

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
