import React from "react";
import { HStack, Text, Button, ButtonText } from "@gluestack-ui/themed";

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
    <HStack
      justifyContent="space-between"
      alignItems="center"
      p="$4"
      borderTopWidth={1}
      borderColor="$borderLight200"
      $dark-borderColor="$borderDark700"
      bg="$backgroundLight0"
      $dark-bg="$backgroundDark900"
      className="mdq-stepper"
      aria-label="Question Stepper"
      role="contentinfo"
    >
      <Button
        variant="outline"
        action="secondary"
        className="mdq-btn mdq-btn-secondary"
        onClick={onPrev}
        onPress={onPrev}
        isDisabled={!hasPrev}
        aria-label="Previous question"
      >
        <ButtonText>‹ Prev</ButtonText>
      </Button>

      <Text fontWeight="$medium" className="mdq-stepper-center">
        Q {current + 1} / {total}
      </Text>

      <Button
        variant="solid"
        action="primary"
        className="mdq-btn mdq-btn-primary"
        onClick={onNext}
        onPress={onNext}
        isDisabled={!hasNext}
        aria-label="Next question"
      >
        <ButtonText>Next ›</ButtonText>
      </Button>
    </HStack>
  );
};

export default Stepper;
