import React, { useState } from "react";
import { Question } from "../../parse/schema.js";

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
    <div className="mdq-multi-choice">
      <div className="mdq-options-list" role="radiogroup" aria-label={question.title}>
        {options.map((opt) => {
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
            <label
              key={opt.id}
              className={`mdq-option-label ${isSelected ? "selected" : ""} ${statusClass} ${isLocked ? "locked" : ""}`}
              onClick={() => handleSelect(opt.id)}
            >
              <input
                type="radio"
                name={`mc-${question.id}`}
                value={opt.id}
                checked={isSelected}
                disabled={isLocked || disabled}
                onChange={() => handleSelect(opt.id)}
              />
              <span className="mdq-option-text">{opt.text}</span>
            </label>
          );
        })}
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

export default MultiChoice;
