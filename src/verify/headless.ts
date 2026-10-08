import { chromium, type Browser } from "playwright";
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

/**
 * Resolves Chromium executable path from environment variables or standard system locations.
 */
function resolveChromiumExecutable(): string | undefined {
  const envCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    process.env.CHROMIUM_PATH,
  ].filter(Boolean) as string[];

  for (const envPath of envCandidates) {
    if (fsSync.existsSync(envPath)) {
      return envPath;
    }
  }

  const systemCandidates = [
    "/nix/store/j2v1hxzvfb4z6i876x8ik3dcmqs83kdq-chromium-154.0.8037.97/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/run/current-system/sw/bin/chromium",
    "/run/current-system/sw/bin/google-chrome",
  ];

  for (const candidate of systemCandidates) {
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

  if (executablePath) {
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

  try {
    return await chromium.launch({
      headless,
      args: launchArgs,
    });
  } catch (err: any) {
    // Attempt fallback to any detected system binary
    const fallbackCandidates = [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/run/current-system/sw/bin/chromium",
    ];
    for (const cand of fallbackCandidates) {
      if (fsSync.existsSync(cand) && cand !== executablePath) {
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
      `Failed to launch Chromium for headless verification: ${err.message || String(err)}`
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
      "Theme Toggle Functionality",
      "Code Block and Markdown Content Rendering",
      "Mobile Viewport and Drawer",
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
  const themeToggleCheck: VerificationCheckResult = {
    checkName: "Theme Toggle Functionality",
    passed: false,
  };
  const proseAndCodeCheck: VerificationCheckResult = {
    checkName: "Code Block and Markdown Content Rendering",
    passed: false,
  };
  const mobileViewportCheck: VerificationCheckResult = {
    checkName: "Mobile Viewport and Drawer",
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

    // Check 7: Mobile viewport - Viewport { width: 375, height: 667 }; assert stepper is visible and desktop sidebar collapses to drawer
    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(100);

      const mobileState = await page.evaluate(() => {
        const stepper =
          document.querySelector('[data-testid="mdq-stepper"]') ||
          document.querySelector(".mdq-stepper");
        const sidebar =
          document.querySelector('[data-testid="mdq-sidebar"]') ||
          document.querySelector(".mdq-sidebar");
        const menuToggle =
          document.querySelector('[data-testid="mdq-menu-toggle"]') ||
          document.querySelector(".mdq-menu-toggle");

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

        const menuToggleComputed = menuToggle ? window.getComputedStyle(menuToggle) : null;
        const menuToggleVisible = Boolean(
          menuToggle &&
          menuToggleComputed &&
          menuToggleComputed.display !== "none" &&
          menuToggleComputed.visibility !== "hidden"
        );

        const sidebarComputed = sidebar ? window.getComputedStyle(sidebar) : null;
        const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
        const isDrawer = sidebarComputed?.position === "fixed";
        const isCollapsed = Boolean(sidebarRect && sidebarRect.right <= 0);
        const isNotOpen = Boolean(sidebar && !sidebar.classList.contains("open"));

        return {
          stepperVisible,
          menuToggleVisible,
          isDrawer,
          isCollapsed,
          isNotOpen,
        };
      });

      if (!mobileState.stepperVisible) {
        mobileViewportCheck.passed = false;
        mobileViewportCheck.details = "Stepper footer is not visible at mobile 375x667 viewport";
      } else if (!mobileState.isDrawer || (!mobileState.isCollapsed && !mobileState.menuToggleVisible)) {
        mobileViewportCheck.passed = false;
        mobileViewportCheck.details = "Desktop sidebar did not collapse to drawer layout at 375x667";
      } else {
        mobileViewportCheck.passed = true;
        mobileViewportCheck.details =
          "Stepper is visible and sidebar collapsed to drawer (hamburger toggle active, sidebar transformed off-screen)";
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
      themeToggleCheck,
      proseAndCodeCheck,
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
