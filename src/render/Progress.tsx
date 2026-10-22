import React from "react";
import { Box, VStack, HStack, Text } from "@gluestack-ui/themed";

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

interface ProgressBarProps {
  value: number;
  label: string;
  size?: "sm" | "md";
}

/** Own progressbar: Gluestack's Progress emits an unsupported aria-orientation. */
const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, size = "md" }) => (
  <Box
    role="progressbar"
    aria-label={label}
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={100}
    width="100%"
    height={size === "sm" ? "4px" : "6px"}
    borderRadius="full"
    overflow="hidden"
    bg="$borderLight200"
    $dark-bg="$borderDark700"
  >
    <Box
      width={`${value}%`}
      height="100%"
      borderRadius="full"
      bg="$primary500"
      $dark-bg="$dmAccent"
    />
  </Box>
);

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
    <VStack space="sm">
      <HStack justifyContent="space-between" alignItems="center" mb="$1">
        <Text size="sm" fontWeight="$medium" color="$textLight700" $dark-color="$textDark300">
          {label}
        </Text>
        <Text size="sm" color="$textLight500" $dark-color="$textDark400">
          {currentCount} / {total} ({pct}%)
        </Text>
      </HStack>
      <ProgressBar value={pct} label={label} />

      {sections && sections.length > 1 && (
        <VStack space="sm" mt="$4">
          {sections.map((sec) => {
            const secPct = sec.total > 0 ? Math.round((sec.correct / sec.total) * 100) : 0;
            return (
              <Box key={sec.id}>
                <HStack justifyContent="space-between" mb="$1">
                  <Text size="sm" color="$textLight500" $dark-color="$textDark400">
                    {sec.title}
                  </Text>
                  <Text size="sm" color="$textLight500" $dark-color="$textDark400">
                    {sec.correct}/{sec.total}
                  </Text>
                </HStack>
                <ProgressBar value={secPct} label={sec.title} />
              </Box>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
};

export default Progress;
