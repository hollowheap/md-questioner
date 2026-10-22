import { createHash } from "node:crypto";
import { Marked } from "marked";
import hljs from "highlight.js";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import type {
  Blockquote,
  Heading,
  List,
  ListItem,
  RootContent,
  Table,
} from "mdast";
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
    // Quizzes carry no images: keep the alt text as a note instead of an <img>.
    image({ text }: { text?: string }) {
      const alt = (text ?? "").trim();
      return alt ? `<em>${escapeHtml(alt)}</em>` : "";
    },
  },
});

/** Raw <img> tags in the source are replaced by their alt text as a note. */
const RAW_IMAGE_TAG = /<img\b([^>]*)>/gi;

/**
 * Raw HTML in the source can reference external assets (iframe, script, video, ...)
 * or run inline handlers, which would break the zero-network invariant. The
 * generated Markdown markup (p, ul, code, table, ...) is left untouched.
 *
 * The first pattern consumes the matching closer and everything between it, so a
 * closed element's body never leaks into prose; with no closer it falls back to
 * stripping the opener alone (the leftover text is inert). The second pattern
 * removes stray end tags left over from mismatched markup.
 */
const RAW_HTML_ELEMENTS =
  /<(script|style|iframe|frame|frameset|object|embed|applet|video|audio|source|track|link|base|meta|form|input|button|select|option|textarea|noscript|template|svg|math)\b[^>]*>(?:[\s\S]*?<\/\1\s*>)?/gi;
const RAW_HTML_CLOSERS =
  /<\/\s*(script|style|iframe|frame|frameset|object|embed|applet|video|audio|source|track|link|base|meta|form|input|button|select|option|textarea|noscript|template|svg|math)\s*>/gi;
const EVENT_HANDLER_ATTRS = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const INLINE_STYLE_ATTRS = /\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const RESOURCE_ATTRS =
  /\s(?:src|srcset|data|poster|background|action|formaction|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const SCRIPT_HREFS =
  /\shref\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;

function sanitizeHtml(html: string): string {
  return html
    .replace(RAW_HTML_ELEMENTS, "")
    .replace(RAW_HTML_CLOSERS, "")
    .replace(EVENT_HANDLER_ATTRS, "")
    .replace(INLINE_STYLE_ATTRS, "")
    .replace(RESOURCE_ATTRS, "")
    .replace(SCRIPT_HREFS, ' href="#"');
}

function stripImages(html: string): string {
  return html.replace(RAW_IMAGE_TAG, (_match, attributes: string) => {
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(attributes);
    const label = (alt?.[1] ?? "").trim();
    return label ? `<em>${escapeHtml(label)}</em>` : "";
  });
}

function renderMarkdown(md: string): string | undefined {
  const trimmed = md.trim();
  if (!trimmed) {
    return undefined;
  }
  const html = markedRenderer.parse(trimmed) as string;
  return sanitizeHtml(stripImages(html)).trim() || undefined;
}

/**
 * Renders a list of mdast block nodes to HTML by slicing their original source
 * ranges and running them through the Marked/highlight.js pipeline. Slicing the
 * source (rather than re-serializing the tree) keeps the emitted HTML byte-for-byte
 * compatible with the previous line-based renderer.
 */
function renderNodes(nodes: RootContent[], source: string): string | undefined {
  const parts: string[] = [];
  for (const node of nodes) {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start === undefined || end === undefined) continue;
    const html = renderMarkdown(source.slice(start, end));
    if (html) parts.push(html);
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

/** Concatenates the plain-text value of a node (markdown syntax stripped). */
function nodeText(node: unknown): string {
  if (node === null || typeof node !== "object") return "";
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if ((n.type === "text" || n.type === "inlineCode" || n.type === "code") && typeof n.value === "string") {
    return n.value;
  }
  if (Array.isArray(n.children)) {
    return n.children.map((child) => nodeText(child)).join("");
  }
  return "";
}

/** Extracts blockquote text with leading `>` markers stripped, preserving inline markdown. */
function blockquoteText(node: Blockquote, source: string): string {
  const start = node.position?.start?.offset ?? 0;
  const end = node.position?.end?.offset ?? 0;
  return source
    .slice(start, end)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*>\s?/, ""))
    .join("\n")
    .trim();
}

