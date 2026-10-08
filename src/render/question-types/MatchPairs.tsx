import React, { useMemo, useState } from "react";
import { Question } from "../../parse/schema.js";
import {
  Box,
  Text,
  Button,
  ButtonText,
} from "@gluestack-ui/themed";

export interface MatchPairsProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: Record<string, string>, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const MatchPairs: React.FC<MatchPairsProps> = ({
  question,
  savedAnswer,
  onAnswer,
  disabled = false,
}) => {
  const pairs = question.pairs || [];

  // Initialize shuffled list of right-column answers
  const shuffledAnswers = useMemo(() => {
    const answers = pairs.map((p) => p.answer);
    // Deterministic or pseudo-random shuffle
    const shuffled = [...answers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [question.id, pairs]);

  const [matches, setMatches] = useState<Record<string, string>>(() => {
    if (savedAnswer?.userResponse && typeof savedAnswer.userResponse === "object") {
      return savedAnswer.userResponse as Record<string, string>;
    }
    return {};
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(savedAnswer));

  const handleChange = (prompt: string, answer: string) => {
    if (isLocked || disabled) return;
    setMatches((prev) => ({
      ...prev,
      [prompt]: answer,
    }));
  };

  const allSelected = pairs.length > 0 && pairs.every((p) => Boolean(matches[p.prompt]));

  const handleCheck = () => {
    if (isLocked || disabled || !allSelected) return;
    const isCorrect = pairs.every((p) => matches[p.prompt] === p.answer);
    setIsLocked(true);
    onAnswer?.(matches, isCorrect);
  };

  return (
    <Box className="mdq-match-pairs">
      <Box className="mdq-match-list">
        {pairs.map((pair, idx) => {
          const selectedAnswer = matches[pair.prompt] || "";
          const isRowCorrect = isLocked && selectedAnswer === pair.answer;
          const isRowIncorrect = isLocked && selectedAnswer !== pair.answer;

          let rowClass = "";
          if (isRowCorrect) rowClass = "is-correct";
          else if (isRowIncorrect) rowClass = "is-incorrect";

          return (
            <Box key={`${question.id}-${idx}`} className={`mdq-match-row ${rowClass}`}>
              <Text className="mdq-match-prompt">{pair.prompt}</Text>
              <Box style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, maxWidth: "280px" }}>
                <select
                  className="mdq-match-select"
                  value={selectedAnswer}
                  disabled={isLocked || disabled}
                  onChange={(e) => handleChange(pair.prompt, e.target.value)}
                  aria-label={`Match for ${pair.prompt}`}
                >
                  <option value="">Select a match...</option>
                  {shuffledAnswers.map((ans, aIdx) => (
                    <option key={`${ans}-${aIdx}`} value={ans}>
                      {ans}
                    </option>
                  ))}
                </select>
                {isRowIncorrect && (
                  <Text style={{ fontSize: "0.8rem", color: "var(--color-error)" }}>
                    Correct: {pair.answer}
                  </Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {!isLocked && (
        <Button
          variant="solid"
          action="primary"
          className="mdq-btn mdq-btn-primary"
          onClick={handleCheck}
          onPress={handleCheck}
          isDisabled={!allSelected || disabled}
        >
          <ButtonText>Check Matches</ButtonText>
        </Button>
      )}

      {isLocked && question.explanationHtml && (
        <Box className="mdq-explanation">
          <Text className="mdq-explanation-title">Explanation</Text>
          <div
            className="mdq-explanation-body"
            dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
          />
        </Box>
      )}
    </Box>
  );
};

export default MatchPairs;
