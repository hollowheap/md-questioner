import React, { useEffect, useState } from "react";
import { Question } from "../../parse/schema.js";
import { MarkdownView } from "../MarkdownView.js";
import type { KeyboardSelection } from "../shortcuts.js";
import {
  Box,
  Text,
  Button,
  ButtonText,
  HStack,
  Card,
  Heading,
} from "@gluestack-ui/themed";

export interface TrueFalseProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  keyboardSelection?: KeyboardSelection | null;
  onAnswer?: (response: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const TrueFalse: React.FC<TrueFalseProps> = ({
  question,
  savedAnswer,
  keyboardSelection,
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

  // Digits map to the rendered order: 1 is True, 2 is False.
  useEffect(() => {
    if (!keyboardSelection || isLocked || disabled) return;
    const rendered = [trueOption, falseOption];
    const option = rendered[keyboardSelection.index];
    if (option) setSelectedId(option.id);
  }, [keyboardSelection, isLocked, disabled, trueOption, falseOption]);

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
    let action: "primary" | "secondary" | "positive" | "negative" = isSelected ? "primary" : "secondary";

    if (isLocked) {
      if (opt.isCorrect) {
        action = "positive";
      } else if (isSelected && !opt.isCorrect) {
        action = "negative";
      }
    }

    return (
      <Button
        key={opt.id}
        size="lg"
        flex={1}
        variant={isSelected || (isLocked && opt.isCorrect) ? "solid" : "outline"}
        action={action}
        isDisabled={isLocked || disabled}
        onClick={() => handleSelect(opt.id)}
        onPress={() => handleSelect(opt.id)}
      >
        <ButtonText>{label}</ButtonText>
      </Button>
    );
  };

  return (
    <Box>
      <HStack space="lg" mb="$8">
        {renderButton(trueOption, "True")}
        {renderButton(falseOption, "False")}
      </HStack>

      {!isLocked && (
        <Button
          // Remount on a disabled-state change: Gluestack keeps the disabled
          // opacity (0.4) once a button has been disabled.
          key={!selectedId || disabled ? "disabled" : "enabled"}
          size="md"
          variant="solid"
          action="primary"
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

export default TrueFalse;
