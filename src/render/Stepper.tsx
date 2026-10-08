import React from "react";
import { Box, Text, Button, ButtonText } from "@gluestack-ui/themed";

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
    <Box className="mdq-stepper" aria-label="Question Stepper" role="contentinfo" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Button
        variant="outline"
        action="secondary"
        type="button"
        className="mdq-btn mdq-btn-secondary"
        onClick={onPrev}
        onPress={onPrev}
        disabled={!hasPrev}
        isDisabled={!hasPrev}
        aria-label="Previous question"
      >
        <ButtonText>‹ Prev</ButtonText>
      </Button>

      <Text className="mdq-stepper-center">
        Q {current + 1} / {total}
      </Text>

      <Button
        variant="solid"
        action="primary"
        type="button"
        className="mdq-btn mdq-btn-primary"
        onClick={onNext}
        onPress={onNext}
        disabled={!hasNext}
        isDisabled={!hasNext}
        aria-label="Next question"
      >
        <ButtonText>Next ›</ButtonText>
      </Button>
    </Box>
  );
};

export default Stepper;
