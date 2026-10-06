import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { QuizModel } from "./schema.js";

export class SchemaValidationError extends Error {
  sourceLine?: number;
  filePath?: string;

  constructor(message: string, sourceLine?: number, filePath?: string) {
    const loc = [filePath, sourceLine !== undefined ? `line ${sourceLine}` : undefined]
      .filter(Boolean)
      .join(":");
    const fullMessage = loc ? `${loc}: ${message}` : message;
    super(fullMessage);
    this.name = "SchemaValidationError";
    this.sourceLine = sourceLine;
    this.filePath = filePath;
  }
}

export const quizModelSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/hollowheap/md-questioner/schema.json",
  title: "QuizModel",
  type: "object",
  required: [
    "title",
    "frontmatter",
    "sections",
    "contentHash",
    "totalQuestions",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    frontmatter: { $ref: "#/$defs/Frontmatter" },
    sections: {
      type: "array",
      items: { $ref: "#/$defs/Section" },
    },
    contentHash: { type: "string" },
    totalQuestions: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
  $defs: {
    Frontmatter: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        author: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
      additionalProperties: true,
    },
    ChoiceOption: {
      type: "object",
      required: ["id", "text", "isCorrect"],
      properties: {
        id: { type: "string" },
        text: { type: "string" },
        isCorrect: { type: "boolean" },
      },
      additionalProperties: false,
    },
    MatchPair: {
      type: "object",
      required: ["prompt", "answer"],
      properties: {
        prompt: { type: "string" },
        answer: { type: "string" },
      },
      additionalProperties: false,
    },
    Question: {
      type: "object",
      required: ["id", "title", "type", "sourceLine"],
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        type: {
          type: "string",
          enum: [
            "multi-choice",
            "multi-select",
            "true-false",
            "match-pairs",
            "short-answer",
            "reflection",
          ],
        },
        hint: { type: "string" },
        promptHtml: { type: "string" },
        explanationHtml: { type: "string" },
        sourceLine: { type: "integer", minimum: 1 },
        options: {
          type: "array",
          items: { $ref: "#/$defs/ChoiceOption" },
        },
        pairs: {
          type: "array",
          items: { $ref: "#/$defs/MatchPair" },
        },
        canonicalAnswer: { type: "string" },
        fuzzyTolerance: { type: "number" },
      },
      additionalProperties: false,
    },
    Section: {
      type: "object",
      required: ["id", "title", "questions"],
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        questions: {
          type: "array",
          items: { $ref: "#/$defs/Question" },
        },
      },
      additionalProperties: false,
    },
  },
};

function getSchema(): object {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.resolve(__dirname, "../../dist/reference/schema.json");
    if (fs.existsSync(schemaPath)) {
      return JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    }
  } catch {
    // fallback to embedded schema
  }
  return quizModelSchema;
}

const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile(getSchema());

export function validateQuizModel(model: QuizModel, filePath?: string): void {
  const valid = validate(model);
  if (!valid && validate.errors && validate.errors.length > 0) {
    const err = validate.errors[0];
    let sourceLine: number | undefined;
    if (err.instancePath) {
      const match = err.instancePath.match(/^\/sections\/(\d+)\/questions\/(\d+)/);
      if (match) {
        const sIdx = parseInt(match[1], 10);
        const qIdx = parseInt(match[2], 10);
        sourceLine = model.sections?.[sIdx]?.questions?.[qIdx]?.sourceLine;
      }
    }
    const msg = `Schema validation error at ${err.instancePath || "/"}: ${err.message}`;
    throw new SchemaValidationError(msg, sourceLine, filePath);
  }

  if (!model.title || model.title.trim().length === 0) {
    throw new SchemaValidationError(
      "Document must have a title (H1 heading or frontmatter title)",
      undefined,
      filePath
    );
  }

  if (!model.sections || model.sections.length === 0) {
    throw new SchemaValidationError(
      "Document must have at least one section",
      undefined,
      filePath
    );
  }

  if (
    model.totalQuestions === 0 ||
    model.sections.every((s) => s.questions.length === 0)
  ) {
    throw new SchemaValidationError(
      "Document must have at least one question",
      undefined,
      filePath
    );
  }

  for (const section of model.sections) {
    for (const q of section.questions) {
      if (
        q.type === "multi-choice" ||
        q.type === "multi-select" ||
        q.type === "true-false"
      ) {
        if (!q.options || q.options.length === 0) {
          throw new SchemaValidationError(
            `Choice question "${q.title}" must have options`,
            q.sourceLine,
            filePath
          );
        }
        if (!q.options.some((opt) => opt.isCorrect)) {
          throw new SchemaValidationError(
            "Choice question must mark at least one correct answer with [x]",
            q.sourceLine,
            filePath
          );
        }
      } else if (q.type === "match-pairs") {
        if (!q.pairs || q.pairs.length === 0) {
          throw new SchemaValidationError(
            `Match-pairs question "${q.title}" must have at least one pair`,
            q.sourceLine,
            filePath
          );
        }
        for (const pair of q.pairs) {
          if (!pair.prompt?.trim() || !pair.answer?.trim()) {
            throw new SchemaValidationError(
              `Match-pairs question "${q.title}" has an empty prompt or answer`,
              q.sourceLine,
              filePath
            );
          }
        }
      } else if (q.type === "short-answer") {
        if (!q.canonicalAnswer || q.canonicalAnswer.trim().length === 0) {
          throw new SchemaValidationError(
            `Short-answer question "${q.title}" must have a canonical answer`,
            q.sourceLine,
            filePath
          );
        }
      }
    }
  }
}
