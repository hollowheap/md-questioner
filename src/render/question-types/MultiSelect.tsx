import React, { useState } from "react";
import { Question } from "../../parse/schema.js";

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
    <div className="mdq-multi-select">
      <div className="mdq-options-list" role="group" aria-label={question.title}>
        {options.map((opt) => {
          const isSelected = selectedIds.includes(opt.id);
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
              onClick={(e) => {
                if (e.target instanceof HTMLInputElement) return;
                handleToggle(opt.id);
              }}
            >
              <input
                type="checkbox"
                name={`ms-${question.id}-${opt.id}`}
                value={opt.id}
                checked={isSelected}
                disabled={isLocked || disabled}
                onChange={() => handleToggle(opt.id)}
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
          disabled={selectedIds.length === 0 || disabled}
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

export default MultiSelect;
