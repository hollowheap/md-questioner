export const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "its",
  "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
  "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "she", "should", "shouldn't",
  "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were",
  "weren't", "what", "when", "where", "which", "while", "who", "whom", "why",
  "with", "won't", "would", "wouldn't", "you", "your", "yours", "yourself",
  "yourselves",
  "mentions", "mention", "mentioned", "explains", "explain", "explained",
  "notes", "note", "noted", "describes", "describe", "described",
  "discusses", "discuss", "discussed", "identifies", "identify", "identified",
  "states", "state", "stated", "provides", "provide", "provided",
  "criterion", "rubric", "must", "should", "either", "also", "item"
]);

export function stemWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;

  if (w.endsWith("ation")) {
    w = w.slice(0, -5);
  } else if (w.endsWith("ization") || w.endsWith("isation")) {
    w = w.slice(0, -7);
  } else if (w.endsWith("tion") || w.endsWith("sion")) {
    w = w.slice(0, -4);
  } else if (w.endsWith("ment")) {
    w = w.slice(0, -4);
  } else if (w.endsWith("ness")) {
    w = w.slice(0, -4);
  } else if (w.endsWith("able") || w.endsWith("ible")) {
    w = w.slice(0, -4);
  } else if (w.endsWith("ized") || w.endsWith("ised")) {
    w = w.slice(0, -4);
  } else if (w.endsWith("ies") && w.length > 4) {
    w = w.slice(0, -3) + "y";
  } else if (w.endsWith("ing") && w.length > 5) {
    w = w.slice(0, -3);
  } else if (w.endsWith("ed") && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith("ly") && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith("es") && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith("er") && w.length > 5) {
    w = w.slice(0, -2);
  } else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) {
    w = w.slice(0, -1);
  }

  if (w.length > 3 && w[w.length - 1] === w[w.length - 2] && !["s", "l", "e"].includes(w[w.length - 1])) {
    w = w.slice(0, -1);
  }

  return w;
}

export function extractKeywords(text: string): { original: string; stem: string }[] {
  const words = text.toLowerCase().match(/[a-z0-9]+(?:[-_][a-z0-9]+)*/g) || [];
  const results: { original: string; stem: string }[] = [];
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    if (w.length < 2) continue;
    if (w.length === 2 && !["io", "db", "os", "ip", "ui", "ai", "ml"].includes(w)) continue;
    results.push({
      original: w,
      stem: stemWord(w),
    });
  }
  return results;
}

export interface ConceptMatchResult {
  coveragePercent: number;
  matchedCriteria: boolean[];
  matchedWords: string[];
}

export function matchConcepts(userText: string, rubricItems: string[]): ConceptMatchResult {
  if (!rubricItems || rubricItems.length === 0) {
    return {
      coveragePercent: 0,
      matchedCriteria: [],
      matchedWords: [],
    };
  }

  const userKeywords = extractKeywords(userText);
  const userStems = new Set(userKeywords.map((k) => k.stem));
  const userWordMap = new Map<string, string>();
  for (const k of userKeywords) {
    if (!userWordMap.has(k.stem)) {
      userWordMap.set(k.stem, k.original);
    }
  }

  const matchedCriteria: boolean[] = [];
  const matchedWordsSet = new Set<string>();

  for (const item of rubricItems) {
    const itemKeywords = extractKeywords(item);
    if (itemKeywords.length === 0) {
      matchedCriteria.push(false);
      continue;
    }

    const uniqueStems = Array.from(new Set(itemKeywords.map((k) => k.stem)));
    let matchCount = 0;

    for (const stem of uniqueStems) {
      if (userStems.has(stem)) {
        matchCount++;
        const originalUserWord = userWordMap.get(stem);
        if (originalUserWord) {
          matchedWordsSet.add(originalUserWord);
        }
      }
    }

    const isMatched =
      uniqueStems.length <= 2
        ? matchCount >= 1
        : matchCount >= Math.min(2, Math.ceil(uniqueStems.length * 0.4));

    matchedCriteria.push(isMatched);
  }

  const matchedCriteriaCount = matchedCriteria.filter(Boolean).length;
  const coveragePercent = Math.round((matchedCriteriaCount / rubricItems.length) * 100);

  return {
    coveragePercent,
    matchedCriteria,
    matchedWords: Array.from(matchedWordsSet),
  };
}

export interface TextSegment {
  text: string;
  isMatched: boolean;
}

export function highlightMatchedWords(
  text: string,
  matchedWords: string[]
): TextSegment[] {
  if (!text) return [];
  if (!matchedWords || matchedWords.length === 0) {
    return [{ text, isMatched: false }];
  }

  const matchedStems = new Set(matchedWords.map((w) => stemWord(w.toLowerCase())));
  const matchedWordSet = new Set(matchedWords.map((w) => w.toLowerCase()));

  const regex = /([a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*)/g;
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, startIndex),
        isMatched: false,
      });
    }

    const lower = word.toLowerCase();
    const isMatched =
      !STOP_WORDS.has(lower) &&
      (matchedWordSet.has(lower) || matchedStems.has(stemWord(lower)));

    segments.push({
      text: word,
      isMatched,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isMatched: false,
    });
  }

  return segments;
}

export function highlightMatchedWordsHtml(
  text: string,
  matchedWords: string[]
): string {
  const segments = highlightMatchedWords(text, matchedWords);
  return segments
    .map((seg) => {
      const escaped = seg.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return seg.isMatched
        ? `<mark class="mdq-essay-match">${escaped}</mark>`
        : escaped;
    })
    .join("");
}
