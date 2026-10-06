import React, { useState } from "react";
import { Question } from "../../parse/schema.js";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export interface ShortAnswerProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const ShortAnswer: React.FC<ShortAnswerProps> = ({
  question,
  savedAnswer,
  onAnswer,
  disabled = false,
}) => {
  const [value, setValue] = useState<string>(() => {
    return typeof savedAnswer?.userResponse === "string" ? savedAnswer.userResponse : "";
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(savedAnswer));

  const canonical = question.canonicalAnswer || "";
  const tolerance = question.fuzzyTolerance ?? 1;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLocked || disabled) return;

    const normalizedInput = trimmed.toLowerCase();
    const normalizedTarget = canonical.trim().toLowerCase();
    const dist = levenshtein(normalizedInput, normalizedTarget);
    const isCorrect = dist <= tolerance;

    setIsLocked(true);
    onAnswer?.(trimmed, isCorrect);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isCorrect = savedAnswer ? savedAnswer.isCorrect : false;

  return (
    <div className="mdq-short-answer">
      <div className="mdq-short-answer-group">
        <input
          type="text"
          className={`mdq-short-input ${isLocked ? (isCorrect ? "is-correct" : "is-incorrect") : ""}`}
          placeholder="Type your answer here..."
          value={value}
          disabled={isLocked || disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isLocked && !isCorrect && canonical && (
          <div style={{ fontSize: "0.9rem", color: "var(--color-error)", marginTop: "0.25rem" }}>
            Expected: <strong>{canonical}</strong>
          </div>
        )}
      </div>

      {!isLocked && (
        <button
          type="button"
          className="mdq-btn mdq-btn-primary"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
        >
          Check Answer
        </button>
      )}

      {isLocked && question.explanationHtml && (
        <div className="mdq-explanation">
          <div className="mdq-explanation-title">Explanation</div>
          <div
            className="mdq-explanation-body"
            dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
          />
        </div>
      )}
    </div>
  );
};

export default ShortAnswer;
