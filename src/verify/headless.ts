import { chromium, type Browser } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface VerificationCheckResult {
  checkName: string;
  passed: boolean;
  details?: string;
}

export type VerificationResult = VerificationCheckResult;

export interface VerifyOptions {
  headless?: boolean;
}

/** Well-known system locations, tried after CHROMIUM_PATH and PATH lookup. */
const WELL_KNOWN_CHROMIUM_PATHS = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/run/current-system/sw/bin/chromium",
  "/run/current-system/sw/bin/google-chrome",
];

/** Executable names looked up on PATH (Windows variants appended at runtime). */
const CHROMIUM_EXECUTABLE_NAMES = [
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable",
];

function executableCandidateNames(): string[] {
  if (process.platform !== "win32") {
    return CHROMIUM_EXECUTABLE_NAMES;
  }
  return CHROMIUM_EXECUTABLE_NAMES.flatMap((name) => [`${name}.exe`, name]);
}

/**
 * Finds a Chromium executable on PATH (no shell-out, no extra dependencies).
 */
function findChromiumOnPath(): string | undefined {
  const pathValue = process.env.PATH;
  if (!pathValue) {
    return undefined;
  }

  const names = executableCandidateNames();
  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        if (!fsSync.statSync(candidate).isFile()) {
          continue;
        }
        if (process.platform !== "win32") {
          fsSync.accessSync(candidate, fsSync.constants.X_OK);
        }
        return candidate;
      } catch {
        // Not present or not executable; keep looking.
      }
    }
  }

  return undefined;
}

/**
 * Resolves Chromium executable path in priority order: CHROMIUM_PATH, PATH, then
 * well-known system locations (other explicit env overrides stay honored first).
 */
function resolveChromiumExecutable(): string | undefined {
  const envCandidates = [
    process.env.CHROMIUM_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
  ].filter(Boolean) as string[];

  for (const envPath of envCandidates) {
    if (fsSync.existsSync(envPath)) {
      return envPath;
    }
  }

  const onPath = findChromiumOnPath();
  if (onPath) {
    return onPath;
  }

  for (const candidate of WELL_KNOWN_CHROMIUM_PATHS) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Launches Chromium browser, falling back to system binaries if standard Playwright chromium fails.
 */
async function launchBrowser(headless: boolean): Promise<Browser> {
  const executablePath = resolveChromiumExecutable();
  const launchArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ];

  const attemptedCandidates: string[] = [];

  if (executablePath) {
    attemptedCandidates.push(executablePath);
    try {
      return await chromium.launch({
        headless,
        executablePath,
        args: launchArgs,
      });
    } catch {
      // If launching with configured path fails, fall through to default launch
    }
  }

  attemptedCandidates.push("playwright default (bundled chromium)");
  try {
    return await chromium.launch({
      headless,
      args: launchArgs,
    });
  } catch (err: any) {
    // Attempt fallback to any detected system binary
    const fallbackCandidates = [
      findChromiumOnPath(),
      ...WELL_KNOWN_CHROMIUM_PATHS,
    ].filter((cand): cand is string => Boolean(cand));

    for (const cand of fallbackCandidates) {
      if (fsSync.existsSync(cand) && cand !== executablePath) {
        attemptedCandidates.push(cand);
        try {
          return await chromium.launch({
            headless,
            executablePath: cand,
            args: launchArgs,
          });
        } catch {
          // Continue attempting candidates
        }
      }
    }
    throw new Error(
      `Failed to launch Chromium for headless verification: ${err.message || String(err)}. ` +
        `Set CHROMIUM_PATH to a Chromium/Chrome executable. ` +
        `Candidates tried: ${attemptedCandidates.join(", ")}`
    );
  }
}

/**
 * Executes the §10 headless verification suite against an emitted HTML file.
 */
