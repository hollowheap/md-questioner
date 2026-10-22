import React, { useState } from "react";
import { Box, Button, ButtonText, Card, Text } from "@gluestack-ui/themed";
import { AnimatePresence, motion } from "motion/react";
import { transitions } from "./motion.js";
import { useAnnounce } from "./LiveRegion.js";

export interface HintProps {
  hint?: string;
}

export const Hint: React.FC<HintProps> = ({ hint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const announce = useAnnounce();

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    announce(next ? "Hint shown" : "Hint hidden");
  };

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
        onClick={toggle}
        onPress={toggle}
        aria-expanded={isOpen}
      >
        <ButtonText>Hint: {isOpen ? "Hide" : "Show"}</ButtonText>
      </Button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="hint"
            data-testid="mdq-hint-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.base}
            style={{ overflow: "hidden" }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Hint;

