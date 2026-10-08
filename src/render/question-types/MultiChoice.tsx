import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import {
  Box,
  Text,
  Button,
  ButtonText,
} from "@gluestack-ui/themed";

export interface MultiChoiceProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const MultiChoice: React.FC<MultiChoiceProps> = ({
  question,
  savedAnswer,
  onAnswer,
  disabled = false,
}) => {
  const [selectedId, setSelectedId] = useState<string>(() => {
    return typeof savedAnswer?.userResponse === "string" ? savedAnswer.userResponse : "";
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(savedAnswer));

  const options = question.options || [];

  const handleSelect = (id: string) => {
    if (isLocked || disabled) return;
    setSelectedId(id);
  };

  const handleCheck = () => {
    if (isLocked || disabled || !selectedId) return;
    const selectedOption = options.find((opt) => opt.id === selectedId);
    const isCorrect = selectedOption?.isCorrect === true;
    setIsLocked(true);
    onAnswer?.(selectedId, isCorrect);
  };

  return (
    <Box className="mdq-multi-choice">
      <Box className="mdq-options-list" role="radiogroup" aria-label={question.title}>
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          let statusClass = "";

          if (isLocked) {
            if (opt.isCorrect) {
              statusClass = "is-correct";
            } else if (isSelected && !opt.isCorrect) {
              statusClass = "is-incorrect";
            }
          }

          return (
            <label
              key={opt.id}
              className={`mdq-option-label ${isSelected ? "selected" : ""} ${statusClass} ${isLocked ? "locked" : ""}`}
              onClick={() => handleSelect(opt.id)}
            >
              <input
                type="radio"
                name={`mc-${question.id}`}
                value={opt.id}
                checked={isSelected}
                disabled={isLocked || disabled}
                onChange={() => handleSelect(opt.id)}
              />
              <Text className="mdq-option-text">{opt.text}</Text>
            </label>
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
          isDisabled={!selectedId || disabled}
        >
          <ButtonText>Check Answer</ButtonText>
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

export default MultiChoice;