export async function runHeadlessVerification(
  htmlPath: string,
  options?: VerifyOptions
): Promise<VerificationCheckResult[]> {
  const isHeadless = options?.headless !== false;
  const resolvedPath = path.resolve(process.cwd(), htmlPath);
  const results: VerificationCheckResult[] = [];

  // Check 1: Size cap check (< 10 MB)
  const sizeCapCheck: VerificationCheckResult = {
    checkName: "Size Cap (< 10 MB)",
    passed: false,
  };
  let fileSizeBytes = 0;
  try {
    const stat = await fs.stat(resolvedPath);
    fileSizeBytes = stat.size;
    const maxBytes = 10 * 1024 * 1024;
    if (fileSizeBytes < maxBytes) {
      sizeCapCheck.passed = true;
      sizeCapCheck.details = `File size is ${(fileSizeBytes / 1024).toFixed(1)} KB (under 10 MB limit)`;
    } else {
      sizeCapCheck.passed = false;
      sizeCapCheck.details = `File size ${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB exceeds 10 MB budget`;
    }
  } catch (err: any) {
    sizeCapCheck.passed = false;
    sizeCapCheck.details = `Cannot access file at ${resolvedPath}: ${err.message || String(err)}`;
  }
  results.push(sizeCapCheck);

  if (!sizeCapCheck.passed && fileSizeBytes === 0) {
    // If file does not exist, fail remaining checks with early exit
    const remainingChecks = [
      "Offline Zero Network Calls",
      "React Hydration",
      "Serif Style Application",
      "Content Column Alignment",
      "Theme Toggle Functionality",
      "Code Block and Markdown Content Rendering",
      "Single Scroll Region",
      "Select Theme Conformance",
      "Select Keyboard Contract",
      "Button Hover Tokens",
      "Reduced Motion",
      "State Transitions Animate",
      "Desktop Rail States",
      "Rail Glyphs",
      "Keyboard Shortcuts",
      "State Preservation",
      "Accessibility (axe-core)",
      "Results Summary",
      "Results Persistence",
      "Results Retake",
      "Live Announcements",
      "Print Layout",
      "Mobile Viewport and Question Sheet",
    ];
    for (const check of remainingChecks) {
      results.push({
        checkName: check,
        passed: false,
        details: `Skipped: target file not found at ${resolvedPath}`,
      });
    }
    return results;
  }

  let browser: Browser | null = null;
  const externalRequests: string[] = [];

  const offlineCheck: VerificationCheckResult = {
    checkName: "Offline Zero Network Calls",
    passed: false,
  };
  const hydrationCheck: VerificationCheckResult = {
    checkName: "React Hydration",
    passed: false,
  };
  const styleCheck: VerificationCheckResult = {
    checkName: "Serif Style Application",
    passed: false,
  };
  const columnCheck: VerificationCheckResult = {
    checkName: "Content Column Alignment",
    passed: false,
  };
  const scrollRegionCheck: VerificationCheckResult = {
    checkName: "Single Scroll Region",
    passed: false,
  };
  const selectThemeCheck: VerificationCheckResult = {
    checkName: "Select Theme Conformance",
    passed: false,
  };
  const selectKeyboardCheck: VerificationCheckResult = {
    checkName: "Select Keyboard Contract",
    passed: false,
  };
  const buttonHoverCheck: VerificationCheckResult = {
    checkName: "Button Hover Tokens",
    passed: false,
  };
  const reducedMotionCheck: VerificationCheckResult = {
    checkName: "Reduced Motion",
    passed: false,
  };
  const transitionCheck: VerificationCheckResult = {
    checkName: "State Transitions Animate",
    passed: false,
  };
  const railStateCheck: VerificationCheckResult = {
    checkName: "Desktop Rail States",
    passed: false,
  };
  const railGlyphCheck: VerificationCheckResult = {
    checkName: "Rail Glyphs",
    passed: false,
  };
  const shortcutCheck: VerificationCheckResult = {
    checkName: "Keyboard Shortcuts",
    passed: false,
  };
  const statePreservationCheck: VerificationCheckResult = {
    checkName: "State Preservation",
    passed: false,
  };
  const accessibilityCheck: VerificationCheckResult = {
    checkName: "Accessibility (axe-core)",
    passed: false,
  };
  const resultsCheck: VerificationCheckResult = {
    checkName: "Results Summary",
    passed: false,
  };
  const resultsPersistenceCheck: VerificationCheckResult = {
    checkName: "Results Persistence",
    passed: false,
  };
  const resultsRetakeCheck: VerificationCheckResult = {
    checkName: "Results Retake",
    passed: false,
  };
  const liveRegionCheck: VerificationCheckResult = {
    checkName: "Live Announcements",
    passed: false,
  };
  const printCheck: VerificationCheckResult = {
    checkName: "Print Layout",
    passed: false,
  };
  const themeToggleCheck: VerificationCheckResult = {
    checkName: "Theme Toggle Functionality",
    passed: false,
  };
  const proseAndCodeCheck: VerificationCheckResult = {
    checkName: "Code Block and Markdown Content Rendering",
    passed: false,
  };
  const mobileViewportCheck: VerificationCheckResult = {
    checkName: "Mobile Viewport and Question Sheet",
    passed: false,
  };

  try {
    browser = await launchBrowser(isHeadless);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // Check 2: Offline check - Intercept requests and catch any HTTP/HTTPS calls
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.startsWith("http://") || reqUrl.startsWith("https://")) {
        externalRequests.push(reqUrl);
        route.abort("blockedbyclient");
      } else {
        route.continue();
      }
    });

    const fileUrl = pathToFileURL(resolvedPath).href;
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });

    // The app renders after hydration; wait for it so late requests are counted.
    await page
      .waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 })
      .catch(() => undefined);
    await page.waitForTimeout(800);

    if (externalRequests.length === 0) {
      offlineCheck.passed = true;
      offlineCheck.details = "Zero external HTTP/HTTPS network calls made";
    } else {
      offlineCheck.passed = false;
      offlineCheck.details = `External network calls detected (${externalRequests.length}): ${externalRequests.join(", ")}`;
    }
    results.push(offlineCheck);

    // Check 3: React hydration - Element with [data-testid="mdq-root"] must be visible
    try {
      const rootLocator = page.locator('[data-testid="mdq-root"]');
      await rootLocator.waitFor({ state: "visible", timeout: 8000 });
      hydrationCheck.passed = true;
      hydrationCheck.details = 'Element with [data-testid="mdq-root"] is present and visible';
    } catch {
      hydrationCheck.passed = false;
      hydrationCheck.details = 'Element with [data-testid="mdq-root"] was not visible within timeout';
    }
    results.push(hydrationCheck);

    // Check 4: Style application - Body or H1 computed font-family contains serif
    try {
      const fontFamilies = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const h1Font = h1 ? window.getComputedStyle(h1).fontFamily : "";
        const bodyFont = window.getComputedStyle(document.body).fontFamily;
        return { h1Font, bodyFont };
      });

      const combinedFonts = `${fontFamilies.h1Font} ${fontFamilies.bodyFont}`.toLowerCase();
      const hasSerif =
        combinedFonts.includes("iowan old style") ||
        combinedFonts.includes("charter") ||
        combinedFonts.includes("georgia") ||
        combinedFonts.includes("serif");

      if (hasSerif) {
        styleCheck.passed = true;
        styleCheck.details = `Serif font family detected in computed styles (body: ${fontFamilies.bodyFont || "none"}, h1: ${fontFamilies.h1Font || "none"})`;
      } else {
        styleCheck.passed = false;
        styleCheck.details = `Computed font families did not match expected serif fonts (body: ${fontFamilies.bodyFont}, h1: ${fontFamilies.h1Font})`;
      }
    } catch (err: any) {
      styleCheck.passed = false;
      styleCheck.details = `Error inspecting computed font-family: ${err.message || String(err)}`;
    }
    results.push(styleCheck);

    // Check 4b: Content column - the 800px column is centered and shared by header, content, and stepper
    try {
      const columnState = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('[role="main"]');
        if (!main) return { error: "Main region not found" };

        const findColumn = (root: Element | null): HTMLElement | null => {
          if (!root) return null;
          const candidates = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
          return (
            (candidates.find(
              (el) => window.getComputedStyle(el).maxWidth === "800px"
            ) as HTMLElement | undefined) ?? null
          );
        };

        const header = main.children[0] as HTMLElement | undefined;
        const scroller = main.children[1] as HTMLElement | undefined;
        const stepper = main.querySelector<HTMLElement>('[data-testid="mdq-stepper"]');

        const columns = {
          header: findColumn(header ?? null),
          content: findColumn(scroller ?? null),
          stepper: findColumn(stepper),
        };

        const measure = (el: HTMLElement | null) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const paddingLeft = parseFloat(window.getComputedStyle(el).paddingLeft) || 0;
          return {
            width: Math.round(rect.width),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            textLeft: Math.round(rect.left + paddingLeft),
          };
        };

        const mainRect = main.getBoundingClientRect();
        const sheet = columns.content;
        const sheetStyle = sheet ? window.getComputedStyle(sheet) : null;
        const questionBox = document.querySelector('[data-testid="mdq-question-body"] > div');
        const questionStyle = questionBox ? window.getComputedStyle(questionBox) : null;
        return {
          measured: {
            header: measure(columns.header),
            content: measure(columns.content),
            stepper: measure(columns.stepper),
          },
          mainLeft: Math.round(mainRect.left),
          mainRight: Math.round(mainRect.right),
          sheetSideRules: sheetStyle
            ? [sheetStyle.borderLeftWidth, sheetStyle.borderRightWidth]
            : null,
          questionBorder: questionStyle ? questionStyle.borderTopWidth : null,
        };
      });

      const { measured, mainLeft, mainRight, sheetSideRules, questionBorder } = columnState as {
        measured: Record<string, { width: number; left: number; right: number; textLeft: number } | null>;
        mainLeft: number;
        mainRight: number;
        sheetSideRules: string[] | null;
        questionBorder: string | null;
      };

      const missing = Object.entries(measured)
        .filter(([, value]) => !value)
        .map(([key]) => key);

      if (missing.length > 0) {
        columnCheck.passed = false;
        columnCheck.details = `No 800px column found for: ${missing.join(", ")}`;
      } else {
        const header = measured.header!;
        const content = measured.content!;
        const stepper = measured.stepper!;
        const widths = [header.width, content.width, stepper.width];
        const textLefts = [header.textLeft, content.textLeft, stepper.textLeft];
        const aligned = textLefts.every((value) => Math.abs(value - textLefts[0]) <= 1);
        const allCapped = widths.every((value) => value === 800);
        const contentGapLeft = content.left - mainLeft;
        const contentGapRight = mainRight - content.right;
        const centered = Math.abs(contentGapLeft - contentGapRight) <= 1;
        const framed = Boolean(
          sheetSideRules &&
            sheetSideRules.every((width) => parseFloat(width) >= 1) &&
            questionBorder !== null &&
            parseFloat(questionBorder) === 0
        );

        if (allCapped && aligned && centered && framed) {
          columnCheck.passed = true;
          columnCheck.details = `Content column is 800px and centered (gaps ${contentGapLeft}/${contentGapRight}); header, content, and stepper text share left edge ${textLefts[0]}px; the sheet side rules connect the header and footer rules`;
        } else if (!framed) {
          columnCheck.passed = false;
          columnCheck.details = `The frame is not connected: sheet side rules [${(sheetSideRules ?? []).join(", ")}], question border ${questionBorder}`;
        } else {
          columnCheck.passed = false;
          columnCheck.details = `Column widths [${widths.join(", ")}], text left edges [${textLefts.join(", ")}], content gaps [${contentGapLeft}/${contentGapRight}]`;
        }
      }
    } catch (err: any) {
      columnCheck.passed = false;
      columnCheck.details = `Error verifying content column: ${err.message || String(err)}`;
    }
    results.push(columnCheck);

    // Check 5: Theme toggle - Clicking theme toggle flips data-theme and changes computed accent color
    try {
      const getThemeState = async () => {
        return await page.evaluate(() => {
          const html = document.documentElement;
          const themeAttr = html.getAttribute("data-theme") || "";
          const rawAccent = window.getComputedStyle(html).getPropertyValue("--color-accent").trim();
          const primaryBtn =
            document.querySelector<HTMLElement>('button[data-variant="solid"]') ||
            document.querySelector<HTMLElement>('.mdq-btn-primary') ||
            document.querySelector<HTMLElement>('button');
          const resolvedAccent = primaryBtn
            ? window.getComputedStyle(primaryBtn).backgroundColor
            : rawAccent;
          return { themeAttr, rawAccent, resolvedAccent };
        });
      };

      const initialTheme = await getThemeState();
      const themeToggleBtn = page
        .locator('[data-testid="mdq-theme-toggle"]')
        .or(page.locator('[aria-label*="Toggle theme"]'))
        .or(page.locator(".mdq-theme-toggle"));
      await themeToggleBtn.waitFor({ state: "visible", timeout: 4000 });
      await themeToggleBtn.click();
      await page.waitForTimeout(100);

      let updatedTheme = await getThemeState();

      // If initial was 'auto' and matched system scheme, cycle once more to reach opposite theme
      if (
        updatedTheme.themeAttr === initialTheme.themeAttr ||
        updatedTheme.rawAccent === initialTheme.rawAccent
      ) {
        await themeToggleBtn.click();
        await page.waitForTimeout(100);
        updatedTheme = await getThemeState();
      }

      const themeFlipped = updatedTheme.themeAttr !== initialTheme.themeAttr;
      const accentChanged =
        updatedTheme.rawAccent !== initialTheme.rawAccent ||
        updatedTheme.resolvedAccent !== initialTheme.resolvedAccent;

      if (themeFlipped && accentChanged) {
        themeToggleCheck.passed = true;
        themeToggleCheck.details = `Theme flipped from "${initialTheme.themeAttr}" to "${updatedTheme.themeAttr}"; accent changed (${initialTheme.rawAccent} -> ${updatedTheme.rawAccent})`;
      } else if (themeFlipped) {
        themeToggleCheck.passed = true;
        themeToggleCheck.details = `data-theme attribute flipped from "${initialTheme.themeAttr}" to "${updatedTheme.themeAttr}"`;
      } else {
        themeToggleCheck.passed = false;
        themeToggleCheck.details = `Theme did not flip after toggle click (initial: "${initialTheme.themeAttr}", current: "${updatedTheme.themeAttr}")`;
      }
    } catch (err: any) {
      themeToggleCheck.passed = false;
      themeToggleCheck.details = `Error testing theme toggle: ${err.message || String(err)}`;
    }
    results.push(themeToggleCheck);

    // Check 6: Prose & Code block rendering (code blocks, explanations, model answers)
    try {
      // 1. Explanation verification:
      const optionParis = page.locator('text="Paris"').first();
      await optionParis.waitFor({ state: "visible", timeout: 4000 });
      await optionParis.click();
      const checkBtn = page.locator('button:has-text("Check Answer")').first();
      await checkBtn.waitFor({ state: "visible", timeout: 4000 });
      await checkBtn.click();
      await page.waitForTimeout(100);

      const explanationLocator = page.locator('text="Paris is the capital and largest city of France."').first();
      await explanationLocator.waitFor({ state: "visible", timeout: 4000 });
      const hasExplanation = await explanationLocator.isVisible();
      if (!hasExplanation) {
        throw new Error("Explanation text was not rendered into DOM after checking answer");
      }

      // 2. Code block verification (pre code.hljs):
      const betaTab = page.locator(':is(button, [role="tab"]):has-text("Section Beta")').first();
      await betaTab.waitFor({ state: "visible", timeout: 4000 });
      await betaTab.click();
      await page.waitForTimeout(100);

      const q3Nav = page.locator('button:has-text("What does this TypeScript function return?")').first();
      await q3Nav.waitFor({ state: "visible", timeout: 4000 });
      await q3Nav.click();
      await page.waitForTimeout(100);

      const codeBlockLocator = page.locator("pre code.hljs").first();
      await codeBlockLocator.waitFor({ state: "visible", timeout: 4000 });
      const hasCodeBlock = await codeBlockLocator.isVisible();
      const codeBlockContent = await codeBlockLocator.textContent();
      if (!hasCodeBlock || !codeBlockContent || !codeBlockContent.includes("function add")) {
        throw new Error("Code block (pre code.hljs) was not rendered into DOM with expected content");
      }

      // Also verify question explanation is rendered
      const notesElem = page.locator('text="Explain why the return type is explicitly annotated."').first();
      await notesElem.waitFor({ state: "visible", timeout: 4000 });

      // 3. Model answer verification:
      const q4Nav = page.locator('button:has-text("Explain the trade-offs of database indexing")').first();
      await q4Nav.waitFor({ state: "visible", timeout: 4000 });
      await q4Nav.click();
      await page.waitForTimeout(100);

      const essayTextarea = page.locator("textarea").first();
      await essayTextarea.waitFor({ state: "visible", timeout: 4000 });
      await essayTextarea.fill("Database indexing uses B-tree structures to reduce disk I/O operations.");

      const reviewBtn = page.locator('button:has-text("Check & Review")').first();
      await reviewBtn.waitFor({ state: "visible", timeout: 4000 });
      await reviewBtn.click();
      await page.waitForTimeout(100);

      const modelAnswerLocator = page.getByText("Database indexes commonly utilize B-tree").first();
      await modelAnswerLocator.waitFor({ state: "visible", timeout: 4000 });
      const hasModelAnswer = await modelAnswerLocator.isVisible();
      if (!hasModelAnswer) {
        throw new Error("Model answer was not rendered into DOM after submitting essay");
      }

      proseAndCodeCheck.passed = true;
      proseAndCodeCheck.details = "Code blocks (pre code.hljs), explanations, and model answers are rendered in the DOM";
    } catch (err: any) {
      proseAndCodeCheck.passed = false;
      proseAndCodeCheck.details = `Error verifying prose and code rendering: ${err.message || String(err)}`;
    }
    results.push(proseAndCodeCheck);

    // Check 6b: Single scroll region - the document never scrolls, the content region does
    try {
      const essayNav = page
        .locator('button:has-text("Explain the trade-offs of database indexing")')
        .first();
      if (await essayNav.isVisible().catch(() => false)) {
        await essayNav.click();
        await page.waitForTimeout(200);
        const essayTextarea = page.locator("textarea").first();
        if (await essayTextarea.isVisible().catch(() => false)) {
          await essayTextarea
            .fill(
              "Database indexing uses B-tree structures to reduce disk I/O operations. ".repeat(12)
            )
            .catch(() => undefined);
        }
        await page.waitForTimeout(200);
      }

      const scrollState = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('[role="main"]');
        const scroller = main
          ? Array.from(main.querySelectorAll<HTMLElement>("div")).find((el) => {
              const style = window.getComputedStyle(el);
              return (
                (style.overflowY === "auto" || style.overflowY === "scroll") &&
                el.scrollHeight > el.clientHeight
              );
            }) ?? null
          : null;
        return {
          documentScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
          bodyScrolls: document.body.scrollHeight > window.innerHeight + 1,
          scroller: scroller
            ? { client: scroller.clientHeight, scroll: scroller.scrollHeight }
            : null,
        };
      });

      if (scrollState.documentScrolls || scrollState.bodyScrolls) {
        scrollRegionCheck.passed = false;
        scrollRegionCheck.details = "The document itself scrolls; the shell must be the only scroll container";
      } else if (!scrollState.scroller) {
        scrollRegionCheck.passed = false;
        scrollRegionCheck.details = "No scrollable content region found inside the main column";
      } else {
        scrollRegionCheck.passed = true;
        scrollRegionCheck.details = `Document does not scroll; content region scrolls internally (${scrollState.scroller.scroll}px content in ${scrollState.scroller.client}px viewport)`;
      }
    } catch (err: any) {
      scrollRegionCheck.passed = false;
      scrollRegionCheck.details = `Error verifying the scroll region: ${err.message || String(err)}`;
    }
    results.push(scrollRegionCheck);

    // Check 6c: Select theme conformance - no native <select>, listbox colors come from the token vars
    try {
      const setTheme = async (target: "light" | "dark") => {
        for (let attempt = 0; attempt < 4; attempt++) {
          const current = await page.evaluate(() =>
            document.documentElement.getAttribute("data-theme")
          );
          if (current === target) return;
          await page.locator('[data-testid="mdq-theme-toggle"]').first().click();
          await page.waitForTimeout(300);
        }
      };

      const matchNav = page.locator('button:has-text("Match the language")').first();
      await matchNav.waitFor({ state: "visible", timeout: 4000 });
      await matchNav.click();
      const trigger = page.locator(".mdq-select-trigger").first();
      await trigger.waitFor({ state: "visible", timeout: 4000 });
      await page.waitForTimeout(300);

      const measureListbox = async () =>
        await page.evaluate(() => {
          const probe = document.createElement("div");
          probe.style.cssText =
            "position:absolute;top:-9999px;visibility:hidden;background:var(--color-card);color:var(--color-text);border:1px solid var(--color-border);";
          document.body.appendChild(probe);
          const probeStyle = window.getComputedStyle(probe);
          const reference = {
            card: probeStyle.backgroundColor,
            text: probeStyle.color,
            border: probeStyle.borderTopColor,
          };
          probe.remove();

          const accentProbe = document.createElement("div");
          accentProbe.style.cssText =
            "position:absolute;top:-9999px;visibility:hidden;background:var(--color-accent-bg);color:var(--color-accent);";
          document.body.appendChild(accentProbe);
          const accentStyle = window.getComputedStyle(accentProbe);
          const accent = { bg: accentStyle.backgroundColor, color: accentStyle.color };
          accentProbe.remove();

          const read = (selector: string) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const style = window.getComputedStyle(el);
            return {
              bg: style.backgroundColor,
              color: style.color,
              border: style.borderTopColor,
            };
          };

          return {
            theme: document.documentElement.getAttribute("data-theme"),
            nativeSelects: document.querySelectorAll("select").length,
            reference,
            accent,
            trigger: read(".mdq-select-trigger"),
            popup: read(".mdq-select-popup"),
            option: read('.mdq-select-option[data-highlighted="true"]'),
          };
        });

      const samples: Record<string, any> = {};
      for (const theme of ["light", "dark"] as const) {
        await setTheme(theme);
        await trigger.click();
        await page.waitForSelector(".mdq-select-popup", { timeout: 4000 });
        await page.waitForTimeout(300);
        // Park the pointer so the trigger is measured in its resting state.
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
        samples[theme] = await measureListbox();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      const problems: string[] = [];
      for (const theme of ["light", "dark"] as const) {
        const sample = samples[theme];
        if (sample.nativeSelects !== 0) {
          problems.push(`${theme}: ${sample.nativeSelects} native <select> element(s) present`);
        }
        if (!sample.popup) {
          problems.push(`${theme}: select popup not rendered`);
          continue;
        }
        if (sample.trigger.bg !== sample.reference.card) {
          problems.push(`${theme}: trigger background ${sample.trigger.bg} != --color-card ${sample.reference.card}`);
        }
        if (sample.trigger.color !== sample.reference.text) {
          problems.push(`${theme}: trigger text ${sample.trigger.color} != --color-text ${sample.reference.text}`);
        }
        if (sample.trigger.border !== sample.reference.border) {
          // The trigger border switches to the accent on hover and focus.
          if (sample.trigger.border !== sample.accent.color) {
            problems.push(`${theme}: trigger border ${sample.trigger.border} is neither --color-border ${sample.reference.border} nor --color-accent ${sample.accent.color}`);
          }
        }
        if (sample.popup.bg !== sample.reference.card) {
          problems.push(`${theme}: popup background ${sample.popup.bg} != --color-card ${sample.reference.card}`);
        }
        if (sample.popup.color !== sample.reference.text) {
          problems.push(`${theme}: popup text ${sample.popup.color} != --color-text ${sample.reference.text}`);
        }
        if (sample.popup.border !== sample.reference.border) {
          problems.push(`${theme}: popup border ${sample.popup.border} != --color-border ${sample.reference.border}`);
        }
        if (!sample.option) {
          problems.push(`${theme}: no highlighted option rendered`);
        } else {
          if (sample.option.bg !== sample.accent.bg) {
            problems.push(`${theme}: option background ${sample.option.bg} != --color-accent-bg ${sample.accent.bg}`);
          }
          if (sample.option.color !== sample.accent.color) {
            problems.push(`${theme}: option text ${sample.option.color} != --color-accent ${sample.accent.color}`);
          }
        }
      }

      if (
        samples.light?.reference?.card &&
        samples.dark?.reference?.card &&
        samples.light.reference.card === samples.dark.reference.card
      ) {
        problems.push("light and dark resolve to the same card color; the theme is not switching");
      }

      if (problems.length === 0) {
        selectThemeCheck.passed = true;
        selectThemeCheck.details = `No native <select>; listbox trigger, popup, and options resolve to the token vars in light (${samples.light.reference.card}) and dark (${samples.dark.reference.card})`;
      } else {
        selectThemeCheck.passed = false;
        selectThemeCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      selectThemeCheck.passed = false;
      selectThemeCheck.details = `Error verifying select theme conformance: ${err.message || String(err)}`;
    }
    results.push(selectThemeCheck);

    // Check 6d: Select keyboard contract - combobox/listbox ARIA, arrow navigation, selection, dismissal
    try {
      const matchNav = page.locator('button:has-text("Match the language")').first();
      await matchNav.waitFor({ state: "visible", timeout: 4000 });
      await matchNav.click();
      const trigger = page.locator(".mdq-select-trigger").first();
      await trigger.waitFor({ state: "visible", timeout: 4000 });
      await page.waitForTimeout(200);

      const readState = async () =>
        await page.evaluate(() => {
          const triggerEl = document.querySelector(".mdq-select-trigger");
          const listEl = document.querySelector(".mdq-select-popup");
          const options = Array.from(document.querySelectorAll(".mdq-select-option"));
          return {
            role: triggerEl?.getAttribute("role") ?? null,
            hasPopup: triggerEl?.getAttribute("aria-haspopup") ?? null,
            expanded: triggerEl?.getAttribute("aria-expanded") ?? null,
            activeDescendant: listEl?.getAttribute("aria-activedescendant") ?? null,
            listRole: listEl?.getAttribute("role") ?? null,
            optionCount: options.length,
            optionRoles: options.map((o) => o.getAttribute("role")),
            highlighted: options
              .filter((o) => o.getAttribute("data-highlighted") === "true")
              .map((o) => o.textContent?.trim() ?? ""),
            triggerText: triggerEl?.textContent?.trim() ?? "",
            triggerFocused:
              triggerEl instanceof HTMLElement && document.activeElement === triggerEl,
          };
        });

      const problems: string[] = [];
      const initial = await readState();
      if (initial.role !== "combobox") problems.push(`trigger role is ${initial.role}`);
      if (initial.hasPopup !== "listbox") problems.push(`aria-haspopup is ${initial.hasPopup}`);
      if (initial.expanded !== "false") problems.push(`aria-expanded starts at ${initial.expanded}`);

      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(250);
      const opened = await readState();
      if (opened.expanded !== "true") problems.push(`aria-expanded after ArrowDown is ${opened.expanded}`);
      if (opened.listRole !== "listbox") problems.push(`popup role is ${opened.listRole}`);
      if (opened.optionCount === 0) problems.push("no options rendered");
      if (opened.optionRoles.some((role) => role !== "option")) {
        problems.push("an option is missing role=option");
      }
      if (!opened.activeDescendant) problems.push("aria-activedescendant is missing");

      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(200);
      const moved = await readState();
      if (moved.activeDescendant === opened.activeDescendant) {
        problems.push("ArrowDown did not move aria-activedescendant");
      }

      const chosen = moved.highlighted[0] ?? "";
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
      const selected = await readState();
      if (selected.expanded !== "false") problems.push(`aria-expanded after Enter is ${selected.expanded}`);
      if (!selected.triggerText.includes(chosen)) {
        problems.push(`trigger text "${selected.triggerText}" does not show the chosen option "${chosen}"`);
      }
      if (!selected.triggerFocused) problems.push("trigger did not regain focus after selection");

      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(250);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const escaped = await readState();
      if (escaped.expanded !== "false") problems.push(`aria-expanded after Escape is ${escaped.expanded}`);
      if (!escaped.triggerFocused) problems.push("trigger did not regain focus after Escape");

      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(250);
      await page.locator('[role="main"] > div').first().click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(250);
      const dismissed = await readState();
      if (dismissed.expanded !== "false") {
        problems.push(`aria-expanded after an outside click is ${dismissed.expanded}`);
      }

      if (problems.length === 0) {
        selectKeyboardCheck.passed = true;
        selectKeyboardCheck.details = `Listbox exposes the combobox/listbox contract; arrows move the highlight, Enter selects ("${chosen}"), Escape and outside clicks close the popup and return focus to the trigger`;
      } else {
        selectKeyboardCheck.passed = false;
        selectKeyboardCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      selectKeyboardCheck.passed = false;
      selectKeyboardCheck.details = `Error verifying the select keyboard contract: ${err.message || String(err)}`;
    }
    results.push(selectKeyboardCheck);

    // Check 6e: Button hover tokens - settled hover colors come from the token palette, never the library gray
    try {
      const LIBRARY_HOVER_GRAY = "rgb(115, 115, 115)";
      const EXPECTED = {
        light: {
          secondaryBorder: "rgb(93, 42, 26)", // $primary500
          secondaryText: "rgb(77, 34, 21)", // $primary600
          primaryHoverBg: "rgb(77, 34, 21)", // $primary600
        },
        dark: {
          secondaryBorder: "rgb(127, 184, 138)", // $dmAccent
          secondaryText: "rgb(127, 184, 138)", // $dmAccent
          primaryHoverBg: "rgb(152, 201, 161)", // $dmAccentHover
        },
      } as const;

      const setTheme = async (target: "light" | "dark") => {
        for (let attempt = 0; attempt < 4; attempt++) {
          const current = await page.evaluate(() =>
            document.documentElement.getAttribute("data-theme")
          );
          if (current === target) return;
          await page.locator('[data-testid="mdq-theme-toggle"]').first().click();
          await page.waitForTimeout(300);
        }
      };

      const readButton = async (locator: ReturnType<typeof page.locator>) =>
        await locator.evaluate((el) => {
          const style = window.getComputedStyle(el);
          const label = el.querySelector("span,div");
          const labelStyle = label ? window.getComputedStyle(label) : null;
          return {
            bg: style.backgroundColor,
            border: style.borderTopColor,
            text: labelStyle ? labelStyle.color : style.color,
          };
        });

      const problems: string[] = [];
      const observed: Record<string, any> = {};

      for (const theme of ["light", "dark"] as const) {
        await setTheme(theme);
        const expected = EXPECTED[theme];

        // Every button, hovered and settled: the library gray must not appear.
        const buttons = await page.$$("button");
        for (const button of buttons) {
          const label = (await button.textContent())?.trim().slice(0, 24) ?? "";
          if (!label) continue;
          await button.hover();
          await page.waitForTimeout(320);
          const colors = await button.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              bg: style.backgroundColor,
              border: style.borderTopColor,
              color: style.color,
            };
          });
          for (const [property, value] of Object.entries(colors)) {
            if (value === LIBRARY_HOVER_GRAY) {
              problems.push(`${theme}: "${label}" ${property} is the library hover gray ${LIBRARY_HOVER_GRAY}`);
            }
          }
        }
        await page.mouse.move(0, 0);
        await page.waitForTimeout(150);

        // Secondary (outline) button: hover border and text follow the accent ramp.
        const shuffle = page.locator('button:has-text("Shuffle")').first();
        await shuffle.hover();
        await page.waitForTimeout(420);
        const secondary = await readButton(shuffle);
        if (!secondary) {
          problems.push(`${theme}: no secondary button found`);
        } else {
          if (secondary.border !== expected.secondaryBorder) {
            problems.push(`${theme}: secondary hover border ${secondary.border} != ${expected.secondaryBorder}`);
          }
          if (secondary.text !== expected.secondaryText) {
            problems.push(`${theme}: secondary hover text ${secondary.text} != ${expected.secondaryText}`);
          }
        }
        observed[`${theme}.secondary`] = secondary;

        // Primary (solid) button: hover background follows the primary/dark accent ramp.
        const next = page.locator('button:has-text("Next")').first();
        await next.hover();
        await page.waitForTimeout(420);
        const primary = await readButton(next);
        if (!primary) {
          problems.push(`${theme}: no primary button found`);
        } else if (primary.bg !== expected.primaryHoverBg) {
          problems.push(`${theme}: primary hover background ${primary.bg} != ${expected.primaryHoverBg}`);
        }
        observed[`${theme}.primary`] = primary;
      }

      if (
        observed["light.secondary"] &&
        observed["dark.secondary"] &&
        observed["light.secondary"].border === observed["dark.secondary"].border
      ) {
        problems.push("light and dark resolve to the same secondary hover border");
      }

      if (problems.length === 0) {
        buttonHoverCheck.passed = true;
        buttonHoverCheck.details = `Settled hover colors are token-based in both themes (secondary border ${observed["light.secondary"]?.border} light / ${observed["dark.secondary"]?.border} dark); the library hover gray is absent`;
      } else {
        buttonHoverCheck.passed = false;
        buttonHoverCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      buttonHoverCheck.passed = false;
      buttonHoverCheck.details = `Error verifying button hover tokens: ${err.message || String(err)}`;
    }
    results.push(buttonHoverCheck);

    // Check 6f: Reduced motion - no color transitions and no transform animation when the user asks for it
    try {
      if (!browser) throw new Error("Browser is not available");

      const sampleMotion = async (reducedMotion: "reduce" | "no-preference") => {
        const context = await browser!.newContext({
          viewport: { width: 1280, height: 800 },
          reducedMotion,
        });
        const samplePage = await context.newPage();
        await samplePage.goto(fileUrl, { waitUntil: "domcontentloaded" });
        await samplePage.waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 });
        await samplePage.waitForTimeout(400);

        const nav = samplePage.locator('button:has-text("Match the language")').first();
        if (await nav.isVisible().catch(() => false)) {
          await nav.click();
          await samplePage.waitForTimeout(300);
        }
        const trigger = samplePage.locator(".mdq-select-trigger").first();
        if (await trigger.isVisible().catch(() => false)) {
          await trigger.click();
          await samplePage.waitForTimeout(30);
        }

        const early = await samplePage.evaluate(() => {
          const popup = document.querySelector(".mdq-select-popup");
          const root = document.querySelector('[data-testid="mdq-root"]');
          const rootStyle = root ? window.getComputedStyle(root) : null;
          return {
            transform: popup ? window.getComputedStyle(popup).transform : null,
            transitionDuration: rootStyle ? rootStyle.transitionDuration : null,
          };
        });

        await samplePage.waitForTimeout(500);
        const late = await samplePage.evaluate(() => {
          const popup = document.querySelector(".mdq-select-popup");
          return {
            transform: popup ? window.getComputedStyle(popup).transform : null,
          };
        });

        await context.close();
        return { early, late };
      };

      const reduced = await sampleMotion("reduce");
      const normal = await sampleMotion("no-preference");
      const problems: string[] = [];

      const isIdentity = (value: string | null) =>
        value === null ||
        value === "none" ||
        value === "matrix(1, 0, 0, 1, 0, 0)" ||
        value === "scale(1)";

      if (reduced.early.transitionDuration !== "0s") {
        problems.push(
          `color transitions are still active under reduced motion (transition-duration ${reduced.early.transitionDuration})`
        );
      }
      if (!isIdentity(reduced.early.transform)) {
        problems.push(`the select popup is transformed mid-animation under reduced motion (${reduced.early.transform})`);
      }
      if (reduced.early.transform !== reduced.late.transform) {
        problems.push(
          `the select popup transform still animates under reduced motion (${reduced.early.transform} -> ${reduced.late.transform})`
        );
      }
      if (normal.early.transitionDuration === "0s") {
        problems.push("no color transition is active with normal motion; the reduced-motion check cannot discriminate");
      }

      if (problems.length === 0) {
        reducedMotionCheck.passed = true;
        reducedMotionCheck.details = `Under prefers-reduced-motion: reduce there are no color transitions (duration ${reduced.early.transitionDuration}) and the popup transform is static (${reduced.early.transform}); normal motion keeps a ${normal.early.transitionDuration} color transition`;
      } else {
        reducedMotionCheck.passed = false;
        reducedMotionCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      reducedMotionCheck.passed = false;
      reducedMotionCheck.details = `Error verifying reduced motion: ${err.message || String(err)}`;
    }
    results.push(reducedMotionCheck);

    // Check 6g: State transitions animate - popup, retake modal, hint panel, and question body animate
    try {
      const problems: string[] = [];

      // First frame on which the element exists, captured in-page so the sample is not late.
      const firstFrame = async (testId: string) =>
        await page.evaluate(
          (id) =>
            new Promise<string | null>((resolve) => {
              const tick = () => {
                const el = document.querySelector(`[data-testid="${id}"]`);
                if (el) {
                  const style = window.getComputedStyle(el);
                  resolve(
                    JSON.stringify({
                      transform: style.transform,
                      opacity: style.opacity,
                      height: style.height,
                    })
                  );
                } else {
                  requestAnimationFrame(tick);
                }
              };
              requestAnimationFrame(tick);
            }),
          testId
        );

      const settled = async (testId: string) =>
        await page.evaluate((id) => {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (!el) return null;
          const style = window.getComputedStyle(el);
          return JSON.stringify({
            transform: style.transform,
            opacity: style.opacity,
            height: style.height,
          });
        }, testId);

      const stillMounted = async (testId: string) =>
        await page.evaluate(
          (id) =>
            new Promise<boolean>((resolve) => {
              requestAnimationFrame(() => {
                resolve(Boolean(document.querySelector(`[data-testid="${id}"]`)));
              });
            }),
          testId
        );

      const gone = async (testId: string) =>
        await page.evaluate((id) => !document.querySelector(`[data-testid="${id}"]`), testId);

      // 1. Select popup: animates in and out.
      const matchNav = page.locator('button:has-text("Match the language")').first();
      await matchNav.waitFor({ state: "visible", timeout: 4000 });
      await matchNav.click();
      const trigger = page.locator(".mdq-select-trigger").first();
      await trigger.waitFor({ state: "visible", timeout: 4000 });
      await page.waitForTimeout(300);

      await trigger.click();
      const popupFirst = await firstFrame("mdq-select-popup");
      await page.waitForTimeout(500);
      const popupSettled = await settled("mdq-select-popup");
      if (!popupFirst || !popupSettled) {
        problems.push("select popup did not mount");
      } else if (popupFirst === popupSettled) {
        problems.push(`select popup did not animate in (${popupFirst})`);
      }
      await page.keyboard.press("Escape");
      const popupMountedDuringExit = await stillMounted("mdq-select-popup");
      await page.waitForTimeout(500);
      if (!popupMountedDuringExit) {
        problems.push("select popup disappeared instantly instead of animating out");
      }
      if (!(await gone("mdq-select-popup"))) {
        problems.push("select popup was never removed after its exit animation");
      }

      // 2. Hint panel: animates in and out.
      const hintButton = page.locator('button:has-text("Hint:")').first();
      await hintButton.waitFor({ state: "visible", timeout: 4000 });
      await hintButton.click();
      const hintFirst = await firstFrame("mdq-hint-panel");
      await page.waitForTimeout(500);
      const hintSettled = await settled("mdq-hint-panel");
      if (!hintFirst || !hintSettled) {
        problems.push("hint panel did not mount");
      } else if (hintFirst === hintSettled) {
        problems.push(`hint panel did not animate in (${hintFirst})`);
      }
      await page.locator('button:has-text("Hint:")').first().click();
      const hintMountedDuringExit = await stillMounted("mdq-hint-panel");
      await page.waitForTimeout(500);
      if (!hintMountedDuringExit) {
        problems.push("hint panel disappeared instantly instead of animating out");
      }
      if (!(await gone("mdq-hint-panel"))) {
        problems.push("hint panel was never removed after its exit animation");
      }

      // 3. Retake modal: animates in and out.
      await page.locator('button:has-text("Retake")').first().click();
      const modalFirst = await firstFrame("mdq-retake-modal");
      await page.waitForTimeout(500);
      const modalSettled = await settled("mdq-retake-modal");
      if (!modalFirst || !modalSettled) {
        problems.push("retake modal did not mount");
      } else if (modalFirst === modalSettled) {
        problems.push(`retake modal did not animate in (${modalFirst})`);
      }
      await page.locator('button:has-text("Cancel")').first().click();
      const modalMountedDuringExit = await stillMounted("mdq-retake-modal");
      await page.waitForTimeout(500);
      if (!modalMountedDuringExit) {
        problems.push("retake modal disappeared instantly instead of animating out");
      }
      if (!(await gone("mdq-retake-modal"))) {
        problems.push("retake modal was never removed after its exit animation");
      }

      // 4. Question body: animates in on swap (no exit animation by design).
      const nextButton = page.locator('button:has-text("Next")').first();
      await nextButton.waitFor({ state: "visible", timeout: 4000 });
      await nextButton.click();
      const questionFirst = await firstFrame("mdq-question-body");
      await page.waitForTimeout(500);
      const questionSettled = await settled("mdq-question-body");
      if (!questionFirst || !questionSettled) {
        problems.push("question body did not mount");
      } else if (questionFirst === questionSettled) {
        problems.push(`question body did not animate in (${questionFirst})`);
      }

      if (problems.length === 0) {
        transitionCheck.passed = true;
        transitionCheck.details = "Select popup, hint panel, and retake modal animate in and out; the question body animates in on swap";
      } else {
        transitionCheck.passed = false;
        transitionCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      transitionCheck.passed = false;
      transitionCheck.details = `Error verifying state transitions: ${err.message || String(err)}`;
    }
    results.push(transitionCheck);

    // Check 6h: Desktop rail states - expanded 280px, collapsed 64px, persisted, content re-centers
    try {
      const readLayout = async () =>
        await page.evaluate(() => {
          const panel = document.querySelector('[data-testid="mdq-sidebar"]');
          const aside = panel ? panel.closest("aside") : null;
          const main = document.querySelector<HTMLElement>('[role="main"]');
          const scroller = main
            ? Array.from(main.querySelectorAll<HTMLElement>("div")).find(
                (el) => window.getComputedStyle(el).overflowY === "auto"
              )
            : undefined;
          const column = main
            ? (Array.from(main.children).find(
                (el) => window.getComputedStyle(el).maxWidth === "800px"
              ) as HTMLElement | undefined)
            : undefined;
          const mainRect = main?.getBoundingClientRect();
          const columnRect = column?.getBoundingClientRect();
          return {
            sidebarWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
            columnWidth: columnRect ? Math.round(columnRect.width) : null,
            columnLeft: columnRect ? Math.round(columnRect.left) : null,
            columnRight: columnRect ? Math.round(columnRect.right) : null,
            mainLeft: mainRect ? Math.round(mainRect.left) : null,
            mainRight: mainRect ? Math.round(mainRect.right) : null,
          };
        });

      const problems: string[] = [];
      const expanded = await readLayout();
      if (expanded.sidebarWidth !== 280) {
        problems.push(`expanded rail is ${expanded.sidebarWidth}px, expected 280px`);
      }

      const toggle = page.locator('[data-testid="mdq-sidebar-toggle"]').first();
      await toggle.waitFor({ state: "visible", timeout: 4000 });
      await toggle.click();
      await page.waitForTimeout(300);
      const collapsed = await readLayout();
      if (collapsed.sidebarWidth !== 64) {
        problems.push(`collapsed rail is ${collapsed.sidebarWidth}px, expected 64px`);
      }
      if (collapsed.columnWidth !== 800) {
        problems.push(`content column is ${collapsed.columnWidth}px when collapsed, expected 800px`);
      }
      if (
        collapsed.mainLeft !== null &&
        collapsed.mainRight !== null &&
        collapsed.columnLeft !== null &&
        collapsed.columnRight !== null
      ) {
        const gapLeft = collapsed.columnLeft - collapsed.mainLeft;
        const gapRight = collapsed.mainRight - collapsed.columnRight;
        if (Math.abs(gapLeft - gapRight) > 1) {
          problems.push(`content column is not centered when collapsed (gaps ${gapLeft}/${gapRight})`);
        }
        if (expanded.columnLeft !== null && collapsed.columnLeft >= expanded.columnLeft) {
          problems.push("content column did not move when the rail collapsed");
        }
      }

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 });
      await page.waitForTimeout(500);
      const afterReload = await readLayout();
      if (afterReload.sidebarWidth !== 64) {
        problems.push(`rail state was not persisted across a reload (${afterReload.sidebarWidth}px)`);
      }

      const toggleAgain = page.locator('[data-testid="mdq-sidebar-toggle"]').first();
      await toggleAgain.click();
      await page.waitForTimeout(300);
      const reExpanded = await readLayout();
      if (reExpanded.sidebarWidth !== 280) {
        problems.push(`rail did not expand again (${reExpanded.sidebarWidth}px)`);
      }

      if (problems.length === 0) {
        railStateCheck.passed = true;
        railStateCheck.details = `Rail toggles between 280px and 64px, the state survives a reload, and the 800px content column stays centered in both states`;
      } else {
        railStateCheck.passed = false;
        railStateCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      railStateCheck.passed = false;
      railStateCheck.details = `Error verifying the desktop rail states: ${err.message || String(err)}`;
    }
    results.push(railStateCheck);

    // Check 6i: Rail glyphs - the collapsed rail renders SVG glyphs with accessible names, no emoji
    try {
      const problems: string[] = [];
      const toggle = page.locator('[data-testid="mdq-sidebar-toggle"]').first();
      await toggle.waitFor({ state: "visible", timeout: 4000 });
      const railWidth = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="mdq-sidebar"]');
        const aside = panel ? panel.closest("aside") : null;
        return aside ? Math.round(aside.getBoundingClientRect().width) : null;
      });
      if (railWidth !== 64) {
        await toggle.click();
        await page.waitForTimeout(300);
      }

      const glyphState = await page.evaluate(() => {
        const rail = document.querySelector('[data-testid="mdq-sidebar"]');
        const svgs = rail ? Array.from(rail.querySelectorAll("svg")) : [];
        const names = svgs.map((svg) => {
          const labelled = svg.closest("[aria-label]");
          return (labelled?.getAttribute("aria-label") ?? "").trim();
        });
        const text = document.body.innerText ?? "";
        const emoji = text.match(/\p{Extended_Pictographic}/gu) ?? [];
        return { svgCount: svgs.length, names, emoji };
      });

      if (glyphState.svgCount === 0) {
        problems.push("the collapsed rail renders no SVG glyphs");
      }
      if (glyphState.names.some((name) => name.length === 0)) {
        problems.push("a rail glyph has no accessible name");
      }
      if (glyphState.emoji.length > 0) {
        problems.push(`emoji characters are present in the rendered text: ${glyphState.emoji.join(" ")}`);
      }

      if (problems.length === 0) {
        railGlyphCheck.passed = true;
        railGlyphCheck.details = `Collapsed rail renders ${glyphState.svgCount} SVG glyphs, each with an accessible name (${glyphState.names[0]}), and the rendered text contains no emoji`;
      } else {
        railGlyphCheck.passed = false;
        railGlyphCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      railGlyphCheck.passed = false;
      railGlyphCheck.details = `Error verifying the rail glyphs: ${err.message || String(err)}`;
    }
    results.push(railGlyphCheck);

    // Check 6j: Keyboard shortcuts - digits select an option, arrows navigate, typing in a field does neither
    try {
      const problems: string[] = [];

      const ensureExpandedRail = async () => {
        const width = await page.evaluate(() => {
          const panel = document.querySelector('[data-testid="mdq-sidebar"]');
          const aside = panel ? panel.closest("aside") : null;
          return aside ? Math.round(aside.getBoundingClientRect().width) : null;
        });
        if (width === 64) {
          await page.locator('[data-testid="mdq-sidebar-toggle"]').first().click();
          await page.waitForTimeout(300);
        }
      };

      const readStepper = async () =>
        await page.evaluate(
          () => document.querySelector('[data-testid="mdq-stepper"]')?.textContent?.trim() ?? ""
        );

      const readRadios = async () =>
        await page.evaluate(() =>
          Array.from(document.querySelectorAll('input[type="radio"]')).map((radio) => ({
            value: (radio as HTMLInputElement).value,
            checked: (radio as HTMLInputElement).checked,
          }))
        );

      await ensureExpandedRail();
      // Start from a clean quiz so no earlier check leaves an answered question behind.
      await page.evaluate(() => window.localStorage.clear());
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 });
      await page.waitForTimeout(600);
      await ensureExpandedRail();

      await page
        .locator('button:has-text("What is the capital of France?")')
        .first()
        .click();
      await page.waitForTimeout(500);

      const stepperBefore = await readStepper();
      await page.keyboard.press("2");
      await page.waitForTimeout(250);
      const radiosAfterDigit = await readRadios();
      if (radiosAfterDigit.length < 2) {
        problems.push("the active question has no radio options to select");
      } else if (!radiosAfterDigit[1].checked || radiosAfterDigit[0].checked) {
        problems.push(
          `pressing 2 did not select the second option (checked: ${radiosAfterDigit
            .map((r) => r.value)
            .filter((_, index) => radiosAfterDigit[index].checked)
            .join(", ") || "none"})`
        );
      }

      // Arrows navigate even when a choice input holds focus.
      await page.locator('input[type="radio"]').first().focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(400);
      const stepperAfterNext = await readStepper();
      if (stepperAfterNext === stepperBefore) {
        problems.push("ArrowRight did not advance to the next question");
      }
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(400);
      const stepperAfterPrev = await readStepper();
      if (stepperAfterPrev !== stepperBefore) {
        problems.push("ArrowLeft did not return to the previous question");
      }

      // Typing a digit in a text field neither selects an option nor navigates.
      await page
        .locator('button:has-text("Name the protocol used to securely browse")')
        .first()
        .click();
      await page.waitForTimeout(500);
      const textInput = page.locator('input[placeholder="Type your answer here..."]').first();
      const inputFound = await textInput
        .waitFor({ state: "visible", timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (!inputFound) {
        const cardText = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const main = document.querySelector('[role="main"]');
          return `inputs in DOM: ${inputs.length} (${inputs
            .map((i) => `${i.getAttribute("type") ?? "no-type"}:${(i as HTMLInputElement).type}`)
            .join(", ")}) | card html: ${(main?.innerHTML ?? "").slice(-600)}`;
        });
        problems.push(`the short-answer question has no visible text input (${cardText})`);
      }
      const stepperBeforeTyping = await readStepper();
      if (inputFound) {
        await textInput.click();
        await page.keyboard.type("2");
        await page.waitForTimeout(300);
        const typedValue = await textInput.inputValue();
        const stepperAfterTyping = await readStepper();
        const inputStillEnabled = await textInput.isEnabled();
        if (!typedValue.includes("2")) {
          problems.push(
            `typing in the answer field did not insert the digit (value: "${typedValue}")`
          );
        }
        if (stepperAfterTyping !== stepperBeforeTyping) {
          problems.push("typing a digit in a text field navigated away from the question");
        }
        if (!inputStillEnabled) {
          problems.push("typing a digit in a text field submitted the answer");
        }
      }

      if (problems.length === 0) {
        shortcutCheck.passed = true;
        shortcutCheck.details = "Digits select the matching option, arrows move between questions (even with a radio focused), and digits typed in a text field change nothing";
      } else {
        shortcutCheck.passed = false;
        shortcutCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      shortcutCheck.passed = false;
      shortcutCheck.details = `Error verifying the keyboard shortcuts: ${err.message || String(err)}`;
    }
    results.push(shortcutCheck);

    // Check 6j2: State preservation - a digit shortcut does not leak, and a theme switch keeps the answer
    try {
      const problems: string[] = [];
      await page.evaluate(() => window.localStorage.clear());
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 });
      await page.waitForTimeout(600);

      const readRadios = async () =>
        await page.evaluate(() =>
          Array.from(document.querySelectorAll('input[type="radio"]')).map(
            (radio) => (radio as HTMLInputElement).checked
          )
        );

      // A digit shortcut must not pre-select an option on the next question.
      await page.keyboard.press("2");
      await page.waitForTimeout(300);
      const afterDigit = await readRadios();
      if (!afterDigit[1]) problems.push("pressing 2 did not select the second option");
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(500);
      const afterNext = await readRadios();
      if (afterNext.some(Boolean)) {
        problems.push("the digit shortcut leaked into the next question");
      }

      // Switching the theme must not discard the in-progress answer.
      await page
        .locator('button:has-text("What is the capital of France?")')
        .first()
        .click();
      await page.waitForTimeout(400);
      await page.locator('text="Paris"').first().click();
      await page.waitForTimeout(300);
      await page.locator('[data-testid="mdq-theme-toggle"]').first().click();
      await page.waitForTimeout(700);
      const afterTheme = await readRadios();
      if (!afterTheme[1]) {
        problems.push("the theme switch discarded the selected answer");
      }

      if (problems.length === 0) {
        statePreservationCheck.passed = true;
        statePreservationCheck.details =
          "A digit shortcut applies only to the active question, and switching the theme keeps the selected answer";
      } else {
        statePreservationCheck.passed = false;
        statePreservationCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      statePreservationCheck.passed = false;
      statePreservationCheck.details = `Error verifying state preservation: ${err.message || String(err)}`;
    }
    results.push(statePreservationCheck);

    // Check 6k: Accessibility - axe-core scan in light and dark, failing on serious or critical violations
    try {
      const scans: { label: string; violations: string[] }[] = [];

      const scan = async (label: string) => {
        // Disable transitions and force a reflow so the scan sees settled colors.
        await page.evaluate(() => {
          const style = document.createElement("style");
          style.textContent =
            "*, *::before, *::after { transition: none !important; animation: none !important; }";
          document.head.appendChild(style);
          void document.body.offsetHeight;
        });
        await page.waitForTimeout(100);

        // Inactive controls are exempt from the contrast requirement (WCAG 1.4.3),
        // so dimmed disabled buttons are excluded from the scan.
        const results = await new AxeBuilder({ page })
          .exclude("[disabled], [disabled] *, [aria-disabled='true'], [aria-disabled='true'] *")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        scans.push({
          label,
          violations: results.violations
            .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
            .map(
              (violation) =>
                `${violation.id} (${violation.impact}, ${violation.nodes.length} node${
                  violation.nodes.length === 1 ? "" : "s"
                }): ${violation.nodes
                  .slice(0, 2)
                  .map((node) => {
                    const text = node.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                    return `${node.target.join(" ")} :: text "${text.slice(0, 40)}" :: ${node.any
                      .map((a) => JSON.stringify(a.data ?? a.message))
                      .join(" ")}`;
                  })
                  .join(" || ")}`
            ),
        });
      };

      const setTheme = async (target: "light" | "dark") => {
        await page.evaluate((theme) => {
          const toggle = document.querySelector<HTMLElement>('[data-testid="mdq-theme-toggle"]');
          if (document.documentElement.getAttribute("data-theme") !== theme) {
            toggle?.click();
          }
        }, target);
        await page.waitForTimeout(800);
      };

      for (const theme of ["light", "dark"] as const) {
        await setTheme(theme);
        await scan(`desktop ${theme}`);
      }

      // The custom listbox only exists on the match-pairs question.
      const railWidth = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="mdq-sidebar"]');
        const aside = panel ? panel.closest("aside") : null;
        return aside ? Math.round(aside.getBoundingClientRect().width) : null;
      });
      if (railWidth === 64) {
        await page.locator('[data-testid="mdq-sidebar-toggle"]').first().click();
        await page.waitForTimeout(300);
      }
      await page.locator('button:has-text("Match the language")').first().click();
      await page.waitForTimeout(400);
      await page.locator(".mdq-select-trigger").first().click();
      await page.waitForSelector(".mdq-select-popup", { timeout: 4000 });
      await page.waitForTimeout(300);
      await scan("desktop listbox");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Narrow viewport: header tabs and the question sheet.
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(600);
      await scan("mobile");
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(400);

      const problems = scans
        .filter((scan) => scan.violations.length > 0)
        .map((scan) => `${scan.label}: ${scan.violations.join(", ")}`);

      if (problems.length === 0) {
        accessibilityCheck.passed = true;
        accessibilityCheck.details = `axe-core found no serious or critical WCAG 2.1 AA violations in ${scans
          .map((scan) => scan.label)
          .join(", ")}`;
      } else {
        accessibilityCheck.passed = false;
        accessibilityCheck.details = problems.join(" | ");
      }
    } catch (err: any) {
      accessibilityCheck.passed = false;
      accessibilityCheck.details = `Error running the axe-core scan: ${err.message || String(err)}`;
    }
    results.push(accessibilityCheck);

    // Check 6l: Results summary - the last question leads to a results screen
    try {
      const problems: string[] = [];
      await page.evaluate(() => window.localStorage.clear());
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 });
      await page.waitForTimeout(600);

      const railWidth = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="mdq-sidebar"]');
        const aside = panel ? panel.closest("aside") : null;
        return aside ? Math.round(aside.getBoundingClientRect().width) : null;
      });
      if (railWidth === 64) {
        await page.locator('[data-testid="mdq-sidebar-toggle"]').first().click();
        await page.waitForTimeout(300);
      }

      await page
        .locator('button:has-text("Explain the trade-offs of database indexing")')
        .first()
        .click();
      await page.waitForTimeout(500);

      const finishButton = page.locator('button:has-text("Finish")').first();
      await finishButton.waitFor({ state: "visible", timeout: 4000 });
      await finishButton.click();
      await page.waitForSelector('[data-testid="mdq-results"]', { timeout: 4000 });
      await page.waitForTimeout(400);

      const results = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="mdq-results"]');
        const text = panel?.textContent ?? "";
        return {
          present: Boolean(panel),
          hasScore: /\d+\s+of\s+\d+\s+correct/.test(text),
          hasSections: text.includes("By section"),
          hasMissed: text.includes("Missed questions"),
          missedCount: document.querySelectorAll('[data-testid="mdq-missed-question"]').length,
          hasRetake: Boolean(document.querySelector('[data-testid="mdq-results-retake"]')),
        };
      });

      if (!results.present) problems.push("the results screen did not render");
      if (!results.hasScore) problems.push("the results screen has no total score");
      if (!results.hasSections) problems.push("the results screen has no per-section breakdown");
      if (!results.hasMissed) problems.push("the results screen has no missed-questions list");
      if (results.missedCount === 0) problems.push("the missed-questions list is empty");
      if (!results.hasRetake) problems.push("the results screen has no retake action");

      if (problems.length === 0) {
        resultsCheck.passed = true;
        resultsCheck.details = `The last question leads to a results screen with a total score, a per-section breakdown, ${results.missedCount} missed questions, and a retake action`;
      } else {
        resultsCheck.passed = false;
        resultsCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      resultsCheck.passed = false;
      resultsCheck.details = `Error verifying the results summary: ${String(err.message ?? err)
        .split("\n")
        .slice(0, 6)
        .join(" | ")}`;
    }
    results.push(resultsCheck);

    // Check 6m: Results persistence - a reload of a finished quiz still shows the results
    try {
      const problems: string[] = [];
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 });
      await page.waitForTimeout(800);

      const persisted = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="mdq-results"]');
        const text = panel?.textContent ?? "";
        return {
          present: Boolean(panel),
          hasScore: /\d+\s+of\s+\d+\s+correct/.test(text),
          missedCount: document.querySelectorAll('[data-testid="mdq-missed-question"]').length,
        };
      });

      if (!persisted.present) problems.push("the results screen is gone after a reload");
      if (!persisted.hasScore) problems.push("the reloaded results screen has no score");
      if (persisted.missedCount === 0) {
        problems.push("the reloaded results screen lists no missed questions");
      }

      if (problems.length === 0) {
        resultsPersistenceCheck.passed = true;
        resultsPersistenceCheck.details = `A reload of the finished quiz still shows the results screen (${persisted.missedCount} missed questions)`;
      } else {
        resultsPersistenceCheck.passed = false;
        resultsPersistenceCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      resultsPersistenceCheck.passed = false;
      resultsPersistenceCheck.details = `Error verifying the results persistence: ${err.message || String(err)}`;
    }
    results.push(resultsPersistenceCheck);

    // Check 6m2: Results retake - the retake action restarts the quiz
    try {
      const problems: string[] = [];
      const resultsVisible = await page
        .waitForSelector('[data-testid="mdq-results"]', { timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (!resultsVisible) {
        problems.push("the results screen is not shown before the retake");
      } else {
        await page.locator('[data-testid="mdq-results-retake"]').first().click();
        await page.waitForTimeout(600);
        const afterRetake = await page.evaluate(() => ({
          results: Boolean(document.querySelector('[data-testid="mdq-results"]')),
          question: Boolean(document.querySelector('[data-testid="mdq-question-body"]')),
          saved: localStorage.getItem(
            Object.keys(localStorage).find((key) => key.startsWith("mdq-progress-")) ?? ""
          ),
        }));
        if (afterRetake.results) {
          problems.push("the retake action left the results screen on screen");
        }
        if (!afterRetake.question) {
          problems.push("the retake action did not return to the questions");
        }
        if (afterRetake.saved && afterRetake.saved.includes('"showResults":true')) {
          problems.push("the retake action did not clear the persisted results flag");
        }
      }

      if (problems.length === 0) {
        resultsRetakeCheck.passed = true;
        resultsRetakeCheck.details =
          "The retake action clears the answers, leaves the results screen, and clears the persisted results flag";
      } else {
        resultsRetakeCheck.passed = false;
        resultsRetakeCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      resultsRetakeCheck.passed = false;
      resultsRetakeCheck.details = `Error verifying the results retake: ${err.message || String(err)}`;
    }
    results.push(resultsRetakeCheck);

    // Check 6n: Live announcements - a polite status region reports answers, navigation, and hints
    try {
      const problems: string[] = [];
      await page.evaluate(() => window.localStorage.clear());
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="mdq-root"]', { timeout: 8000 });
      await page.waitForTimeout(800);

      const liveRegion = page.locator('[data-testid="mdq-live-region"]').first();
      await liveRegion.waitFor({ state: "attached", timeout: 4000 });
      const regionAttrs = await liveRegion.evaluate((el) => ({
        role: el.getAttribute("role"),
        live: el.getAttribute("aria-live"),
      }));
      if (regionAttrs.role !== "status" || regionAttrs.live !== "polite") {
        problems.push(
          `the live region is role=${regionAttrs.role} aria-live=${regionAttrs.live}`
        );
      }

      const readLive = async () => (await liveRegion.textContent())?.trim() ?? "";

      // Hint toggle.
      await page.locator('button:has-text("Hint:")').first().click();
      await page.waitForTimeout(400);
      const hintMessage = await readLive();
      if (!/hint shown/i.test(hintMessage)) {
        problems.push(`opening the hint announced "${hintMessage}"`);
      }
      await page.locator('button:has-text("Hint:")').first().click();
      await page.waitForTimeout(400);
      const hintHiddenMessage = await readLive();
      if (!/hint hidden/i.test(hintHiddenMessage)) {
        problems.push(`closing the hint announced "${hintHiddenMessage}"`);
      }

      // Answer correctness.
      await page.locator('text="Paris"').first().click({ timeout: 4000 }).catch(() => undefined);
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Check Answer")').first().click({ timeout: 4000 }).catch(() => undefined);
      await page.waitForTimeout(400);
      const answerMessage = await readLive();
      if (!/correct answer|incorrect answer/i.test(answerMessage)) {
        problems.push(`answering announced "${answerMessage}"`);
      }

      // Navigation.
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(500);
      const navigationMessage = await readLive();
      if (!/question \d+ of \d+/i.test(navigationMessage)) {
        problems.push(`navigating announced "${navigationMessage}"`);
      }

      if (problems.length === 0) {
        liveRegionCheck.passed = true;
        liveRegionCheck.details = `A polite status region announces hint toggles ("${hintMessage}"), answer correctness ("${answerMessage}"), and navigation ("${navigationMessage}")`;
      } else {
        liveRegionCheck.passed = false;
        liveRegionCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      liveRegionCheck.passed = false;
      liveRegionCheck.details = `Error verifying the live region: ${err.message || String(err)}`;
    }
    results.push(liveRegionCheck);

    // Check 6o: Print layout - printing shows every question with its correct answer
    try {
      const problems: string[] = [];
      await page.emulateMedia({ media: "print" });
      await page.waitForTimeout(400);

      const printState = await page.evaluate(() => {
        const view = document.querySelector(".mdq-print-view");
        const text = view?.textContent ?? "";
        const stepper = document.querySelector('[data-testid="mdq-stepper"]');
        const rail = document.querySelector('[data-testid="mdq-sidebar"]');
        const isHidden = (el: Element | null) => {
          if (!el) return true;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return (
            style.display === "none" ||
            style.visibility === "hidden" ||
            rect.width === 0 ||
            rect.height === 0
          );
        };
        return {
          viewVisible: Boolean(view) && !isHidden(view),
          questionTitles: ["What is the capital of France?", "Explain the trade-offs of database indexing"].filter(
            (title) => text.includes(title)
          ).length,
          hasCorrectAnswer: text.includes("(correct answer)") && text.includes("Paris"),
          chromeHidden: isHidden(stepper) && isHidden(rail),
        };
      });

      await page.emulateMedia({ media: "screen" });
      await page.waitForTimeout(200);

      if (!printState.viewVisible) {
        problems.push("the print view is not visible under print media");
      }
      if (printState.questionTitles < 2) {
        problems.push("the print view does not list every question");
      }
      if (!printState.hasCorrectAnswer) {
        problems.push("the print view does not mark the correct answers");
      }
      if (!printState.chromeHidden) {
        problems.push("the interactive chrome is still visible under print media");
      }

      if (problems.length === 0) {
        printCheck.passed = true;
        printCheck.details = "Print media renders every question with its correct answer and hides the stepper and rail";
      } else {
        printCheck.passed = false;
        printCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      printCheck.passed = false;
      printCheck.details = `Error verifying the print layout: ${err.message || String(err)}`;
    }
    results.push(printCheck);

    // Check 7: Mobile viewport - Viewport { width: 375, height: 667 }; the desktop rail is not rendered, the header carries the section tabs, and the question sheet opens
    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(400);

      const mobileState = await page.evaluate(() => {
        const stepper = document.querySelector('[data-testid="mdq-stepper"]');
        const rail = document.querySelector('[data-testid="mdq-sidebar"]');
        const sheetToggle = document.querySelector('[data-testid="mdq-sheet-toggle"]');
        const header = document.querySelector('[role="main"] > div');
        const tabs = header
          ? Array.from(header.querySelectorAll('[role="tab"]')).map((t) => t.textContent?.trim() ?? "")
          : [];

        const stepperComputed = stepper ? window.getComputedStyle(stepper) : null;
        const stepperRect = stepper ? stepper.getBoundingClientRect() : null;
        const stepperVisible = Boolean(
          stepper &&
          stepperComputed &&
          stepperComputed.display !== "none" &&
          stepperComputed.visibility !== "hidden" &&
          stepperRect &&
          stepperRect.height > 0
        );

        const toggleComputed = sheetToggle ? window.getComputedStyle(sheetToggle) : null;
        const sheetToggleVisible = Boolean(
          sheetToggle &&
          toggleComputed &&
          toggleComputed.display !== "none" &&
          toggleComputed.visibility !== "hidden"
        );

        return {
          stepperVisible,
          railRendered: Boolean(rail),
          sheetToggleVisible,
          tabs,
        };
      });

      const problems: string[] = [];
      if (!mobileState.stepperVisible) {
        problems.push("the stepper is not visible at 375x667");
      }
      if (mobileState.railRendered) {
        problems.push("the desktop rail is still rendered on a narrow viewport");
      }
      if (!mobileState.sheetToggleVisible) {
        problems.push("the question sheet toggle is missing from the header");
      }
      if (mobileState.tabs.length === 0) {
        problems.push("the header carries no section tabs");
      }

      // The sheet holds the question list, progress, retake, and theme toggle.
      if (mobileState.sheetToggleVisible) {
        await page.locator('[data-testid="mdq-sheet-toggle"]').first().click();
        await page.waitForSelector('[data-testid="mdq-question-sheet"]', { timeout: 4000 });
        await page.waitForTimeout(400);
        const sheetState = await page.evaluate(() => {
          const sheet = document.querySelector('[data-testid="mdq-question-sheet"]');
          if (!sheet) return null;
          const text = sheet.textContent ?? "";
          return {
            hasQuestion: text.includes("What is the capital of France?"),
            hasProgress: text.includes("Overall Score"),
            hasRetake: text.includes("Retake"),
            hasThemeToggle: Boolean(sheet.querySelector('[data-testid="mdq-theme-toggle"]')),
          };
        });
        if (!sheetState) {
          problems.push("the question sheet did not open");
        } else {
          if (!sheetState.hasQuestion) problems.push("the sheet does not list the questions");
          if (!sheetState.hasProgress) problems.push("the sheet does not show the progress meter");
          if (!sheetState.hasRetake) problems.push("the sheet does not offer the retake action");
          if (!sheetState.hasThemeToggle) problems.push("the sheet does not offer the theme toggle");
        }
        await page.keyboard.press("Escape");
        await page
          .waitForFunction(
            () => !document.querySelector('[data-testid="mdq-question-sheet"]'),
            undefined,
            { timeout: 3000 }
          )
          .catch(() => undefined);
        const stillOpen = await page.evaluate(
          () => Boolean(document.querySelector('[data-testid="mdq-question-sheet"]'))
        );
        if (stillOpen) problems.push("the question sheet did not close on Escape");
      }

      if (problems.length === 0) {
        mobileViewportCheck.passed = true;
        mobileViewportCheck.details = `At 375x667 the stepper is visible, the desktop rail is absent, the header shows the section tabs (${mobileState.tabs.join(", ")}), and the question sheet opens with the list, progress, retake, and theme toggle`;
      } else {
        mobileViewportCheck.passed = false;
        mobileViewportCheck.details = problems.join("; ");
      }
    } catch (err: any) {
      mobileViewportCheck.passed = false;
      mobileViewportCheck.details = `Error checking mobile viewport: ${err.message || String(err)}`;
    }
    results.push(mobileViewportCheck);

    await page.close().catch(() => {});
    await context.close().catch(() => {});
  } catch (err: any) {
    // If browser launch or general execution crashed, record failure on pending checks
    const pendingChecks = [
      offlineCheck,
      hydrationCheck,
      styleCheck,
      columnCheck,
      themeToggleCheck,
      proseAndCodeCheck,
      scrollRegionCheck,
      selectThemeCheck,
      selectKeyboardCheck,
      buttonHoverCheck,
      reducedMotionCheck,
      transitionCheck,
      railStateCheck,
      railGlyphCheck,
      shortcutCheck,
      statePreservationCheck,
      accessibilityCheck,
      resultsCheck,
      resultsPersistenceCheck,
      resultsRetakeCheck,
      liveRegionCheck,
      printCheck,
      mobileViewportCheck,
    ];
    for (const check of pendingChecks) {
      if (!results.includes(check)) {
        check.passed = false;
        check.details = `Verification run failed: ${err.message || String(err)}`;
        results.push(check);
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return results;
}

/**
 * Top-level verification helper returning { success, errors } for programmatic or test invocation.
 */
export async function verifyHtml(
  htmlPath: string,
  options?: VerifyOptions
): Promise<{ success: boolean; errors: string[] }> {
  const results = await runHeadlessVerification(htmlPath, options);
  const errors = results
    .filter((r) => !r.passed)
    .map((r) => `${r.checkName}: ${r.details || "Check failed"}`);

  return {
    success: errors.length === 0,
    errors,
  };
}

export default verifyHtml;
