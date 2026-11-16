import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QuizModel } from "../parse/schema.js";

const __filename =
  typeof import.meta !== "undefined" && typeof import.meta.url === "string"
    ? fileURLToPath(import.meta.url)
    : "";
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

export interface InlineOptions {
  theme?: "light" | "dark" | "auto";
  noShuffle?: boolean;
  title?: string;
  minify?: boolean;
}

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}}</title>
  <style>{{CSS}}</style>
</head>
<body>
  <div id="root"></div>
  <script type="application/json" id="mdq-data">{{DATA}}</script>
  <script>{{JS}}</script>
</body>
</html>`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

const SCRIPT_TAG = /<script\b/i;
const INLINE_HANDLER = /<[a-z][a-z0-9-]*\b[^>]*\son[a-z]+\s*=/i;

/** Refuses to inline author markup that still carries a script or an inline handler. */
function assertInertMarkup(html: string | undefined, where: string): void {
  if (!html) return;
  if (SCRIPT_TAG.test(html) || INLINE_HANDLER.test(html)) {
    throw new Error(
      `Refusing to ship hostile markup in ${where}: a script element or inline event handler survived sanitization.`
    );
  }
}

function assertInertModel(quiz: QuizModel): void {
  for (const section of quiz.sections) {
    for (const question of section.questions) {
      const where = `section "${section.title}" / question "${question.title}"`;
      assertInertMarkup(question.promptHtml, `${where} prompt`);
      assertInertMarkup(question.explanationHtml, `${where} explanation`);
      assertInertMarkup(question.modelAnswerHtml, `${where} model answer`);
    }
  }
}

let cachedPrebundled: { clientJs?: string; clientCss?: string } | null = null;

async function loadPrebundled(): Promise<{ clientJs?: string; clientCss?: string } | null> {
  if (cachedPrebundled) return cachedPrebundled;
  try {
    const gen = await import("./client-bundle.generated.js");
    if (gen && (gen.clientJs || gen.clientCss)) {
      cachedPrebundled = gen;
      return cachedPrebundled;
    }
  } catch {
    try {
      // @ts-ignore
      const gen = await import("./client-bundle.generated.ts");
      if (gen && (gen.clientJs || gen.clientCss)) {
        cachedPrebundled = gen;
        return cachedPrebundled;
      }
    } catch {
      // not generated yet
    }
  }
  return null;
}

export async function bundleStandaloneHtml(
  quiz: QuizModel,
  options: InlineOptions = {}
): Promise<string> {
  const minify = options.minify !== false;

  // Resolve file paths
  const templatePath = path.resolve(__dirname, "template.html");
  const tokensPath = path.resolve(__dirname, "../styles/tokens.css");
  const globalPath = path.resolve(__dirname, "../styles/global.css");
  const entryPath = path.resolve(__dirname, "../render/entry.tsx");

  // Load template
  let template = DEFAULT_TEMPLATE;
  try {
    template = await fs.readFile(templatePath, "utf-8");
  } catch {
    // Fall back to DEFAULT_TEMPLATE
  }

  // Load prebundled assets if available
  const prebundled = await loadPrebundled();

  // Load and bundle CSS
  let inlinedCss = "";
  if (prebundled?.clientCss) {
    inlinedCss = prebundled.clientCss;
  } else {
    let tokensCss = "";
    let globalCss = "";
    try {
      tokensCss = await fs.readFile(tokensPath, "utf-8");
    } catch {}
    try {
      globalCss = await fs.readFile(globalPath, "utf-8");
    } catch {}

    const rawCss = `${tokensCss}\n${globalCss}`;
    inlinedCss = rawCss;
    try {
      const esbuild = await import("esbuild");
      const cssTransform = await esbuild.transform(rawCss, {
        loader: "css",
        minify,
      });
      inlinedCss = cssTransform.code;
    } catch {
      // Keep unminified CSS
    }
  }

  // Load and bundle JS
  let inlinedJs = "";
  if (prebundled?.clientJs) {
    inlinedJs = prebundled.clientJs;
  } else {
    try {
      const esbuild = await import("esbuild");
      const buildResult = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        format: "iife",
        minify,
        target: ["es2020"],
        platform: "browser",
        write: false,
        jsx: "automatic",
        define: {
          "process.env.NODE_ENV": '"production"',
        },
      });
      inlinedJs = buildResult.outputFiles?.[0]?.text || "";
    } catch (err) {
      throw new Error(
        `Failed to bundle the client runtime: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (!inlinedJs.trim()) {
    throw new Error("Client runtime bundle is empty; refusing to emit a quiz without it.");
  }

  assertInertModel(quiz);

  // Override title in quiz model if specified
  const effectiveTitle = options.title || quiz.title || "md-questioner Quiz";
  const modelToSerialize: QuizModel = {
    ...quiz,
    title: effectiveTitle,
  };

  // Prepare sanitized JSON payload
  const payload = {
    model: modelToSerialize,
    noShuffle: Boolean(options.noShuffle),
    theme: options.theme || "auto",
  };
  const inlinedData = sanitizeJson(payload);
  const pageTitle = escapeHtml(effectiveTitle);

  // Replace slots using function replacers to prevent $& / $$ / $' substitutions
  let html = template
    .replace(/{{TITLE}}|<!-- MDQ_TITLE -->/g, () => pageTitle)
    .replace(/{{CSS}}|<!-- MDQ_STYLES -->/g, () => inlinedCss)
    .replace(/{{DATA}}|<!-- MDQ_DATA -->/g, () => inlinedData)
    .replace(/{{JS}}|<!-- MDQ_SCRIPT -->/g, () => inlinedJs);

  if (options.theme && options.theme !== "auto") {
    html = html.replace(/<html([^>]*)>/, `<html$1 data-theme="${options.theme}">`);
  }

  // Enforce < 10 MB hard size budget
  const byteLength = Buffer.byteLength(html, "utf-8");
  const maxBytes = 10 * 1024 * 1024; // 10 MB limit
  if (byteLength > maxBytes) {
    throw new Error(
      `Generated HTML exceeds 10 MB size limit: ${(byteLength / (1024 * 1024)).toFixed(2)} MB`
    );
  }

  return html;
}

export const bundleQuiz = bundleStandaloneHtml;
export const inlineHtml = bundleStandaloneHtml;
export default bundleStandaloneHtml;
