import { createHash } from "node:crypto";
import { Marked } from "marked";
import hljs from "highlight.js";
import { extractFrontmatter } from "./frontmatter.js";
import {
  ChoiceOption,
  MatchPair,
  Question,
  QuestionType,
  QuizModel,
  Section,
} from "./schema.js";
import { SchemaValidationError, validateQuizModel } from "./validate.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const markedRenderer = new Marked({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : undefined;
      let highlighted = "";
      if (language) {
        highlighted = hljs.highlight(text, { language }).value;
      } else {
        try {
          highlighted = hljs.highlightAuto(text).value;
        } catch {
          highlighted = escapeHtml(text);
        }
      }
      const classAttr = language ? ` class="hljs language-${language}"` : ` class="hljs"`;
      return `<pre><code${classAttr}>${highlighted}</code></pre>`;
    },
  },
});

function renderMarkdown(md: string): string | undefined {
  const trimmed = md.trim();
  if (!trimmed) {
    return undefined;
  }
  const html = markedRenderer.parse(trimmed) as string;
  return html.trim() || undefined;
}

function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return slug || fallback;
}

function getUniqueId(base: string, seen: Set<string>): string {
  let id = base;
  let counter = 1;
  while (seen.has(id)) {
    id = `${base}-${counter}`;
    counter++;
  }
  seen.add(id);
  return id;
}

interface SourceLine {
  text: string;
  lineNum: number;
}

function matchHeading(line: string, level: number): string | null {
  const prefix = "#".repeat(level);
  const regex = new RegExp(`^\\s{0,3}${prefix}\\s+(.*)$`);
  const match = line.match(regex);
  if (!match) return null;
  if (line.trim().startsWith(prefix + "#")) return null;
  return match[1].trim();
}

interface TaskItem {
  lineIndex: number;
  lineNum: number;
  text: string;
  checked: boolean;
}

function findTaskList(
  lines: SourceLine[],
  isFenceAt: boolean[]
): { startIndex: number; endIndex: number; items: TaskItem[] } | null {
  const taskRegex = /^\s*[-*+]\s*\[([ xX])\]\s*(.*)$/;
  const items: TaskItem[] = [];
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (isFenceAt[i]) continue;
    const match = lines[i].text.match(taskRegex);
    if (match) {
      if (startIndex === -1) {
        startIndex = i;
      }
      endIndex = i;
      items.push({
        lineIndex: i,
        lineNum: lines[i].lineNum,
        text: match[2].trim(),
        checked: match[1].toLowerCase() === "x",
      });
    } else if (startIndex !== -1 && items.length > 0) {
      if (/^\s{2,}\S/.test(lines[i].text) && !lines[i].text.trim().startsWith("#")) {
        items[items.length - 1].text += " " + lines[i].text.trim();
        endIndex = i;
      }
    }
  }

  if (items.length > 0) {
    return { startIndex, endIndex, items };
  }
  return null;
}

function findTable(
  lines: SourceLine[],
  isFenceAt: boolean[]
): { startIndex: number; endIndex: number; pairs: MatchPair[] } | null {
  for (let i = 0; i < lines.length - 1; i++) {
    if (isFenceAt[i] || isFenceAt[i + 1]) continue;
    const headerLine = lines[i].text.trim();
    const sepLine = lines[i + 1].text.trim();
    if (!headerLine.includes("|") || !sepLine.includes("|")) continue;

    const sepCells = sepLine
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (sepCells.length === 0 || !sepCells.every((c) => /^:?-{2,}:?$/.test(c))) {
      continue;
    }

    const pairs: MatchPair[] = [];
    let endIndex = i + 1;
    for (let j = i + 2; j < lines.length; j++) {
      if (isFenceAt[j]) break;
      const dataLine = lines[j].text.trim();
      if (!dataLine.includes("|")) break;
      const cells = dataLine
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      if (cells.length >= 2) {
        pairs.push({ prompt: cells[0], answer: cells[1] });
      }
      endIndex = j;
    }

    if (pairs.length > 0) {
      return { startIndex: i, endIndex, pairs };
    }
  }
  return null;
}

interface BlockquoteBlock {
  startIndex: number;
  endIndex: number;
  text: string;
}

function findBlockquotes(lines: SourceLine[], isFenceAt: boolean[]): BlockquoteBlock[] {
  const bqs: BlockquoteBlock[] = [];
  let inBq = false;
  let start = -1;
  let bqLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isFenceAt[i] && /^\s*>\s?/.test(lines[i].text)) {
      if (!inBq) {
        inBq = true;
        start = i;
        bqLines = [];
      }
      bqLines.push(lines[i].text.replace(/^\s*>\s?/, ""));
    } else {
      if (inBq) {
        bqs.push({
          startIndex: start,
          endIndex: i - 1,
          text: bqLines.join("\n").trim(),
        });
        inBq = false;
      }
    }
  }
  if (inBq) {
    bqs.push({
      startIndex: start,
      endIndex: lines.length - 1,
      text: bqLines.join("\n").trim(),
    });
  }
  return bqs;
}

