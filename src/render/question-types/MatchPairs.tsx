import React, { useMemo, useState } from "react";
import { Question } from "../../parse/schema.js";
import {
  Box,
  Text,
  Button,
  ButtonText,
  Card,
  Heading,
  HStack,
  VStack,
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
    <Box>
      <Box mb="$5">
        {pairs.map((pair) => {
          const selectedAnswer = matches[pair.prompt] || "";
          const isRowIncorrect = isLocked && selectedAnswer !== pair.answer;

          return (
            <Card key={pair.prompt} variant="outline" p="$4" mb="$3" borderRadius="$xl">
              <HStack justifyContent="space-between" alignItems="center" space="md">
                <Text flex={1}>{pair.prompt}</Text>
                <VStack space="xs" flex={1} maxW={280}>
                  <select
                    value={selectedAnswer}
                    disabled={isLocked || disabled}
                    onChange={(e) => handleChange(pair.prompt, e.target.value)}
                    style={{
                      width: "100%",
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
                    <Text size="xs" color="$error500" $dark-color="$error400">
                      Correct: {pair.answer}
                    </Text>
                  )}
                </VStack>
              </HStack>
            </Card>
          );
        })}
      </Box>

      {!isLocked && (
        <Button
          mt="$2"
          variant="solid"
          action="primary"
          onClick={handleCheck}
          onPress={handleCheck}
          isDisabled={!allSelected || disabled}
        >
          <ButtonText>Check Matches</ButtonText>
        </Button>
      )}

      {isLocked && question.explanationHtml && (
        <Card variant="outline" mt="$5" p="$5">
          <Heading size="sm" mb="$2">Explanation</Heading>
          <Box
            dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
          />
        </Card>
      )}
    </Box>
  );
};

export default MatchPairs;
