import React, { useState, useMemo, useEffect } from "react";
import { Question } from "../../parse/schema.js";
import { highlightMatchedWords, matchConcepts } from "../nlp/conceptMatcher.js";
import { MarkdownView } from "../MarkdownView.js";
import {
  Textarea,
  TextareaInput,
  Button,
  ButtonText,
  Box,
  Text,
  Heading,
  Card,
  Badge,
  BadgeText,
  VStack,
  HStack,
  Checkbox,
  CheckboxIndicator,
  CheckboxLabel,
} from "@gluestack-ui/themed";

export interface EssayProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: unknown, isCorrect: boolean) => void;
  disabled?: boolean;
}

function parseInitialResponse(userResponse: unknown): {
  essayText: string;
  checkedRubric?: boolean[];
  score?: number;
} {
  if (typeof userResponse === "string") {
    return { essayText: userResponse };
  }
  if (typeof userResponse === "object" && userResponse !== null) {
    const obj = userResponse as Record<string, unknown>;
    const essayText = typeof obj.essayText === "string" ? obj.essayText : "";
    const checkedRubric = Array.isArray(obj.checkedRubric)
      ? (obj.checkedRubric as boolean[])
      : undefined;
    const score = typeof obj.score === "number" ? obj.score : undefined;
    return { essayText, checkedRubric, score };
  }
  return { essayText: "" };
}

