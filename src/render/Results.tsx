import React from "react";
import { Box, Button, ButtonText, Heading, HStack, Text, VStack } from "@gluestack-ui/themed";
import { Section } from "../parse/schema.js";

export interface ResultsProps {
  sections: Section[];
  answeredQuestions: Record<string, { isCorrect: boolean; userResponse: unknown }>;
  onRetakeAll: () => void;
  onReview: () => void;
}

function correctAnswerFor(question: Section["questions"][number]): string | undefined {
  const options = question.options?.filter((opt) => opt.isCorrect).map((opt) => opt.text);
  if (options && options.length > 0) {
    return options.join(", ");
  }
  if (question.pairs && question.pairs.length > 0) {
    return question.pairs.map((pair) => `${pair.prompt} - ${pair.answer}`).join("; ");
  }
  return question.canonicalAnswer;
}

export const Results: React.FC<ResultsProps> = ({
  sections,
  answeredQuestions,
  onRetakeAll,
  onReview,
}) => {
  let total = 0;
  let correct = 0;
  const sectionStats = sections.map((section) => {
    let sectionTotal = 0;
    let sectionCorrect = 0;
    for (const question of section.questions) {
      sectionTotal++;
      total++;
      if (answeredQuestions[question.id]?.isCorrect) {
        sectionCorrect++;
        correct++;
      }
    }
    return { id: section.id, title: section.title, total: sectionTotal, correct: sectionCorrect };
  });

  const missed = sections.flatMap((section) =>
    section.questions
      .filter((question) => !answeredQuestions[question.id]?.isCorrect)
      .map((question) => ({
        id: question.id,
        title: question.title,
        sectionTitle: section.title,
        answer: correctAnswerFor(question),
      }))
  );

  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <Box data-testid="mdq-results" testID="mdq-results">
      <Box
        mb="$8"
        borderRadius="$md"
        bg="$backgroundLight0"
        $dark-bg="$backgroundDark900"
      >
      <Heading size="md" mb="$2">
        Quiz complete
      </Heading>
      <Text size="sm" color="$textLight600" $dark-color="$textDark300" mb="$5">
        {correct} of {total} correct ({percent}%)
      </Text>

      <Text size="xs" fontWeight="$semibold" textTransform="uppercase" color="$textLight500" $dark-color="$textDark400" mb="$2">
        By section
      </Text>
      <VStack space="xs" mb="$5">
        {sectionStats.map((stat) => (
          <HStack key={stat.id} justifyContent="space-between" alignItems="center">
            <Text size="sm" color="$textLight800" $dark-color="$textDark200">
              {stat.title}
            </Text>
            <Text size="sm" color="$textLight600" $dark-color="$textDark300">
              {stat.correct} / {stat.total}
            </Text>
          </HStack>
        ))}
      </VStack>

      <Text size="xs" fontWeight="$semibold" textTransform="uppercase" color="$textLight500" $dark-color="$textDark400" mb="$2">
        Missed questions
      </Text>
      {missed.length === 0 ? (
        <Text size="sm" color="$textLight600" $dark-color="$textDark300" mb="$5">
          Nothing missed. Every question is correct.
        </Text>
      ) : (
        <VStack space="sm" mb="$5">
          {missed.map((item) => (
            <Box key={item.id} data-testid="mdq-missed-question" testID="mdq-missed-question">
              <Text size="sm" fontWeight="$semibold" color="$textLight900" $dark-color="$textDark50">
                {item.title}
              </Text>
              <Text size="xs" color="$textLight500" $dark-color="$textDark400">
                {item.sectionTitle}
                {item.answer ? ` — answer: ${item.answer}` : ""}
              </Text>
            </Box>
          ))}
        </VStack>
      )}

      <HStack space="sm">
        <Button
          data-testid="mdq-results-retake" testID="mdq-results-retake"
          size="md"
          variant="solid"
          action="primary"
          onClick={onRetakeAll}
          onPress={onRetakeAll}
        >
          <ButtonText>Retake quiz</ButtonText>
        </Button>
        <Button
          data-testid="mdq-results-review"
          size="md"
          variant="outline"
          action="secondary"
          onClick={onReview}
          onPress={onReview}
        >
          <ButtonText>Review questions</ButtonText>
        </Button>
      </HStack>
      </Box>
    </Box>
  );
};

export default Results;
