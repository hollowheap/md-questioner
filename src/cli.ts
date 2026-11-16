import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseMarkdown } from "./parse/markdown.js";
import { SchemaValidationError, quizModelSchema, validateQuizModel } from "./parse/validate.js";
import { bundleStandaloneHtml } from "./bundle/inline.js";

export { parseMarkdown, validateQuizModel, SchemaValidationError, bundleStandaloneHtml, quizModelSchema };

interface CliOptions {
  input?: string;
  out: string;
  theme: "light" | "dark" | "auto";
  noShuffle: boolean;
  title?: string;
  quiet: boolean;
  verify: boolean;
  version: boolean;
  help: boolean;
}

function parseCliArgs(args: string[]): { options: CliOptions; usageError?: string } {
  const options: CliOptions = {
    out: "./out/",
    theme: "auto",
    noShuffle: false,
    quiet: false,
    verify: false,
    version: false,
    help: false,
  };
  let usageError: string | undefined;
  const fail = (message: string) => {
    usageError ??= message;
  };

  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-v" || arg === "--version") {
      options.version = true;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--no-shuffle") {
      options.noShuffle = true;
    } else if (arg === "--quiet") {
      options.quiet = true;
    } else if (arg === "--verify") {
      options.verify = true;
    } else if (arg === "-o" || arg === "--out") {
      if (i + 1 < args.length) {
        options.out = args[++i];
      } else {
        fail(`Missing value for ${arg}`);
      }
    } else if (arg.startsWith("-o=")) {
      const value = arg.slice(3);
      if (value) {
        options.out = value;
      } else {
        fail("Missing value for -o");
      }
    } else if (arg.startsWith("--out=")) {
      const value = arg.slice(6);
      if (value) {
        options.out = value;
      } else {
        fail("Missing value for --out");
      }
    } else if (arg === "--theme") {
      if (i + 1 < args.length) {
        const val = args[++i];
        if (val === "light" || val === "dark" || val === "auto") {
          options.theme = val;
        } else {
          fail(`Unsupported theme: ${val}`);
        }
      } else {
        fail("Missing value for --theme");
      }
    } else if (arg.startsWith("--theme=")) {
      const val = arg.slice(8);
      if (val === "light" || val === "dark" || val === "auto") {
        options.theme = val;
      } else {
        fail(`Unsupported theme: ${val}`);
      }
    } else if (arg === "--title") {
      if (i + 1 < args.length) {
        options.title = args[++i];
      } else {
        fail("Missing value for --title");
      }
    } else if (arg.startsWith("--title=")) {
      options.title = arg.slice(8);
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    } else {
      fail(`Unknown option: ${arg}`);
    }
  }

  if (positional.length > 0) {
    options.input = positional[0];
  }

  return { options, usageError };
}

function printUsage(): void {
  console.log(`md-questioner v1.0.0
Compile Markdown study guides into standalone, offline interactive HTML quizzes.

Usage:
  md-questioner <input> [-o <path>] [options]

Arguments:
  <input>                  Path to Markdown study-guide file or directory of .md files

Options:
  -o, --out <path>         Output file or destination directory (default: ./out/)
  --theme <theme>          Theme palette: light, dark, or auto (default: auto)
  --no-shuffle             Disable option shuffling within questions
  --title <title>          Override document title and main heading
  --quiet                  Suppress compilation logs
  --verify                 Run headless browser verification after compiling
  -v, --version            Display version information
  -h, --help               Display help and usage instructions
`);
}

async function renderFile(inputFilePath: string, options: CliOptions): Promise<string> {
  const content = await fs.readFile(inputFilePath, "utf-8");
  const model = parseMarkdown(content, inputFilePath, { validate: true });

  if (options.title) {
    model.title = options.title;
  }

  return bundleStandaloneHtml(model, {
    theme: options.theme,
    noShuffle: options.noShuffle,
    title: options.title || model.title,
  });
}

async function writeOutput(
  inputFilePath: string,
  outputHtmlPath: string,
  html: string,
  options: CliOptions
): Promise<void> {
  const parentDir = path.dirname(outputHtmlPath);
  await fs.mkdir(parentDir, { recursive: true });
  await fs.writeFile(outputHtmlPath, html, "utf-8");

  if (!options.quiet) {
    const bytes = Buffer.byteLength(html, "utf-8");
    console.log(
      `Compiled ${inputFilePath} -> ${outputHtmlPath} (${(bytes / 1024).toFixed(1)} KB)`
    );
  }

  if (options.verify) {
    try {
      const { runHeadlessVerification } = await import("./verify/headless.js");
      const results = await runHeadlessVerification(outputHtmlPath);
      const failed = results.filter((r) => !r.passed);
      if (failed.length > 0) {
        throw new Error(
          `Verification failed:\n` +
            failed.map((f) => ` - ${f.checkName}: ${f.details || "failed"}`).join("\n")
        );
      }
    } catch (err: any) {
      throw new Error(`Verification error for ${outputHtmlPath}: ${err.message || String(err)}`);
    }
  }
}

