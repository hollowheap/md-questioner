import type { BuildOptions } from "esbuild";

export const clientConfig: BuildOptions = {
  entryPoints: ["src/render/App.tsx"],
  bundle: true,
  format: "iife",
  globalName: "MDQuestioner",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  jsx: "automatic",
  write: false,
};

export const cliConfig: BuildOptions = {
  entryPoints: ["src/cli.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node20"],
  outfile: "dist/cli.mjs",
  external: ["fsevents"],
};

export default {
  client: clientConfig,
  cli: cliConfig,
};
