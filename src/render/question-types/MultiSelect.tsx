import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import { MarkdownView } from "../MarkdownView.js";
import {
  CheckboxGroup,
  Checkbox,
  CheckboxIndicator,
  CheckboxLabel,
  Card,
  Button,
  ButtonText,
  Heading,
  Box,
  VStack,
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

  const handleToggle = (id: string, nextState?: boolean) => {
    if (isLocked || disabled) return;
    const shouldSelect = typeof nextState === "boolean" ? nextState : !selectedIds.includes(id);
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (shouldSelect && !exists) return [...prev, id];
      if (!shouldSelect && exists) return prev.filter((item) => item !== id);
      return prev;
    });
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
    <Box>
      <CheckboxGroup value={selectedIds} onChange={setSelectedIds} isDisabled={isLocked || disabled} mb="$8">
        <VStack space="md">
          {options.map((opt) => {
            const isSelected = selectedIds.includes(opt.id);
            let borderColor = isSelected ? "$primary500" : "$borderLight200";
            let darkBorderColor = isSelected ? "$primary400" : "$borderDark700";
            let bgColor = isSelected ? "$primary100" : "$backgroundLight0";
            let darkBgColor = isSelected ? "$dmAccentSoft" : "$backgroundDark900";

            if (isLocked) {
              if (opt.isCorrect) {
                borderColor = "$success500";
                darkBorderColor = "$dmAccent";
                bgColor = "$primary100";
                darkBgColor = "$dmAccentSoft";
              } else if (isSelected && !opt.isCorrect) {
                borderColor = "$error500";
                darkBorderColor = "$error400";
                bgColor = "$backgroundLight100";
                darkBgColor = "$backgroundDark800";
              }
            }

            return (
              <Checkbox
                key={opt.id}
                value={opt.id}
                size="md"
                isChecked={isSelected}
                onChange={() => handleToggle(opt.id)}
                isDisabled={isLocked || disabled}
                w="100%"
                px="$6"
                py="$4"
                minHeight={62}
                borderRadius="$md"
                borderWidth={1}
                borderColor={borderColor}
                $dark-borderColor={darkBorderColor}
                bg={bgColor}
                $dark-bg={darkBgColor}
                justifyContent="flex-start"
                alignItems="center"
              >
                <CheckboxIndicator mr="$3" />
                <CheckboxLabel
                  flex={1}
                  fontWeight={isSelected ? "$semibold" : "$normal"}
                  size="md"
                >
                  {opt.text}
                </CheckboxLabel>
              </Checkbox>
            );
          })}
        </VStack>
      </CheckboxGroup>

      {!isLocked && (
        <Button
          size="md"
          variant="solid"
          action="primary"
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
          <MarkdownView html={question.explanationHtml} />
        </Card>
      )}
    </Box>
  );
};

export default MultiSelect;