async function compileFile(
  inputFilePath: string,
  outputHtmlPath: string,
  options: CliOptions
): Promise<void> {
  const html = await renderFile(inputFilePath, options);
  await writeOutput(inputFilePath, outputHtmlPath, html, options);
}

export async function runCli(args: string[] = process.argv.slice(2)): Promise<number> {
  const { options, usageError } = parseCliArgs(args);

  if (options.version) {
    console.log("md-questioner v1.0.0");
    return 0;
  }

  if (options.help) {
    printUsage();
    return 0;
  }

  if (usageError) {
    console.error(`Error: ${usageError}`);
    console.error("Run 'md-questioner --help' for usage instructions.");
    return 1;
  }

  if (!options.input) {
    console.error("Error: Missing required input file or directory.");
    console.error("Run 'md-questioner --help' for usage instructions.");
    return 1;
  }

  const resolvedInput = path.resolve(process.cwd(), options.input);
  let stat: fsSync.Stats;
  try {
    stat = await fs.stat(resolvedInput);
  } catch {
    console.error(`Error: Input file or directory not found: ${options.input}`);
    return 1;
  }

  try {
    if (stat.isDirectory()) {
      // Directory mode
      const entries = await fs.readdir(resolvedInput, { withFileTypes: true });
      const mdFiles = entries
        .filter((e) => e.isFile() && !e.name.startsWith(".") && e.name.endsWith(".md"))
        .map((e) => e.name)
        .sort();

      if (mdFiles.length === 0) {
        console.error(`Error: No non-hidden .md files found in directory: ${options.input}`);
        return 1;
      }

      const outDir = path.resolve(process.cwd(), options.out);
      const rendered: Array<{ inputPath: string; outPath: string; html: string }> = [];

      for (const mdFile of mdFiles) {
        const fullInputPath = path.join(resolvedInput, mdFile);
        const baseName = path.basename(mdFile, path.extname(mdFile));
        const outFilePath = path.join(outDir, `${baseName}.html`);
        try {
          rendered.push({
            inputPath: fullInputPath,
            outPath: outFilePath,
            html: await renderFile(fullInputPath, options),
          });
        } catch (err: any) {
          err.message = `${mdFile}: ${err.message || String(err)}`;
          throw err;
        }
      }

      await fs.mkdir(outDir, { recursive: true });
      for (const item of rendered) {
        await writeOutput(item.inputPath, item.outPath, item.html, options);
      }

      return 0;
    } else {
      // Single file mode
      let targetHtmlPath: string;
      const isOutDirectory =
        options.out.endsWith("/") ||
        options.out.endsWith(path.sep) ||
        (fsSync.existsSync(options.out) && fsSync.statSync(options.out).isDirectory());

      if (isOutDirectory) {
        const baseName = path.basename(resolvedInput, path.extname(resolvedInput));
        targetHtmlPath = path.resolve(process.cwd(), options.out, `${baseName}.html`);
      } else {
        targetHtmlPath = path.resolve(process.cwd(), options.out);
      }

      await compileFile(resolvedInput, targetHtmlPath, options);
      return 0;
    }
  } catch (err: any) {
    if (err instanceof SchemaValidationError || err.name === "SchemaValidationError") {
      console.error(err.message);
      return 2;
    }
    console.error(err.message || String(err));
    return 1;
  }
}

// Execute CLI when invoked as main
const isMain =
  process.env.NODE_ENV !== "test" &&
  Boolean(process.argv[1]) &&
  (
    (typeof import.meta !== "undefined" && typeof import.meta.url === "string" && (
      import.meta.url === pathToFileURL(process.argv[1]).href ||
      path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    )) ||
    process.argv[1].endsWith("/cli.ts") ||
    process.argv[1].endsWith("/md-questioner") ||
    process.argv[1].endsWith("/md-questioner.cjs") ||
    process.argv[1].endsWith("/md-questioner.mjs") ||
    process.argv[1].endsWith("/cli.js")
  );

if (isMain) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
