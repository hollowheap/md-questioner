import React, { useState } from "react";
import { Box, Button, ButtonText, Card, Text } from "@gluestack-ui/themed";

export interface HintProps {
  hint?: string;
}

export const Hint: React.FC<HintProps> = ({ hint }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!hint) {
    return null;
  }

  return (
    <Box mb="$4">
      <Button
        size="sm"
        variant="outline"
        action="secondary"
        onPress={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <ButtonText>Hint: {isOpen ? "Hide" : "Show"}</ButtonText>
      </Button>
      {isOpen && (
        <Card variant="outline" mt="$2" p="$3">
          <Text>{hint}</Text>
        </Card>
      )}
    </Box>
  );
};

export default Hint;
