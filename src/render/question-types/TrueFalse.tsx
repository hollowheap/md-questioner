import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import {
  Box,
  Text,
  Button,
  ButtonText,
  HStack,
} from "@gluestack-ui/themed";

export interface TrueFalseProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const TrueFalse: React.FC<TrueFalseProps> = ({
  question,
  savedAnswer,
  onAnswer,
  disabled = false,
}) => {
  const options = question.options || [
    { id: "opt-true", text: "True", isCorrect: true },
    { id: "opt-false", text: "False", isCorrect: false },
  ];

  const trueOption = options.find((o) => o.text.trim().toLowerCase() === "true") || options[0];
  const falseOption = options.find((o) => o.text.trim().toLowerCase() === "false") || options[1];

  const [selectedId, setSelectedId] = useState<string>(() => {
    return typeof savedAnswer?.userResponse === "string" ? savedAnswer.userResponse : "";
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(savedAnswer));

  const handleSelect = (id: string) => {
    if (isLocked || disabled) return;
    setSelectedId(id);
  };

  const handleCheck = () => {
    if (isLocked || disabled || !selectedId) return;
    const chosen = options.find((o) => o.id === selectedId);
    const isCorrect = chosen?.isCorrect === true;
    setIsLocked(true);
    onAnswer?.(selectedId, isCorrect);
  };

  const renderButton = (opt: typeof trueOption, label: string) => {
    if (!opt) return null;
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
      <Button
        key={opt.id}
        variant={isSelected ? "solid" : "outline"}
        action={isSelected ? "primary" : "secondary"}
        className={`mdq-tf-btn ${isSelected ? "selected" : ""} ${statusClass}`}
        isDisabled={isLocked || disabled}
        onClick={() => handleSelect(opt.id)}
        onPress={() => handleSelect(opt.id)}
      >
        <ButtonText style={{ color: "inherit" }}>{label}</ButtonText>
      </Button>
    );
  };

  return (
    <Box className="mdq-true-false">
      <HStack className="mdq-tf-group">
        {renderButton(trueOption, "True")}
        {renderButton(falseOption, "False")}
      </HStack>

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

export default TrueFalse;
