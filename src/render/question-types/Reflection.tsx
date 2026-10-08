import React, { useState } from "react";
import { Question } from "../../parse/schema.js";
import {
  Textarea,
  TextareaInput,
  Box,
  Text,
} from "@gluestack-ui/themed";

export interface ReflectionProps {
  question: Question;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const Reflection: React.FC<ReflectionProps> = ({
  question,
  savedAnswer,
  onAnswer,
  disabled = false,
}) => {
  const [text, setText] = useState<string>(() => {
    return typeof savedAnswer?.userResponse === "string" ? savedAnswer.userResponse : "";
  });

  const handleUpdate = (val: string) => {
    setText(val);
    // Auto-mark as practiced on input or keep state updated
    onAnswer?.(val, true);
  };

  const handleChange = (e: any) => {
    const val = typeof e === "string" ? e : (e?.target?.value ?? "");
    handleUpdate(val);
  };

  return (
    <Box className="mdq-reflection">
      <Box className="mdq-reflection-group">
        <Textarea size="md" className="mdq-reflection-textarea" isDisabled={disabled}>
          <TextareaInput
            placeholder="Reflect on this question, write down your reasoning, or take study notes..."
            value={text}
            disabled={disabled}
            onChange={handleChange}
            onChangeText={handleUpdate}
            rows={5}
          />
        </Textarea>
      </Box>

      {question.explanationHtml && (
        <Box className="mdq-explanation">
          <Text className="mdq-explanation-title">Suggested Notes & Key Takeaways</Text>
          <div
            className="mdq-explanation-body"
            dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
          />
        </Box>
      )}
    </Box>
  );
};

export default Reflection;
