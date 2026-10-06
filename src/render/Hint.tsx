import React, { useState } from "react";

export interface HintProps {
  hint?: string;
}

export const Hint: React.FC<HintProps> = ({ hint }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!hint) {
    return null;
  }

  return (
    <div className="mdq-hint">
      <button
        type="button"
        className="mdq-hint-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>💡 Hint</span>
        <span>{isOpen ? "Hide hint" : "Show hint"}</span>
      </button>
      {isOpen && (
        <div className="mdq-hint-content">
          {hint}
        </div>
      )}
    </div>
  );
};

export default Hint;
