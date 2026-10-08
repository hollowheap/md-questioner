import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import { MarkdownView } from "../MarkdownView.js";
import {
  CheckboxGroup,
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
  CheckIcon,
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
            let bgColor = isSelected ? "$primary100" : "$backgroundLight0";

            if (isLocked) {
              if (opt.isCorrect) {
                borderColor = "$success500";
                bgColor = "$primary100";
              } else if (isSelected && !opt.isCorrect) {
                borderColor = "$error500";
                bgColor = "$backgroundLight100";
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
                borderRadius="$2xl"
                borderWidth={1}
                borderColor={borderColor}
                bg={bgColor}
                $dark-bg={isSelected ? "$dmAccentSoft" : "$backgroundDark900"}
                justifyContent="flex-start"
                alignItems="center"
              >
                <CheckboxIndicator mr="$4">
                  <CheckboxIcon as={CheckIcon} />
                </CheckboxIndicator>
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
          px="$6"
          py="$3.5"
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
