import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import {
  Box,
  Text,
  Button,
  ButtonText,
  Pressable,
  HStack,
  Card,
  Heading,
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
      <Box mb="$5" className="mdq-options-list" role="radiogroup" aria-label={question.title}>
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          let borderColor = isSelected ? "$primary500" : "$borderLight200";
          let bgColor = isSelected ? "$primary100" : "$backgroundLight0";

          if (isLocked) {
            if (opt.isCorrect) {
              borderColor = "$primary500";
              bgColor = "$primary100";
            } else if (isSelected && !opt.isCorrect) {
              borderColor = "$borderDark700";
              bgColor = "$backgroundLight100";
            }
          }

          return (
            <Pressable
              key={opt.id}
              p="$4"
              mb="$3"
              borderWidth={1}
              borderRadius="$xl"
              borderColor={borderColor}
              bg={bgColor}
              disabled={isLocked || disabled}
              onPress={() => handleSelect(opt.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <HStack space="md" alignItems="center">
                <input
                  type="radio"
                  name={`mc-${question.id}`}
                  value={opt.id}
                  checked={isSelected}
                  disabled={isLocked || disabled}
                  onChange={() => handleSelect(opt.id)}
                  style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer" }}
                />
                <Text fontWeight={isSelected ? "600" : "400"}>{opt.text}</Text>
              </HStack>
            </Pressable>
          );
        })}
      </Box>

      {!isLocked && (
        <Button
          mt="$2"
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
        <Card variant="outline" mt="$5" p="$5">
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

export default MultiChoice;
