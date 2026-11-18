import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { validateQuizModel } from "../src/parse/validate.js";
import type { QuizModel } from "../src/parse/schema.js";

const inputPath = path.resolve(__dirname, "fixtures/full-feature.md");

function validModel(): QuizModel {
  return {
    title: "Sample Quiz",
    frontmatter: {},
    sections: [
      {
        id: "sec-1",
        title: "Section 1",
        questions: [
          {
            id: "q-1",
            title: "Question 1",
            type: "reflection",
            sourceLine: 5,
          },
        ],
      },
    ],
    contentHash: "abcdef123456",
    totalQuestions: 1,
  };
}

describe("strict command-line values", () => {
  it("rejects an empty --title value", async () => {
    const outputPath = path.resolve(__dirname, "../out/test-regression-empty-title.html");
    await fsp.rm(outputPath, { force: true });

    const code = await runCli([inputPath, "-o", outputPath, "--title="]);
    const exists = await fsp.stat(outputPath).then(() => true).catch(() => false);

    expect(code).toBe(1);
    expect(exists).toBe(false);
  });

  it("rejects a known option used as an output value", async () => {
    const originalCwd = process.cwd();
    const tempCwd = path.resolve(__dirname, "../out/test-regression-cwd");
    await fsp.rm(tempCwd, { recursive: true, force: true });
    await fsp.mkdir(tempCwd, { recursive: true });
    process.chdir(tempCwd);

    try {
      const code = await runCli([inputPath, "-o", "--quiet"]);
      const exists = await fsp.stat(path.join(tempCwd, "--quiet")).then(() => true).catch(() => false);
      expect(code).toBe(1);
      expect(exists).toBe(false);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe("model contract", () => {
  it("rejects a totalQuestions count that disagrees with the sections", () => {
    expect(() => validateQuizModel({ ...validModel(), totalQuestions: 99 })).toThrow(
      /totalQuestions/i
    );
  });

  it("rejects duplicate question ids", () => {
    const model = validModel();
    const question = model.sections[0].questions[0];
    model.sections[0].questions.push({ ...question });
    model.totalQuestions = 2;
    expect(() => validateQuizModel(model)).toThrow(/duplicate/i);
  });
});

describe("restored answer shape", () => {
  it("validates userResponse before accepting a saved answer", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../src/render/App.tsx"), "utf-8");
    const start = source.indexOf("if (saved.answeredQuestions");
    const end = source.indexOf("setAnsweredQuestions(restoredAnswers);", start);
    const restoreBlock = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(restoreBlock).toMatch(/typeof\s+entry\.userResponse/);
  });
});