export const Essay: React.FC<EssayProps> = ({
  question,
  savedAnswer,
  onAnswer,
  disabled = false,
}) => {
  const rubric = useMemo(() => question.rubric || [], [question.rubric]);

  const initialData = useMemo(
    () => parseInitialResponse(savedAnswer?.userResponse),
    [savedAnswer?.userResponse]
  );

  const [text, setText] = useState<string>(() => initialData.essayText);
  const [isReviewing, setIsReviewing] = useState<boolean>(() => {
    return Boolean(savedAnswer && initialData.essayText.trim().length > 0);
  });

  const [checkedRubric, setCheckedRubric] = useState<boolean[]>(() => {
    if (initialData.checkedRubric && initialData.checkedRubric.length === rubric.length) {
      return initialData.checkedRubric;
    }
    if (initialData.essayText.trim().length > 0 && rubric.length > 0) {
      const match = matchConcepts(initialData.essayText, rubric);
      return match.matchedCriteria;
    }
    return new Array(rubric.length).fill(false);
  });

  useEffect(() => {
    if (!savedAnswer) {
      setText("");
      setCheckedRubric(new Array(rubric.length).fill(false));
      setIsReviewing(false);
    }
  }, [savedAnswer, rubric.length]);

  const conceptMatch = useMemo(() => {
    return matchConcepts(text, rubric);
  }, [text, rubric]);

  const submissionSegments = useMemo(() => {
    return highlightMatchedWords(text, conceptMatch.matchedWords);
  }, [text, conceptMatch.matchedWords]);

  const handleCheckAndReview = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    const match = matchConcepts(trimmed, rubric);
    const initialChecked = [...match.matchedCriteria];
    setCheckedRubric(initialChecked);
    setIsReviewing(true);

    const checkedCount = initialChecked.filter(Boolean).length;
    const totalCriteria = rubric.length;
    const score = totalCriteria > 0 ? Math.round((checkedCount / totalCriteria) * 100) : 100;
    onAnswer?.({ essayText: text, score, checkedRubric: initialChecked }, score >= 70);
  };

  const handleToggleCriterion = (index: number) => {
    if (disabled) return;
    const nextChecked = [...checkedRubric];
    nextChecked[index] = !nextChecked[index];
    setCheckedRubric(nextChecked);

    const checkedCount = nextChecked.filter(Boolean).length;
    const totalCriteria = rubric.length;
    const score = totalCriteria > 0 ? Math.round((checkedCount / totalCriteria) * 100) : 100;
    onAnswer?.({ essayText: text, score, checkedRubric: nextChecked }, score >= 70);
  };

  const handleEditEssay = () => {
    if (disabled) return;
    setIsReviewing(false);
  };

  const trimmedText = text.trim();
  const wordCount = trimmedText.length === 0 ? 0 : trimmedText.split(/\s+/).length;
  const charCount = text.length;

  const checkedCount = checkedRubric.filter(Boolean).length;
  const totalCriteria = rubric.length;
  const score = totalCriteria > 0 ? Math.round((checkedCount / totalCriteria) * 100) : 100;

  return (
    <Box>
      {!isReviewing ? (
        <Box>
          <Box>
            <Textarea mb="$3" size="md" isDisabled={disabled}>
              <TextareaInput
                placeholder="Write your essay response here..."
                value={text}
                disabled={disabled}
                onChange={(e: any) => setText(e.target?.value ?? e)}
                onChangeText={(val: string) => setText(val)}
                rows={8}
              />
            </Textarea>
          </Box>

          <HStack mt="$3" mb="$5" justifyContent="space-between" alignItems="center" flexWrap="wrap" space="md">
            <Text size="sm" color="$textLight500" $dark-color="$textDark400">
              {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} {charCount === 1 ? "character" : "characters"}
            </Text>

            <Button
              size="md"
              variant="solid"
              action="primary"
              onClick={handleCheckAndReview}
              onPress={handleCheckAndReview}
              isDisabled={!text.trim() || disabled}
            >
              <ButtonText>Check & Review</ButtonText>
            </Button>
          </HStack>
        </Box>
      ) : (
        <Box>
          <HStack mb="$3" justifyContent="space-between" alignItems="center">
            <Badge variant="solid" action="primary" p="$1">
              <BadgeText>Concept Coverage: {conceptMatch.coveragePercent}%</BadgeText>
            </Badge>
            <Button
              size="sm"
              variant="outline"
              action="secondary"
              onClick={handleEditEssay}
              onPress={handleEditEssay}
              isDisabled={disabled}
            >
              <ButtonText>Edit Essay</ButtonText>
            </Button>
          </HStack>

          <VStack space="md" mb="$4">
            <Card variant="outline" p="$5" borderRadius="$xl">
              <Heading size="sm" mb="$2">YOUR SUBMISSION</Heading>
              <Box>
                {submissionSegments.map((segment, idx) =>
                  segment.isMatched ? (
                    <mark key={idx}>
                      {segment.text}
                    </mark>
                  ) : (
                    <React.Fragment key={idx}>{segment.text}</React.Fragment>
                  )
                )}
              </Box>
            </Card>

            {question.modelAnswerHtml && (
              <Card variant="outline" p="$5" borderRadius="$xl">
                <Heading size="sm" mb="$2">MODEL ANSWER</Heading>
                <MarkdownView html={question.modelAnswerHtml} />
              </Card>
            )}
          </VStack>

          <Card variant="outline" p="$5" mb="$4" borderRadius="$xl">
            <HStack mb="$3" justifyContent="space-between" alignItems="center">
              <Heading size="sm">Rubric Evaluation</Heading>
              <Text fontWeight="$semibold" size="sm" color="$primary600" $dark-color="$dmAccent">
                Score: {checkedCount} / {totalCriteria} criteria met ({score}%)
              </Text>
            </HStack>

            {rubric.length > 0 ? (
              <VStack space="md">
                {rubric.map((criterion, idx) => (
                  <Checkbox
                    key={idx}
                    value={`criterion-${idx}`}
                    size="md"
                    isChecked={Boolean(checkedRubric[idx])}
                    onChange={() => handleToggleCriterion(idx)}
                    isDisabled={disabled}
                    py="$3"
                    px="$4"
                  >
                    <CheckboxIndicator mr="$3" />
                    <CheckboxLabel size="sm">
                      {criterion}
                    </CheckboxLabel>
                  </Checkbox>
                ))}
              </VStack>
            ) : (
              <Text size="sm" color="$textLight500" $dark-color="$textDark400">
                No rubric criteria specified.
              </Text>
            )}
          </Card>

          <HStack mt="$4" mb="$3">
            <Button
              size="md"
              variant="outline"
              action="secondary"
              onClick={handleEditEssay}
              onPress={handleEditEssay}
              isDisabled={disabled}
            >
              <ButtonText>Edit Essay</ButtonText>
            </Button>
          </HStack>

          {question.explanationHtml && (
            <Card variant="outline" mt="$5" p="$5">
              <Heading size="sm" mb="$2">Notes & Key Takeaways</Heading>
              <MarkdownView html={question.explanationHtml} />
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Essay;
