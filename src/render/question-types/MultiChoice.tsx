import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import { MarkdownView } from "../MarkdownView.js";
import {
  RadioGroup,
  Radio,
  RadioIndicator,
  RadioIcon,
  RadioLabel,
  CircleIcon,
  Card,
  Button,
  ButtonText,
  Heading,
  Box,
  VStack,
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
    <Box>
      <RadioGroup value={selectedId} onChange={handleSelect} isDisabled={isLocked || disabled} mb="$8">
        <VStack space="md">
          {options.map((opt) => {
            const isSelected = selectedId === opt.id;
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
              <Radio
                key={opt.id}
                value={opt.id}
                size="md"
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
                <RadioIndicator mr="$4">
                  <RadioIcon as={CircleIcon} />
                </RadioIndicator>
                <RadioLabel
                  flex={1}
                  fontWeight={isSelected ? "$semibold" : "$normal"}
                  size="md"
                >
                  {opt.text}
                </RadioLabel>
              </Radio>
            );
          })}
        </VStack>
      </RadioGroup>

      {!isLocked && (
        <Button
          size="md"
          variant="solid"
          action="primary"
          px="$6"
          py="$3.5"
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
          <MarkdownView html={question.explanationHtml} />
        </Card>
      )}
    </Box>
  );
};

export default MultiChoice;
