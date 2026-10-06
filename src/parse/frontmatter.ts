import { parse } from "yaml";
import { Frontmatter } from "./schema.js";

export interface ExtractedFrontmatter {
  frontmatter: Frontmatter;
  body: string;
  bodyStartLine: number;
}

export function extractFrontmatter(markdown: string): ExtractedFrontmatter {
  const lines = markdown.split(/\r?\n/);
  if (lines.length > 0 && lines[0].trim() === "---") {
    let closingIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---" || lines[i].trim() === "...") {
        closingIndex = i;
        break;
      }
    }
    if (closingIndex !== -1) {
      const yamlContent = lines.slice(1, closingIndex).join("\n");
      const body = lines.slice(closingIndex + 1).join("\n");
      const bodyStartLine = closingIndex + 2;
      let parsed: unknown = {};
      if (yamlContent.trim().length > 0) {
        parsed = parse(yamlContent);
      }
      const fmObj =
        typeof parsed === "object" && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};
      const frontmatter: Frontmatter = { ...fmObj };
      return { frontmatter, body, bodyStartLine };
    }
  }
  return {
    frontmatter: {},
    body: markdown,
    bodyStartLine: 1,
  };
}
