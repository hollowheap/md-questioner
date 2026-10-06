import React, { useState } from "react";
import { Question } from "../../parse/schema.js";

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
      <button
        key={opt.id}
        type="button"
        className={`mdq-tf-btn ${isSelected ? "selected" : ""} ${statusClass}`}
        disabled={isLocked || disabled}
        onClick={() => handleSelect(opt.id)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mdq-true-false">
      <div className="mdq-tf-group">
        {renderButton(trueOption, "True")}
        {renderButton(falseOption, "False")}
      </div>

      {!isLocked && (
        <button
          type="button"
          className="mdq-btn mdq-btn-primary"
          onClick={handleCheck}
          disabled={!selectedId || disabled}
        >
          Check Answer
        </button>
      )}

      {isLocked && question.explanationHtml && (
        <div className="mdq-explanation">
          <div className="mdq-explanation-title">Explanation</div>
          <div
            className="mdq-explanation-body"
            dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
          />
        </div>
      )}
    </div>
  );
};

export default TrueFalse;
