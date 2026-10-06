import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import { extractFrontmatter } from "../src/parse/frontmatter.js";
import { parseMarkdown } from "../src/parse/markdown.js";
import {
  quizModelSchema,
  SchemaValidationError,
  validateQuizModel,
} from "../src/parse/validate.js";
import { QuizModel } from "../src/parse/schema.js";

describe("Frontmatter extraction", () => {
  it("extracts frontmatter fields and preserves unknown keys", () => {
    const md = `---
title: My Quiz
description: A test quiz
author: Tester
tags: [tag1, tag2]
customField: customValue
---
# Quiz Body`;

    const { frontmatter, body, bodyStartLine } = extractFrontmatter(md);
    expect(frontmatter.title).toBe("My Quiz");
    expect(frontmatter.description).toBe("A test quiz");
    expect(frontmatter.author).toBe("Tester");
    expect(frontmatter.tags).toEqual(["tag1", "tag2"]);
    expect(frontmatter.customField).toBe("customValue");
    expect(body.trim()).toBe("# Quiz Body");
    expect(bodyStartLine).toBe(8);
  });

  it("handles markdown without frontmatter", () => {
    const md = "# Title\n\n## Section\n\n### Question\n- [x] Yes";
    const { frontmatter, body, bodyStartLine } = extractFrontmatter(md);
    expect(frontmatter).toEqual({});
    expect(body).toBe(md);
    expect(bodyStartLine).toBe(1);
  });
});

describe("Question type detection rules", () => {
  it("Rule 1: H4 under H3 detects short-answer with canonicalAnswer and fuzzyTolerance 1", () => {
    const md = `# Quiz\n\n### What protocol secures the web?\n\n#### HTTPS`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.type).toBe("short-answer");
    expect(q.canonicalAnswer).toBe("HTTPS");
    expect(q.fuzzyTolerance).toBe(1);
  });

  it("Rule 2: GFM Table detects match-pairs", () => {
    const md = `# Quiz\n\n### Match languages\n\n| Lang | Type |\n| --- | --- |\n| TS | Static |\n| Py | Dynamic |`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.type).toBe("match-pairs");
    expect(q.pairs).toEqual([
      { prompt: "TS", answer: "Static" },
      { prompt: "Py", answer: "Dynamic" },
    ]);
  });

  it("Rule 3a: Exactly 2 items with True/False and 1 [x] detects true-false", () => {
    const md = `# Quiz\n\n### Is the Earth round?\n\n- [x] True\n- [ ] False`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.type).toBe("true-false");
    expect(q.options?.length).toBe(2);
    expect(q.options?.[0].isCorrect).toBe(true);
    expect(q.options?.[1].isCorrect).toBe(false);
  });

  it("Rule 3b: Exactly 1 [x] and multiple options detects multi-choice", () => {
    const md = `# Quiz\n\n### Capital of France?\n\n- [ ] London\n- [x] Paris\n- [ ] Berlin`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.type).toBe("multi-choice");
    expect(q.options?.length).toBe(3);
    expect(q.options?.[1].isCorrect).toBe(true);
  });

  it("Rule 3c: More than 1 [x] detects multi-select", () => {
    const md = `# Quiz\n\n### Select primary colors\n\n- [x] Red\n- [x] Green\n- [x] Blue\n- [ ] Yellow`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.type).toBe("multi-select");
    expect(q.options?.filter((o) => o.isCorrect).length).toBe(3);
  });

  it("Rule 3d: 0 [x] throws SchemaValidationError with correct sourceLine", () => {
    const md = `# Quiz\n\n### Unanswered question\n\n- [ ] A\n- [ ] B`;
    expect(() => parseMarkdown(md)).toThrow(SchemaValidationError);
    try {
      parseMarkdown(md);
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaValidationError);
      const schemaErr = err as SchemaValidationError;
      expect(schemaErr.sourceLine).toBe(5);
      expect(schemaErr.message).toContain(
        "Choice question must mark at least one correct answer with [x]"
      );
    }
  });

  it("Rule 4: Blockquote with no answer-bearing content detects reflection", () => {
    const md = `# Quiz\n\n### Architectural trade-offs\n\n> Consider monolith vs microservices.`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.type).toBe("reflection");
    expect(q.hint).toBe("Consider monolith vs microservices.");
  });

  it("Rule 5: Other content under H3 detects reflection with fallback", () => {
    const md = `# Quiz\n\n### Free-form question\n\nWrite your thoughts here.`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.type).toBe("reflection");
    expect(q.promptHtml).toContain("Write your thoughts here.");
  });
});

