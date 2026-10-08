import React, { useMemo, useState } from "react";
import { Question } from "../../parse/schema.js";
import {
  Box,
  Text,
  Button,
  ButtonText,
  Card,
  Heading,
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
        {pairs.map((pair) => {
          const selectedAnswer = matches[pair.prompt] || "";
          const isRowIncorrect = isLocked && selectedAnswer !== pair.answer;

          return (
            <Card key={pair.prompt} variant="outline" p="$3" mb="$2">
              <Box style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <Text style={{ flex: 1 }}>{pair.prompt}</Text>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, maxWidth: "280px" }}>
                  <select
                    value={selectedAnswer}
                    disabled={isLocked || disabled}
                    onChange={(e) => handleChange(pair.prompt, e.target.value)}
                    style={{
                      flex: 1,
                      maxWidth: "280px",
                      minHeight: "40px",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: "0.95rem"
                    }}
                  >
                    <option value="" disabled>Select match...</option>
                    {shuffledAnswers.map((ans, aIdx) => (
                      <option key={`${ans}-${aIdx}`} value={ans}>{ans}</option>
                    ))}
                  </select>
                  {isRowIncorrect && (
                    <Text style={{ fontSize: "0.8rem", color: "var(--color-error)" }}>
                      Correct: {pair.answer}
                    </Text>
                  )}
                </div>
              </Box>
            </Card>
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
        <Card variant="outline" mt="$4" p="$4">
          <Heading size="sm" mb="$2">Explanation</Heading>
          <div
            className="mdq-explanation-body"
            dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
          />
        </Card>
      )}
    </Box>
  );
};

export default MatchPairs;
