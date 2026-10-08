import React, { useState } from "react";
import { Box, Text } from "@gluestack-ui/themed";

export interface HintProps {
  hint?: string;
}

export const Hint: React.FC<HintProps> = ({ hint }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!hint) {
    return null;
  }

  return (
    <Box className="mdq-hint">
      <button
        type="button"
        className="mdq-hint-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <Text>Hint</Text>
        <Text>{isOpen ? "Hide" : "Show"}</Text>
      </button>
      {isOpen && (
        <Box className="mdq-hint-content">
          <Text>{hint}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Hint;