function isHeading(node: RootContent, depth: number): node is Heading {
  return node.type === "heading" && (node as Heading).depth === depth;
}

function isTaskList(node: RootContent): node is List {
  if (node.type !== "list") return false;
  return (node as List).children.some((li) => li.checked !== null && li.checked !== undefined);
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

function absLine(node: { position?: { start: { line: number } } } | undefined, lineOffset: number, fallback: number): number {
  return node?.position ? node.position.start.line + lineOffset : fallback;
}

function parseQuestion(
  title: string,
  sourceLine: number,
  nodes: RootContent[],
  source: string,
  lineOffset: number,
  filePath: string | undefined,
  seenIds: Set<string>
): Question {
  const h4Headings = nodes
    .map((node, index) => ({ node, index }))
    .filter((entry): entry is { node: Heading; index: number } => isHeading(entry.node, 4));

  const rubricH4 = h4Headings.find((h) => /^(rubric|criteria)$/i.test(nodeText(h.node).trim()));
  const modelAnswerH4 = h4Headings.find((h) => /^(model answer|exemplar)$/i.test(nodeText(h.node).trim()));

  let rubric: string[] | undefined;
  if (rubricH4) {
    const nextH4 = h4Headings.find((h) => h.index > rubricH4.index);
    const rubricEnd = nextH4 ? nextH4.index : nodes.length;
    const rubricNodes = nodes.slice(rubricH4.index + 1, rubricEnd);
    const list = rubricNodes.find((n): n is List => n.type === "list");
    const items: string[] = [];
    if (list) {
      const taskItems = list.children.filter((li) => li.checked !== null && li.checked !== undefined);
      const chosen: ListItem[] = taskItems.length > 0 ? taskItems : list.children;
      for (const li of chosen) {
        const text = nodeText(li).trim();
        if (text) items.push(text);
      }
    }
    if (items.length > 0) rubric = items;
  }

  let modelAnswerHtml: string | undefined;
  if (modelAnswerH4) {
    const nextH4 = h4Headings.find((h) => h.index > modelAnswerH4.index);
    const modelEnd = nextH4 ? nextH4.index : nodes.length;
    modelAnswerHtml = renderNodes(nodes.slice(modelAnswerH4.index + 1, modelEnd), source);
  }

  const tableEntry = nodes
    .map((node, index) => ({ node, index }))
    .find((entry) => entry.node.type === "table" && (entry.node as Table).children.length > 1);
  const taskListEntry = nodes
    .map((node, index) => ({ node, index }))
    .find((entry) => isTaskList(entry.node));
  const blockquotes = nodes
    .map((node, index) => ({ node, index }))
    .filter((entry): entry is { node: Blockquote; index: number } => entry.node.type === "blockquote");

  let type: QuestionType;
  let answerStartIndex = nodes.length;
  let answerEndIndex = nodes.length - 1;
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
    answerEndIndex = nodes.length - 1;
  } else if (h4Headings.length > 0) {
    type = "short-answer";
    canonicalAnswer = nodeText(h4Headings[0].node).trim();
    fuzzyTolerance = 1;
    answerStartIndex = h4Headings[0].index;
    answerEndIndex = h4Headings[0].index;
  } else if (tableEntry) {
    type = "match-pairs";
    const table = tableEntry.node as Table;
    pairs = table.children.slice(1).map((row) => ({
      prompt: nodeText(row.children[0]).trim(),
      answer: nodeText(row.children[1]).trim(),
    }));
    answerStartIndex = tableEntry.index;
    answerEndIndex = tableEntry.index;
  } else if (taskListEntry) {
    const list = taskListEntry.node as List;
    const items = list.children.map((li) => ({
      text: nodeText(li).trim(),
      checked: li.checked === true,
    }));
    const checkedCount = items.filter((it) => it.checked).length;
    if (checkedCount === 0) {
      throw new SchemaValidationError(
        "Choice question must mark at least one correct answer with [x]",
        absLine(list.children[0], lineOffset, sourceLine),
        filePath
      );
    }

    if (checkedCount > 1) {
      type = "multi-select";
    } else {
      const texts = items.map((it) => it.text.toLowerCase().trim()).sort();
      const isTrueFalse = items.length === 2 && texts[0] === "false" && texts[1] === "true";
      type = isTrueFalse ? "true-false" : "multi-choice";
    }

    options = items.map((it, idx) => ({
      id: `opt-${idx}`,
      text: it.text,
      isCorrect: it.checked,
    }));
    answerStartIndex = taskListEntry.index;
    answerEndIndex = taskListEntry.index;
  } else if (blockquotes.length > 0) {
    type = "reflection";
    answerStartIndex = nodes.length;
    answerEndIndex = nodes.length;
  } else {
    type = "reflection";
    answerStartIndex = nodes.length;
    answerEndIndex = nodes.length;
    console.warn(
      `Question "${title}" at line ${sourceLine}: no answer-bearing elements found, treating as reflection.`
    );
  }

  let hint: string | undefined;
  let hintIndex = -1;
  for (const bq of blockquotes) {
    if (bq.index < answerStartIndex) {
      hint = blockquoteText(bq.node, source);
      hintIndex = bq.index;
      break;
    }
  }

  const promptNodes = nodes
    .slice(0, answerStartIndex)
    .filter((_, index) => index !== hintIndex);
  const promptHtml = renderNodes(promptNodes, source);

  let explanationHtml: string | undefined;
  if (answerEndIndex < nodes.length - 1) {
    explanationHtml = renderNodes(nodes.slice(answerEndIndex + 1), source);
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
  const lineOffset = bodyStartLine - 1;

  const tree = fromMarkdown(body, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const children = tree.children;

  let h1Title: string | null = null;
  let h1Index = -1;
  for (let i = 0; i < children.length; i++) {
    if (isHeading(children[i], 1)) {
      h1Title = nodeText(children[i]).trim();
      h1Index = i;
      break;
    }
  }

  let leadInDescription: string | undefined;
  let contentStartIndex = h1Index + 1;
  if (h1Index !== -1) {
    const next = children[h1Index + 1];
    if (next && next.type === "blockquote") {
      leadInDescription = blockquoteText(next as Blockquote, body) || undefined;
      contentStartIndex = h1Index + 2;
    }
  }

  interface SectionBlock {
    title: string;
    nodes: RootContent[];
  }

  const sectionBlocks: SectionBlock[] = [];
  let currentSecTitle: string | null = null;
  let currentSecNodes: RootContent[] = [];

  for (const node of children.slice(contentStartIndex)) {
    if (isHeading(node, 2)) {
      if (currentSecTitle !== null || currentSecNodes.length > 0) {
        sectionBlocks.push({ title: currentSecTitle ?? "General", nodes: currentSecNodes });
      }
      currentSecTitle = nodeText(node).trim();
      currentSecNodes = [];
      continue;
    }
    currentSecNodes.push(node);
  }

  if (currentSecTitle !== null || currentSecNodes.length > 0) {
    sectionBlocks.push({ title: currentSecTitle ?? "General", nodes: currentSecNodes });
  }

  if (sectionBlocks.length === 0) {
    sectionBlocks.push({ title: "General", nodes: [] });
  }

  const seenSectionIds = new Set<string>();
  const seenQuestionIds = new Set<string>();

  const sections: Section[] = sectionBlocks.map((sb) => {
    const secId = getUniqueId(slugify(sb.title, "section"), seenSectionIds);

    interface QuestionBlock {
      title: string;
      sourceLine: number;
      nodes: RootContent[];
    }

    const questionBlocks: QuestionBlock[] = [];
    let curQTitle: string | null = null;
    let curQLine = 0;
    let curQNodes: RootContent[] = [];

    for (const node of sb.nodes) {
      if (isHeading(node, 3)) {
        if (curQTitle !== null) {
          questionBlocks.push({ title: curQTitle, sourceLine: curQLine, nodes: curQNodes });
        }
        curQTitle = nodeText(node).trim();
        curQLine = absLine(node, lineOffset, 0);
        curQNodes = [];
        continue;
      }
      if (curQTitle !== null) {
        curQNodes.push(node);
      }
    }

    if (curQTitle !== null) {
      questionBlocks.push({ title: curQTitle, sourceLine: curQLine, nodes: curQNodes });
    }

    const questions: Question[] = questionBlocks.map((qb) =>
      parseQuestion(qb.title, qb.sourceLine, qb.nodes, body, lineOffset, filePath, seenQuestionIds)
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
