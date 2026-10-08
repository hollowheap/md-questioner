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
    <Box mb="$5">
      <Button
        size="sm"
        variant="outline"
        action="secondary"
        alignSelf="flex-start"
        onClick={() => setIsOpen(!isOpen)}
        onPress={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <ButtonText>Hint: {isOpen ? "Hide" : "Show"}</ButtonText>
      </Button>
      {isOpen && (
        <Card
          variant="outline"
          mt="$3"
          p="$4"
          borderRadius="$md"
          borderColor="$borderLight200"
          $dark-borderColor="$borderDark700"
          bg="$backgroundLight50"
          $dark-bg="$backgroundDark900"
        >
          <Text size="sm" color="$textLight800" $dark-color="$textDark200">
            {hint}
          </Text>
        </Card>
      )}
    </Box>
  );
};

export default Hint;