function parseQuestion(
  title: string,
  sourceLine: number,
  lines: SourceLine[],
  filePath: string | undefined,
  seenIds: Set<string>
): Question {
  const isFenceAt: boolean[] = [];
  let inFence = false;
  let fenceMarker = "";
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].text.trim();
    if (!inFence) {
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        inFence = true;
        fenceMarker = trimmed.slice(0, 3);
        isFenceAt[i] = true;
      } else {
        isFenceAt[i] = false;
      }
    } else {
      isFenceAt[i] = true;
      if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
    }
  }

  interface H4Block {
    index: number;
    title: string;
  }
  const h4Headings: H4Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isFenceAt[i]) {
      const heading = matchHeading(lines[i].text, 4);
      if (heading !== null) {
        h4Headings.push({ index: i, title: heading });
      }
    }
  }

  const rubricH4 = h4Headings.find((h) => /^(rubric|criteria)$/i.test(h.title));
  const modelAnswerH4 = h4Headings.find((h) => /^(model answer|exemplar)$/i.test(h.title));

  let rubric: string[] | undefined;
  if (rubricH4) {
    const nextH4 = h4Headings.find((h) => h.index > rubricH4.index);
    const rubricEndIndex = nextH4 ? nextH4.index : lines.length;
    const rubricLines = lines.slice(rubricH4.index + 1, rubricEndIndex);

    const taskRegex = /^\s*[-*+]\s*\[([ xX])\]\s*(.*)$/;
    const items: string[] = [];
    for (let i = 0; i < rubricLines.length; i++) {
      const match = rubricLines[i].text.match(taskRegex);
      if (match) {
        items.push(match[2].trim());
      } else if (
        items.length > 0 &&
        /^\s{2,}\S/.test(rubricLines[i].text) &&
        !rubricLines[i].text.trim().startsWith("#")
      ) {
        items[items.length - 1] += " " + rubricLines[i].text.trim();
      }
    }
    if (items.length === 0) {
      const bulletRegex = /^\s*[-*+]\s+(.*)$/;
      for (let i = 0; i < rubricLines.length; i++) {
        const match = rubricLines[i].text.match(bulletRegex);
        if (match) {
          items.push(match[1].trim());
        }
      }
    }
    if (items.length > 0) {
      rubric = items;
    }
  }

  let modelAnswerHtml: string | undefined;
  if (modelAnswerH4) {
    const nextH4 = h4Headings.find((h) => h.index > modelAnswerH4.index);
    const modelEndIndex = nextH4 ? nextH4.index : lines.length;
    const modelLines = lines.slice(modelAnswerH4.index + 1, modelEndIndex);
    modelAnswerHtml = renderMarkdown(modelLines.map((l) => l.text).join("\n"));
  }

  const table = findTable(lines, isFenceAt);
  const taskList = findTaskList(lines, isFenceAt);
  const blockquotes = findBlockquotes(lines, isFenceAt);

  let type: QuestionType;
  let answerStartIndex = lines.length;
  let answerEndIndex = lines.length - 1;
  let options: ChoiceOption[] | undefined;
  let pairs: MatchPair[] | undefined;
  let canonicalAnswer: string | undefined;
  let fuzzyTolerance: number | undefined;

  if (rubric !== undefined && rubric.length > 0) {
    type = "essay";
    const essayIndices = [rubricH4?.index, modelAnswerH4?.index].filter(
      (idx): idx is number => idx !== undefined
    );
    answerStartIndex = Math.min(...essayIndices);
    answerEndIndex = lines.length - 1;
  } else if (h4Headings.length > 0) {
    type = "short-answer";
    canonicalAnswer = h4Headings[0].title;
    fuzzyTolerance = 1;
    answerStartIndex = h4Headings[0].index;
    answerEndIndex = h4Headings[0].index;
  } else if (table !== null) {
    type = "match-pairs";
    pairs = table.pairs;
    answerStartIndex = table.startIndex;
    answerEndIndex = table.endIndex;
  } else if (taskList !== null) {
    const checkedCount = taskList.items.filter((it) => it.checked).length;
    if (checkedCount === 0) {
      throw new SchemaValidationError(
        "Choice question must mark at least one correct answer with [x]",
        taskList.items[0].lineNum,
        filePath
      );
    }

    if (checkedCount > 1) {
      type = "multi-select";
    } else {
      const texts = taskList.items.map((it) => it.text.toLowerCase().trim()).sort();
      const isTrueFalse =
        taskList.items.length === 2 && texts[0] === "false" && texts[1] === "true";
      if (isTrueFalse) {
        type = "true-false";
      } else {
        type = "multi-choice";
      }
    }

    options = taskList.items.map((it, idx) => ({
      id: `opt-${idx}`,
      text: it.text,
      isCorrect: it.checked,
    }));
    answerStartIndex = taskList.startIndex;
    answerEndIndex = taskList.endIndex;
  } else if (blockquotes.length > 0) {
    type = "reflection";
    answerStartIndex = lines.length;
    answerEndIndex = lines.length;
  } else {
    type = "reflection";
    answerStartIndex = lines.length;
    answerEndIndex = lines.length;
    console.warn(
      `Question "${title}" at line ${sourceLine}: no answer-bearing elements found, treating as reflection.`
    );
  }

  let hint: string | undefined;
  let hintBqIndex = -1;
  for (let b = 0; b < blockquotes.length; b++) {
    if (blockquotes[b].startIndex < answerStartIndex) {
      hint = blockquotes[b].text;
      hintBqIndex = b;
      break;
    }
  }

  const promptLines: SourceLine[] = [];
  for (let i = 0; i < answerStartIndex; i++) {
    if (
      hintBqIndex !== -1 &&
      i >= blockquotes[hintBqIndex].startIndex &&
      i <= blockquotes[hintBqIndex].endIndex
    ) {
      continue;
    }
    promptLines.push(lines[i]);
  }

  const promptHtml = renderMarkdown(promptLines.map((l) => l.text).join("\n"));

  let explanationHtml: string | undefined;
  if (answerEndIndex < lines.length - 1) {
    const explLines = lines.slice(answerEndIndex + 1);
    explanationHtml = renderMarkdown(explLines.map((l) => l.text).join("\n"));
  }

  const id = getUniqueId(slugify(title, "question"), seenIds);

  return {
    id,
    title,
    type,
    ...(hint ? { hint } : {}),
    ...(promptHtml ? { promptHtml } : {}),
    ...(explanationHtml ? { explanationHtml } : {}),
    sourceLine,
    ...(options ? { options } : {}),
    ...(pairs ? { pairs } : {}),
    ...(canonicalAnswer !== undefined ? { canonicalAnswer } : {}),
    ...(fuzzyTolerance !== undefined ? { fuzzyTolerance } : {}),
    ...(rubric ? { rubric } : {}),
    ...(modelAnswerHtml ? { modelAnswerHtml } : {}),
  };
}

