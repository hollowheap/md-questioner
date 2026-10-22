import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/render", "src/styles"];
const EXTENSIONS = [".ts", ".tsx", ".css"];
const SHELL_CSS = path.join("src", "styles", "global.css");

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const sourceFiles = ROOTS.flatMap(collectFiles);

// A viewport unit is a number followed by vh/vw (optionally the dynamic variants).
const VIEWPORT_UNIT = /(?<![\w.-])(\d+(?:\.\d+)?)(dvh|dvw|vh|vw)\b/g;

/** Returns the CSS block that starts at the opening brace at `startIndex`. */
function extractBlock(css: string, startIndex: number): string {
  let depth = 0;
  for (let i = startIndex; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(startIndex, i + 1);
    }
  }
  return "";
}

function printBlock(css: string): string {
  const printIndex = css.indexOf("@media print");
  if (printIndex === -1) return "";
  const braceIndex = css.indexOf("{", printIndex);
  return braceIndex === -1 ? "" : extractBlock(css, braceIndex);
}

const NAMED_COLORS = "white|black|red|blue|green|gray|grey|orange|yellow|purple|pink|cyan|magenta";
const RAW_COLOR = new RegExp(
  `#[0-9a-fA-F]{3,8}\\b|\\brgba?\\(|\\bhsla?\\(|"(${NAMED_COLORS})"|'(${NAMED_COLORS})'`,
  "g"
);

/** Blanks out comments while preserving line numbers. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/.*$/gm, (line) => " ".repeat(line.length));
}

describe("viewport units", () => {
  it("scans the render and style sources", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(sourceFiles).toContain(SHELL_CSS);
  });

  it("uses no viewport unit other than the shell's 100dvh upgrade", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      for (const match of content.matchAll(VIEWPORT_UNIT)) {
        const isShellUpgrade = match[1] === "100" && match[2] === "dvh" && file === SHELL_CSS;
        if (!isShellUpgrade) {
          offenders.push(`${file}: ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("sizes the shell by percentage with a 100dvh upgrade", () => {
    const css = fs.readFileSync(SHELL_CSS, "utf8");
    expect(css).toMatch(/\.mdq-shell\s*\{[^}]*height:\s*100%;[^}]*height:\s*100dvh;/);
  });

  it("unlocks document scroll when printing", () => {
    const css = fs.readFileSync(SHELL_CSS, "utf8");
    const block = printBlock(css);
    expect(block).not.toBe("");
    expect(block).toMatch(/\.mdq-shell\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible;/);
  });

  it("expresses no width through a numeric Gluestack prop", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles.filter((f) => f.startsWith(path.join("src", "render")))) {
      const content = fs.readFileSync(file, "utf8");
      for (const match of content.matchAll(/\b(maxW|minW|w)=\{\s*-?\d+(\.\d+)?\s*\}/g)) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps raw color literals out of src/render apart from the marked scrims", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles.filter((f) => f.startsWith(path.join("src", "render")))) {
      const lines = stripComments(fs.readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(RAW_COLOR)) {
          if (match[0].includes("transparent")) continue;
          if (!line.toLowerCase().includes("scrim")) {
            offenders.push(`${file}:${index + 1}: ${match[0]}`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
