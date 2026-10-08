import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress as GProgress,
  ProgressFilledTrack,
} from "@gluestack-ui/themed";

export interface SectionProgressData {
  id: string;
  title: string;
  total: number;
  correct: number;
}

export interface ProgressProps {
  answered?: number;
  correct?: number;
  total: number;
  label?: string;
  sections?: SectionProgressData[];
}

export const Progress: React.FC<ProgressProps> = ({
  answered = 0,
  correct,
  total,
  label = "Overall Progress",
  sections,
}) => {
  const currentCount = correct !== undefined ? correct : answered;
  const pct = total > 0 ? Math.min(100, Math.round((currentCount / total) * 100)) : 0;

  return (
    <VStack space="xs">
      <HStack justifyContent="space-between" alignItems="center" mb="$1">
        <Text size="xs" fontWeight="$medium" color="$textLight700" $dark-color="$textDark300">
          {label}
        </Text>
        <Text size="xs" color="$textLight500" $dark-color="$textDark400">
          {currentCount} / {total} ({pct}%)
        </Text>
      </HStack>
      <GProgress value={pct} size="md">
        <ProgressFilledTrack
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </GProgress>

      {sections && sections.length > 1 && (
        <VStack space="xs" mt="$3">
          {sections.map((sec) => {
            const secPct = sec.total > 0 ? Math.round((sec.correct / sec.total) * 100) : 0;
            return (
              <Box key={sec.id}>
                <HStack justifyContent="space-between" mb="$1">
                  <Text size="2xs" color="$textLight500" $dark-color="$textDark400">
                    {sec.title}
                  </Text>
                  <Text size="2xs" color="$textLight500" $dark-color="$textDark400">
                    {sec.correct}/{sec.total}
                  </Text>
                </HStack>
                <GProgress value={secPct} size="xs">
                  <ProgressFilledTrack
                    role="progressbar"
                    aria-valuenow={secPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </GProgress>
              </Box>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
};

export default Progress;
