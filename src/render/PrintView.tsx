import React from "react";
import { Box, Heading, Text, VStack } from "@gluestack-ui/themed";
import { Section } from "../parse/schema.js";
import { MarkdownView } from "./MarkdownView.js";

export interface PrintViewProps {
  title: string;
  description?: string;
  sections: Section[];
}

/** Study-guide output for printing: every question with its correct answer. */
export const PrintView: React.FC<PrintViewProps> = ({ title, description, sections }) => (
  <div className="mdq-print-view">
    <Heading size="md" mb="$2">
      {title}
    </Heading>
    {description && (
      <Text size="sm" mb="$4">
        {description}
      </Text>
    )}

    {sections.map((section) => (
      <Box key={section.id} mb="$6">
        <Heading size="sm" mb="$2">
          {section.title}
        </Heading>
        <VStack space="md">
          {section.questions.map((question, index) => (
            <Box key={question.id}>
              <Text size="sm" fontWeight="$semibold">
                {index + 1}. {question.title}
              </Text>
              {question.promptHtml && (
                <Box mb="$2">
                  <MarkdownView html={question.promptHtml} />
                </Box>
              )}
              {question.options && question.options.length > 0 && (
                <VStack space="xs" mb="$2">
                  {question.options.map((option) => (
                    <Text key={option.id} size="sm">
                      {option.isCorrect ? "[x]" : "[ ]"} {option.text}
                      {option.isCorrect ? "  (correct answer)" : ""}
                    </Text>
                  ))}
                </VStack>
              )}
              {question.canonicalAnswer && (
                <Text size="sm" mb="$2">
                  Expected answer: {question.canonicalAnswer}
                </Text>
              )}
              {question.pairs && question.pairs.length > 0 && (
                <VStack space="xs" mb="$2">
                  {question.pairs.map((pair) => (
                    <Text key={pair.prompt} size="sm">
                      {pair.prompt} - {pair.answer}
                    </Text>
                  ))}
                </VStack>
              )}
              {question.rubric && question.rubric.length > 0 && (
                <VStack space="xs" mb="$2">
                  {question.rubric.map((criterion) => (
                    <Text key={criterion} size="sm">
                      [ ] {criterion}
                    </Text>
                  ))}
                </VStack>
              )}
              {question.modelAnswerHtml && (
                <Box mb="$2">
                  <MarkdownView html={question.modelAnswerHtml} />
                </Box>
              )}
              {question.explanationHtml && (
                <Box>
                  <MarkdownView html={question.explanationHtml} />
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      </Box>
    ))}
  </div>
);

export default PrintView;
