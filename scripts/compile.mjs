import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const runtime = process.execPath;
const args = process.argv.slice(2);
const buildScript = path.resolve(rootDir, "scripts/build.mjs");
const cliScript = path.resolve(rootDir, "dist/scripts/md-questioner.mjs");

// 1. Ensure build is fresh
console.log("[compile] Running build step...");
const buildRes = spawnSync(runtime, [buildScript], {
  cwd: rootDir,
  stdio: "inherit",
});

if (buildRes.status !== 0) {
  process.exit(buildRes.status ?? 1);
}

// 2. Execute CLI with provided arguments
const cliRes = spawnSync(runtime, [cliScript, ...args], {
  cwd: process.cwd(),
  stdio: "inherit",
});

process.exit(cliRes.status ?? 0);
