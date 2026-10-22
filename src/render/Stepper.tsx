import React from "react";
import {
  HStack,
  Text,
  Button,
  ButtonText,
} from "@gluestack-ui/themed";
import { contentColumnStyle } from "./layout.js";

export interface StepperProps {
  current: number;
  total: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  nextLabel?: string;
  /** Replaces the "Q x / y" counter, e.g. "Results" on the results screen. */
  counterLabel?: string;
  onPrev: () => void;
  onNext: () => void;
  isMobile?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  current,
  total,
  hasPrev = true,
  hasNext = true,
  nextLabel = "Next",
  counterLabel,
  onPrev,
  onNext,
  isMobile = false,
}) => {
  return (
    <HStack
      data-testid="mdq-stepper"
      testID="mdq-stepper"
      flexShrink={0}
      py="$4"
      borderTopWidth={1}
      borderColor="$borderLight200"
      $dark-borderColor="$borderDark700"
      bg="$backgroundLight0"
      $dark-bg="$backgroundDark900"
      aria-label="Question Stepper"
      role="contentinfo"
    >
      <HStack
        style={contentColumnStyle}
        px={isMobile ? "$4" : "$8"}
        justifyContent="space-between"
        alignItems="center"
      >
        <Button
          // Remount on a disabled-state change: Gluestack keeps the disabled
          // opacity (0.4) once a button has been disabled.
          key={`prev-${hasPrev ? "on" : "off"}`}
          size="md"
          variant="outline"
          action="secondary"
          onClick={onPrev}
          onPress={onPrev}
          isDisabled={!hasPrev}
        >
          <ButtonText>Prev</ButtonText>
        </Button>

        <Text size="md" fontWeight="$medium">
          {counterLabel ?? `Q ${current + 1} / ${total}`}
        </Text>

        <Button
          // Remount on a disabled-state change: Gluestack keeps the disabled
          // opacity (0.4) once a button has been disabled.
          key={`next-${hasNext ? "on" : "off"}`}
          size="md"
          variant="solid"
          action="primary"
          onClick={onNext}
          onPress={onNext}
          isDisabled={!hasNext}
        >
          <ButtonText>{nextLabel}</ButtonText>
        </Button>
      </HStack>
    </HStack>
  );
};

export default Stepper;
