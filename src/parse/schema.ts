export type QuestionType =
  | "multi-choice"
  | "multi-select"
  | "true-false"
  | "match-pairs"
  | "short-answer"
  | "reflection"
  | "essay";

export interface ChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MatchPair {
  prompt: string;
  answer: string;
}

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  hint?: string;
  promptHtml?: string;
  explanationHtml?: string;
  sourceLine: number;
  options?: ChoiceOption[];
  pairs?: MatchPair[];
  canonicalAnswer?: string;
  fuzzyTolerance?: number;
  rubric?: string[];
  modelAnswerHtml?: string;
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export interface Frontmatter {
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface QuizModel {
  title: string;
  description?: string;
  frontmatter: Frontmatter;
  sections: Section[];
  contentHash: string;
  totalQuestions: number;
}
