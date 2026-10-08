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
      data-testid="mdq-stepper"
      testID="mdq-stepper"
      position="sticky"
      bottom={0}
      left={0}
      right={0}
      zIndex={90}
      justifyContent="space-between"
      alignItems="center"
      px="$6"
      py="$4"
      borderTopWidth={1}
      borderColor="$borderLight200"
      $dark-borderColor="$borderDark700"
      bg="$backgroundLight0"
      $dark-bg="$backgroundDark900"
      aria-label="Question Stepper"
      role="contentinfo"
    >
      <Button
        variant="outline"
        action="secondary"
        onClick={onPrev}
        onPress={onPrev}
        isDisabled={!hasPrev}
        aria-label="Previous question"
      >
        <ButtonText>‹ Prev</ButtonText>
      </Button>

      <Text fontWeight="$medium">
        Q {current + 1} / {total}
      </Text>

      <Button
        variant="solid"
        action="primary"
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