export interface ParseMarkdownOptions {
  validate?: boolean;
}

export function parseMarkdown(
  markdown: string,
  filePath?: string,
  options?: ParseMarkdownOptions
): QuizModel {
  const cleanMarkdown = markdown.replace(/^\uFEFF/, "");
  const { frontmatter, body, bodyStartLine } = extractFrontmatter(cleanMarkdown);
  const rawLines = body.split(/\r?\n/);
  const bodyLines: SourceLine[] = rawLines.map((text, idx) => ({
    text,
    lineNum: bodyStartLine + idx,
  }));

  const isFenceAt: boolean[] = [];
  let inFence = false;
  let fenceMarker = "";
  for (let i = 0; i < bodyLines.length; i++) {
    const trimmed = bodyLines[i].text.trim();
    if (!inFence) {
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        inFence = true;
        fenceMarker = trimmed.slice(0, 3);
        isFenceAt[i] = true;
      } else {
        isFenceAt[i] = false;
      }
    } else {
      isFenceAt[i] = true;
      if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
    }
  }

  let h1Title: string | null = null;
  let h1Index = -1;
  for (let i = 0; i < bodyLines.length; i++) {
    if (!isFenceAt[i]) {
      const heading = matchHeading(bodyLines[i].text, 1);
      if (heading !== null) {
        h1Title = heading;
        h1Index = i;
        break;
      }
    }
  }

  let leadInDescription: string | undefined;
  let leadInEndIndex = h1Index;
  if (h1Index !== -1) {
    let nextNonEmpty = -1;
    for (let i = h1Index + 1; i < bodyLines.length; i++) {
      if (bodyLines[i].text.trim().length > 0) {
        nextNonEmpty = i;
        break;
      }
    }
    if (nextNonEmpty !== -1 && !isFenceAt[nextNonEmpty] && /^\s*>\s?/.test(bodyLines[nextNonEmpty].text)) {
      const descLines: string[] = [];
      for (let i = nextNonEmpty; i < bodyLines.length; i++) {
        if (!isFenceAt[i] && /^\s*>\s?/.test(bodyLines[i].text)) {
          descLines.push(bodyLines[i].text.replace(/^\s*>\s?/, ""));
          leadInEndIndex = i;
        } else {
          break;
        }
      }
      leadInDescription = descLines.join("\n").trim() || undefined;
    }
  }

  const contentStartIndex = leadInEndIndex + 1;
  const contentLines = bodyLines.slice(contentStartIndex);
  const contentFenceAt = isFenceAt.slice(contentStartIndex);

  interface SectionBlock {
    title: string;
    lines: SourceLine[];
  }

  const sectionBlocks: SectionBlock[] = [];
  let currentSecTitle: string | null = null;
  let currentSecLines: SourceLine[] = [];

  for (let i = 0; i < contentLines.length; i++) {
    if (!contentFenceAt[i]) {
      const h2 = matchHeading(contentLines[i].text, 2);
      if (h2 !== null) {
        if (currentSecTitle !== null || currentSecLines.some((l) => l.text.trim().length > 0)) {
          sectionBlocks.push({
            title: currentSecTitle ?? "General",
            lines: currentSecLines,
          });
        }
        currentSecTitle = h2;
        currentSecLines = [];
        continue;
      }
    }
    currentSecLines.push(contentLines[i]);
  }

  if (currentSecTitle !== null || currentSecLines.some((l) => l.text.trim().length > 0)) {
    sectionBlocks.push({
      title: currentSecTitle ?? "General",
      lines: currentSecLines,
    });
  }

  if (sectionBlocks.length === 0) {
    sectionBlocks.push({
      title: "General",
      lines: [],
    });
  }

  const seenSectionIds = new Set<string>();
  const seenQuestionIds = new Set<string>();

  const sections: Section[] = sectionBlocks.map((sb) => {
    const secId = getUniqueId(slugify(sb.title, "section"), seenSectionIds);
    const secLines = sb.lines;

    const secFenceAt: boolean[] = [];
    let secInFence = false;
    let secMarker = "";
    for (let i = 0; i < secLines.length; i++) {
      const trimmed = secLines[i].text.trim();
      if (!secInFence) {
        if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
          secInFence = true;
          secMarker = trimmed.slice(0, 3);
          secFenceAt[i] = true;
        } else {
          secFenceAt[i] = false;
        }
      } else {
        secFenceAt[i] = true;
        if (trimmed.startsWith(secMarker)) {
          secInFence = false;
        }
      }
    }

    interface QuestionBlock {
      title: string;
      sourceLine: number;
      lines: SourceLine[];
    }

    const questionBlocks: QuestionBlock[] = [];
    let curQTitle: string | null = null;
    let curQLine = 0;
    let curQLines: SourceLine[] = [];

    for (let i = 0; i < secLines.length; i++) {
      if (!secFenceAt[i]) {
        const h3 = matchHeading(secLines[i].text, 3);
        if (h3 !== null) {
          if (curQTitle !== null) {
            questionBlocks.push({
              title: curQTitle,
              sourceLine: curQLine,
              lines: curQLines,
            });
          }
          curQTitle = h3;
          curQLine = secLines[i].lineNum;
          curQLines = [];
          continue;
        }
      }
      if (curQTitle !== null) {
        curQLines.push(secLines[i]);
      }
    }

    if (curQTitle !== null) {
      questionBlocks.push({
        title: curQTitle,
        sourceLine: curQLine,
        lines: curQLines,
      });
    }

    const questions: Question[] = questionBlocks.map((qb) =>
      parseQuestion(qb.title, qb.sourceLine, qb.lines, filePath, seenQuestionIds)
    );

    return {
      id: secId,
      title: sb.title,
      questions,
    };
  });

  const nonEmptySections = sections.filter((s) => s.questions.length > 0);
  const finalSections = nonEmptySections.length > 0 ? nonEmptySections : sections;

  const contentHash = createHash("sha256").update(cleanMarkdown).digest("hex");
  const totalQuestions = finalSections.reduce((sum, s) => sum + s.questions.length, 0);
  const title = h1Title ?? (frontmatter.title as string | undefined) ?? "";
  const description =
    leadInDescription ?? (frontmatter.description as string | undefined) ?? undefined;

  const model: QuizModel = {
    title,
    ...(description ? { description } : {}),
    frontmatter,
    sections: finalSections,
    contentHash,
    totalQuestions,
  };

  if (options?.validate) {
    validateQuizModel(model, filePath);
  }

  return model;
}