describe("Hint extraction vs prose blockquotes", () => {
  it("treats first blockquote as hint and subsequent blockquote as prompt prose", () => {
    const md = `# Quiz\n\n### Question with hints\n\n> This is the hint.\n\nSome prompt text.\n\n> This is prose in the prompt.\n\n- [x] Option 1\n- [ ] Option 2`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.hint).toBe("This is the hint.");
    expect(q.promptHtml).toContain("Some prompt text.");
    expect(q.promptHtml).toContain("This is prose in the prompt.");
  });

  it("treats blockquote after answer elements as explanation", () => {
    const md = `# Quiz\n\n### Question with explanation blockquote\n\n- [x] True\n- [ ] False\n\n> Detailed explanation blockquote.`;
    const model = parseMarkdown(md);
    const q = model.sections[0].questions[0];
    expect(q.hint).toBeUndefined();
    expect(q.explanationHtml).toContain("Detailed explanation blockquote.");
  });
});

describe("Schema round-trip", () => {
  it("parses full-feature.md, serializes to JSON, re-validates, and deep equals", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/full-feature.md");
    const raw = fs.readFileSync(fixturePath, "utf-8");
    const model = parseMarkdown(raw, fixturePath);

    validateQuizModel(model, fixturePath);

    const json = JSON.stringify(model);
    const deserialized = JSON.parse(json) as QuizModel;

    validateQuizModel(deserialized, fixturePath);
    expect(deserialized).toEqual(model);
  });
});

describe("Validation against schema.json via Ajv", () => {
  it("validates model against Draft 2020-12 schema", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(quizModelSchema);

    const validModel: QuizModel = {
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
              type: "multi-choice",
              sourceLine: 5,
              options: [
                { id: "opt-0", text: "A", isCorrect: true },
                { id: "opt-1", text: "B", isCorrect: false },
              ],
            },
          ],
        },
      ],
      contentHash: "abcdef123456",
      totalQuestions: 1,
    };

    expect(validate(validModel)).toBe(true);
    expect(() => validateQuizModel(validModel)).not.toThrow();
  });

  it("throws SchemaValidationError when title is missing", () => {
    const invalidModel: QuizModel = {
      title: "",
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
              sourceLine: 3,
            },
          ],
        },
      ],
      contentHash: "hash",
      totalQuestions: 1,
    };

    expect(() => validateQuizModel(invalidModel)).toThrow(SchemaValidationError);
  });

  it("throws SchemaValidationError when sections are empty", () => {
    const invalidModel: QuizModel = {
      title: "Quiz",
      frontmatter: {},
      sections: [],
      contentHash: "hash",
      totalQuestions: 0,
    };

    expect(() => validateQuizModel(invalidModel)).toThrow(SchemaValidationError);
  });

  it("throws SchemaValidationError for match-pairs with empty prompt or answer", () => {
    const invalidModel: QuizModel = {
      title: "Quiz",
      frontmatter: {},
      sections: [
        {
          id: "sec-1",
          title: "Section 1",
          questions: [
            {
              id: "q-1",
              title: "Match",
              type: "match-pairs",
              sourceLine: 5,
              pairs: [{ prompt: "", answer: "answer" }],
            },
          ],
        },
      ],
      contentHash: "hash",
      totalQuestions: 1,
    };

    expect(() => validateQuizModel(invalidModel)).toThrow(SchemaValidationError);
  });

  it("throws SchemaValidationError for short-answer with empty canonicalAnswer", () => {
    const invalidModel: QuizModel = {
      title: "Quiz",
      frontmatter: {},
      sections: [
        {
          id: "sec-1",
          title: "Section 1",
          questions: [
            {
              id: "q-1",
              title: "Short",
              type: "short-answer",
              sourceLine: 5,
              canonicalAnswer: "",
            },
          ],
        },
      ],
      contentHash: "hash",
      totalQuestions: 1,
    };

    expect(() => validateQuizModel(invalidModel)).toThrow(SchemaValidationError);
  });
});
