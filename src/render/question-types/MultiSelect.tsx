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

export interface MultiSelectProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: string[], isCorrect: boolean) => void;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  question,
  savedAnswer,
  onAnswer,
  disabled = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return Array.isArray(savedAnswer?.userResponse) ? (savedAnswer.userResponse as string[]) : [];
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(savedAnswer));

  const options = question.options || [];

  const handleToggle = (id: string) => {
    if (isLocked || disabled) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCheck = () => {
    if (isLocked || disabled || selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    // All-or-nothing: every option marked correct must be selected, and no incorrect option may be selected
    const isCorrect = options.every((opt) =>
      opt.isCorrect ? selectedSet.has(opt.id) : !selectedSet.has(opt.id)
    );
    setIsLocked(true);
    onAnswer?.(selectedIds, isCorrect);
  };

  return (
    <Box className="mdq-multi-select">
      <Box mb="$5" className="mdq-options-list" role="group" aria-label={question.title}>
        {options.map((opt) => {
          const isSelected = selectedIds.includes(opt.id);
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
              onPress={() => handleToggle(opt.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <HStack space="md" alignItems="center">
                <input
                  type="checkbox"
                  name={`ms-${question.id}-${opt.id}`}
                  value={opt.id}
                  checked={isSelected}
                  disabled={isLocked || disabled}
                  onChange={() => handleToggle(opt.id)}
                  onClick={(e) => e.stopPropagation()}
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
          isDisabled={selectedIds.length === 0 || disabled}
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

export default MultiSelect;
