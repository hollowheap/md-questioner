import React from "react";
import { Button, ButtonText } from "@gluestack-ui/themed";

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
    <Button
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
    </Button>
  );
};

export default Shuffle;
