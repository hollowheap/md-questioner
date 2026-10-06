import React from "react";

export interface StepperProps {
  current: number;
  total: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const Stepper: React.FC<StepperProps> = ({
  current,
  total,
  hasPrev = true,
  hasNext = true,
  onPrev,
  onNext,
}) => {
  return (
    <footer className="mdq-stepper" aria-label="Question Stepper">
      <button
        type="button"
        className="mdq-btn mdq-btn-secondary"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous question"
      >
        ‹ Prev
      </button>

      <span className="mdq-stepper-center">
        Q {current + 1} / {total}
      </span>

      <button
        type="button"
        className="mdq-btn mdq-btn-primary"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next question"
      >
        Next ›
      </button>
    </footer>
  );
};

export default Stepper;
