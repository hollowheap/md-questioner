import React, { useState, useMemo, useEffect } from "react";
import { Question } from "../../parse/schema.js";
import { highlightMatchedWords, matchConcepts } from "../nlp/conceptMatcher.js";
import {
  Textarea,
  TextareaInput,
  Button,
  ButtonText,
  Box,
  Text,
  Heading,
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
    <Box className="mdq-essay">
      {!isReviewing ? (
        <Box className="mdq-essay-draft">
          <Box className="mdq-essay-textarea-wrap">
            <Textarea size="md" className="mdq-essay-textarea" isDisabled={disabled}>
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

          <Box className="mdq-essay-draft-footer">
            <Box className="mdq-essay-counts">
              <Text style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} {charCount === 1 ? "character" : "characters"}
              </Text>
            </Box>

            <Button
              variant="solid"
              action="primary"
              className="mdq-btn mdq-btn-primary"
              onClick={handleCheckAndReview}
              onPress={handleCheckAndReview}
              isDisabled={!text.trim() || disabled}
            >
              <ButtonText>Check & Review</ButtonText>
            </Button>
          </Box>
        </Box>
      ) : (
        <Box className="mdq-essay-review">
          <Box className="mdq-essay-review-header">
            <Box className="mdq-badge mdq-essay-badge">
              <Text style={{ fontSize: "0.85rem", fontWeight: "600", color: "inherit" }}>
                Concept Coverage: {conceptMatch.coveragePercent}%
              </Text>
            </Box>
            <Button
              variant="outline"
              action="secondary"
              className="mdq-btn mdq-btn-secondary"
              onClick={handleEditEssay}
              onPress={handleEditEssay}
              isDisabled={disabled}
            >
              <ButtonText style={{ color: "inherit" }}>Edit Essay</ButtonText>
            </Button>
          </Box>

          <Box className="mdq-essay-panels">
            <Box className="mdq-essay-panel">
              <Text className="mdq-essay-panel-title">Your Submission</Text>
              <Box className="mdq-essay-submission-text">
                {submissionSegments.map((segment, idx) =>
                  segment.isMatched ? (
                    <mark key={idx} className="mdq-essay-match">
                      {segment.text}
                    </mark>
                  ) : (
                    <React.Fragment key={idx}>{segment.text}</React.Fragment>
                  )
                )}
              </Box>
            </Box>

            {question.modelAnswerHtml && (
              <Box className="mdq-essay-panel">
                <Text className="mdq-essay-panel-title">Model Answer</Text>
                <div
                  className="mdq-essay-panel-body"
                  dangerouslySetInnerHTML={{ __html: question.modelAnswerHtml }}
                />
              </Box>
            )}
          </Box>

          <Box className="mdq-rubric-card">
            <Box className="mdq-rubric-header">
              <Heading className="mdq-rubric-title">Rubric Evaluation</Heading>
              <Text className="mdq-rubric-score">
                Score: {checkedCount} / {totalCriteria} criteria met ({score}%)
              </Text>
            </Box>

            {rubric.length > 0 ? (
              <ul className="mdq-rubric-list">
                {rubric.map((criterion, idx) => (
                  <li key={idx} className="mdq-rubric-item">
                    <label className="mdq-rubric-label">
                      <input
                        type="checkbox"
                        className="mdq-rubric-checkbox"
                        checked={Boolean(checkedRubric[idx])}
                        disabled={disabled}
                        onChange={() => handleToggleCriterion(idx)}
                      />
                      <Text className="mdq-rubric-text">{criterion}</Text>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <Text style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.9rem" }}>
                No rubric criteria specified.
              </Text>
            )}
          </Box>

          <Box className="mdq-essay-actions">
            <Button
              className="mdq-btn mdq-btn-secondary"
              onClick={handleEditEssay}
              onPress={handleEditEssay}
              isDisabled={disabled}
            >
              <ButtonText style={{ color: "inherit" }}>Edit Essay</ButtonText>
            </Button>
          </Box>

          {question.explanationHtml && (
            <Box className="mdq-explanation">
              <Text className="mdq-explanation-title">Notes & Key Takeaways</Text>
              <div
                className="mdq-explanation-body"
                dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Essay;
