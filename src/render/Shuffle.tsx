import React from "react";

export interface ShuffleProps {
  isShuffled?: boolean;
  onShuffle?: () => void;
  onToggle?: () => void;
  noShuffle?: boolean;
}

export const Shuffle: React.FC<ShuffleProps> = ({
  isShuffled = false,
  onShuffle,
  onToggle,
  noShuffle = false,
}) => {
  if (noShuffle) {
    return null;
  }

  const handleClick = () => {
    if (onToggle) onToggle();
    else if (onShuffle) onShuffle();
  };

  return (
    <button
      type="button"
      className={`mdq-btn ${isShuffled ? "mdq-btn-primary" : "mdq-btn-secondary"}`}
      onClick={handleClick}
      title={isShuffled ? "Restore original order" : "Shuffle questions in this section"}
      aria-pressed={isShuffled}
      style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", minHeight: "38px" }}
    >
      🔀 {isShuffled ? "Shuffled" : "Shuffle"}
    </button>
  );
};

export default Shuffle;
