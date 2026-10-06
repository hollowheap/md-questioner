import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type Runtime = "bun" | "node";
export type HostRuntime = Runtime;

function isBinaryOnPath(binaryName: string): boolean {
  const pathEnv = process.env.PATH || "";
  const dirs = pathEnv.split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    const fullPath = path.join(dir, binaryName);
    try {
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && (stat.mode & 0o111)) {
          return true;
        }
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export function detectRuntime(): Runtime {
  // 1. Current process running under Bun
  if (typeof (process as unknown as { versions: { bun?: string } }).versions?.bun === "string") {
    return "bun";
  }

  // 2. Bun available on PATH via which or direct lookup
  try {
    const whichBun = spawnSync("which", ["bun"], { stdio: "ignore" });
    if (whichBun.status === 0) {
      return "bun";
    }
  } catch {
    // ignore
  }

  if (isBinaryOnPath("bun")) {
    return "bun";
  }

  // 3. Current process running under Node
  if (typeof process.versions?.node === "string") {
    return "node";
  }

  // 4. Node available on PATH
  try {
    const whichNode = spawnSync("which", ["node"], { stdio: "ignore" });
    if (whichNode.status === 0) {
      return "node";
    }
  } catch {
    // ignore
  }

  if (isBinaryOnPath("node")) {
    return "node";
  }

  throw new Error("Error: Neither bun nor node runtime is available on PATH.");
}
