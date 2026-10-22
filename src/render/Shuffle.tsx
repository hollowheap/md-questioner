import React from "react";
import { ButtonText } from "@gluestack-ui/themed";
import { ButtonEx } from "./themed-aliases.js";

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
    <ButtonEx
      size="md"
      variant={isShuffled ? "solid" : "outline"}
      action={isShuffled ? "primary" : "secondary"}
      type="button"
      onClick={handleClick}
      onPress={handleClick}
      title={isShuffled ? "Restore original order" : "Shuffle questions in this section"}
      aria-pressed={isShuffled}
    >
      <ButtonText>{isShuffled ? "Shuffled" : "Shuffle"}</ButtonText>
    </ButtonEx>
  );
};

export default Shuffle;
