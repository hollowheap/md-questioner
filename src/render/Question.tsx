import React from "react";
import { Box, Heading, Text } from "@gluestack-ui/themed";
import { Question as QuestionData } from "../parse/schema.js";
import { Hint } from "./Hint.js";
import { MarkdownView } from "./MarkdownView.js";
import { MultiChoice } from "./question-types/MultiChoice.js";
import { MultiSelect } from "./question-types/MultiSelect.js";
import { TrueFalse } from "./question-types/TrueFalse.js";
import { MatchPairs } from "./question-types/MatchPairs.js";
import { ShortAnswer } from "./question-types/ShortAnswer.js";
import { Reflection } from "./question-types/Reflection.js";
import { Essay } from "./question-types/Essay.js";
import type { KeyboardSelection } from "./shortcuts.js";

export interface QuestionProps {
  question: QuestionData;
  sectionTitle?: string;
  questionIndex?: number;
  totalInSection?: number;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  /** Digit shortcut resolved to an option index for the active question. */
  keyboardSelection?: KeyboardSelection | null;
  onAnswer?: (response: unknown, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const Question: React.FC<QuestionProps> = ({
  question,
  sectionTitle,
  questionIndex = 0,
  totalInSection = 1,
  savedAnswer,
  keyboardSelection,
  onAnswer,
  disabled = false,
}) => {
  const handleAnswer = (response: unknown, isCorrect: boolean) => {
    onAnswer?.(response, isCorrect);
  };

  const renderQuestionBody = () => {
    switch (question.type) {
      case "multi-choice":
        return (
          <MultiChoice
            question={question}
            savedAnswer={savedAnswer}
            keyboardSelection={keyboardSelection}
            onAnswer={handleAnswer}
          />
        );
      case "multi-select":
        return (
          <MultiSelect
            question={question}
            savedAnswer={savedAnswer}
            keyboardSelection={keyboardSelection}
            onAnswer={handleAnswer}
          />
        );
      case "true-false":
        return (
          <TrueFalse
            question={question}
            savedAnswer={savedAnswer}
            keyboardSelection={keyboardSelection}
            onAnswer={handleAnswer}
          />
        );
      case "match-pairs":
        return (
          <MatchPairs
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
      case "short-answer":
        return (
          <ShortAnswer
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
      case "essay":
        return (
          <Essay
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={(resp, ok) => handleAnswer(resp, ok)}
            disabled={disabled}
          />
        );
      case "reflection":
      default:
        return (
          <Reflection
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
    }
  };

  return (
    <Box
      mb="$8"
      borderRadius="$md"
      bg="$backgroundLight0"
      $dark-bg="$backgroundDark900"
    >
      <Box mb="$4">
        <Text size="sm" color="$textLight500" $dark-color="$textDark400">
          {sectionTitle ? `${sectionTitle} • ` : ""}Question {questionIndex + 1} of {totalInSection}
        </Text>
      </Box>

      <Heading size="md" mb="$5">{question.title}</Heading>

      {question.promptHtml && (
        <Box mb="$6">
          <MarkdownView html={question.promptHtml} />
        </Box>
      )}

      {question.hint && (
        <Box mb="$5">
          <Hint hint={question.hint} />
        </Box>
      )}

      <Box mt="$5">
        {renderQuestionBody()}
      </Box>
    </Box>
  );
};

export default Question;
