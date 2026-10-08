import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import { MarkdownView } from "../MarkdownView.js";
import {
  Input,
  InputField,
  Button,
  ButtonText,
  Box,
  Text,
  Card,
  Heading,
} from "@gluestack-ui/themed";

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

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isCorrect = savedAnswer ? savedAnswer.isCorrect : false;

  return (
    <Box>
      <Box>
        <Input
          mb="$8"
          variant="outline"
          size="md"
          isInvalid={isLocked && !isCorrect}
          isDisabled={isLocked || disabled}
        >
          <InputField
            type="text"
            placeholder="Type your answer here..."
            value={value}
            disabled={isLocked || disabled}
            onChange={(e: any) => setValue(e.target?.value ?? e)}
            onChangeText={(text: string) => setValue(text)}
            onKeyDown={handleKeyDown}
          />
        </Input>
        {isLocked && !isCorrect && canonical && (
          <Text size="sm" color="$error500" $dark-color="$error400" mb="$6">
            Expected: {canonical}
          </Text>
        )}
      </Box>

      {!isLocked && (
        <Button
          size="md"
          variant="solid"
          action="primary"
          onClick={handleSubmit}
          onPress={handleSubmit}
          isDisabled={!value.trim() || disabled}
        >
          <ButtonText>Check Answer</ButtonText>
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

export default ShortAnswer;
