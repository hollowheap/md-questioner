import React, { useState } from "react";
import { Question } from "../../parse/schema.js";

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    // Auto-mark as practiced on input or keep state updated
    onAnswer?.(val, true);
  };

  return (
    <div className="mdq-reflection">
      <div className="mdq-reflection-group">
        <textarea
          className="mdq-reflection-textarea"
          placeholder="Reflect on this question, write down your reasoning, or take study notes..."
          value={text}
          disabled={disabled}
          onChange={handleChange}
          rows={5}
        />
      </div>

      {question.explanationHtml && (
        <div className="mdq-explanation">
          <div className="mdq-explanation-title">Suggested Notes & Key Takeaways</div>
          <div
            className="mdq-explanation-body"
            dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
          />
        </div>
      )}
    </div>
  );
};

export default Reflection;
