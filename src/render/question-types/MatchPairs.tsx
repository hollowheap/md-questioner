import React, { useMemo, useState } from "react";
import { Question } from "../../parse/schema.js";
import { MarkdownView } from "../MarkdownView.js";
import {
  HStack,
  VStack,
  Card,
  Button,
  ButtonText,
  Heading,
  Box,
  Text,
} from "@gluestack-ui/themed";
import { Select } from "../Select.js";

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
            <Card key={pair.prompt} variant="outline" p="$5" mb="$4" borderRadius="$2xl">
              <HStack justifyContent="space-between" alignItems="center" space="md">
                <Text flex={1} fontWeight="$medium">{pair.prompt}</Text>
                <Box flex={1} style={{ maxWidth: 280 }}>
                  <Select
                    value={selectedAnswer}
                    options={shuffledAnswers.map((answer) => ({
                      label: answer,
                      value: answer,
                    }))}
                    onChange={(val) => handleChange(pair.prompt, val)}
                    placeholder="Select match..."
                    disabled={isLocked || disabled}
                    label={`Match for ${pair.prompt}`}
                  />
                  {isRowIncorrect && (
                    <Text size="sm" color="$error500" mt="$1">
                      Correct: {pair.answer}
                    </Text>
                  )}
                </Box>
              </HStack>
            </Card>
          );
        })}
      </Box>

      {!isLocked && (
        <Button
          // Remount on a disabled-state change: Gluestack keeps the disabled
          // opacity (0.4) once a button has been disabled.
          key={!allSelected || disabled ? "disabled" : "enabled"}
          size="md"
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
          <MarkdownView html={question.explanationHtml} />
        </Card>
      )}
    </Box>
  );
};

export default MatchPairs;
