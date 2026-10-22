import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Box, Button, ButtonText, Heading, HStack, Text, VStack } from "@gluestack-ui/themed";
import { Section } from "../parse/schema.js";
import { Progress } from "./Progress.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { transitions } from "./motion.js";
import { CheckGlyph, CrossGlyph, PendingGlyph } from "./icons.js";

// Raw color, allowed by the token policy: the sheet backdrop is a scrim, not a surface.
const SHEET_SCRIM = "rgba(0, 0, 0, 0.45)";

export interface QuestionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  activeSectionIndex: number;
  activeQuestionIndex: number;
  answeredQuestions: Record<string, { isCorrect: boolean; userResponse: unknown }>;
  onSelect: (sectionIdx: number, questionIdx: number) => void;
  onRetake: () => void;
}

export const QuestionSheet: React.FC<QuestionSheetProps> = ({
  isOpen,
  onClose,
  sections,
  activeSectionIndex,
  activeQuestionIndex,
  answeredQuestions,
  onSelect,
  onRetake,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      sheetRef.current?.focus();
    } else if (previouslyFocused.current) {
      // Return focus to whatever opened the sheet.
      previouslyFocused.current.focus();
      previouslyFocused.current = null;
    }
  }, [isOpen]);

  let totalQuestions = 0;
  let totalCorrect = 0;
  for (const section of sections) {
    for (const question of section.questions) {
      totalQuestions++;
      if (answeredQuestions[question.id]?.isCorrect) totalCorrect++;
    }
  }

  return (
    typeof document !== "undefined" &&
    createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="sheet-backdrop"
              data-testid="mdq-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitions.fast}
              onClick={onClose}
              aria-hidden="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                background: SHEET_SCRIM,
              }}
            />
            <motion.div
              key="question-sheet"
              ref={sheetRef}
              data-testid="mdq-question-sheet"
              role="dialog"
              aria-label="Quiz questions"
              tabIndex={-1}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 600) onClose();
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={transitions.drawer}
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 2001,
                maxHeight: "80%",
                display: "flex",
                flexDirection: "column",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderTopWidth: 1,
                borderColor: "var(--color-border)",
                background: "var(--color-card)",
                color: "var(--color-text)",
                outline: "none",
              }}
            >
              <Box p="$4" pb="$2">
                <Box
                  alignSelf="center"
                  width={40}
                  height={4}
                  borderRadius={2}
                  bg="var(--color-border)"
                  mb="$3"
                />
                <HStack justifyContent="space-between" alignItems="center">
                  <Heading size="sm">Questions</Heading>
                  <Button
                    size="sm"
                    variant="link"
                    action="secondary"
                    onClick={onClose}
                    onPress={onClose}
                    aria-label="Close question list"
                  >
                    <ButtonText>Close</ButtonText>
                  </Button>
                </HStack>
              </Box>

              <Box flex={1} overflow="scroll" px="$4" pb="$4">
                <VStack space="md">
                  {sections.map((section, sIdx) => (
                    <Box key={section.id}>
                      <Text
                        size="xs"
                        fontWeight="$semibold"
                        textTransform="uppercase"
                        color="$textLight500"
                        $dark-color="$textDark400"
                        mb="$2"
                      >
                        {section.title}
                      </Text>
                      <VStack space="xs">
                        {section.questions.map((question, qIdx) => {
                          const isActive =
                            sIdx === activeSectionIndex && qIdx === activeQuestionIndex;
                          const answer = answeredQuestions[question.id];

                          return (
                            <Button
                              key={question.id}
                              variant="link"
                              action="secondary"
                              onClick={() => {
                                onSelect(sIdx, qIdx);
                                onClose();
                              }}
                              onPress={() => {
                                onSelect(sIdx, qIdx);
                                onClose();
                              }}
                              bg={isActive ? "$primary100" : "transparent"}
                              $dark-bg={isActive ? "$dmAccentSoft" : "transparent"}
                              justifyContent="flex-start"
                              px="$3"
                              py="$2"
                              borderRadius="$md"
                            >
                              <span
                                role="img"
                                aria-label={
                                  answer
                                    ? answer.isCorrect
                                      ? "Answered correctly"
                                      : "Answered incorrectly"
                                    : "Not answered"
                                }
                                style={{
                                  marginRight: 6,
                                  color: answer
                                    ? answer.isCorrect
                                      ? "var(--color-success)"
                                      : "var(--color-error)"
                                    : "var(--color-muted)",
                                }}
                              >
                                {answer ? (
                                  answer.isCorrect ? (
                                    <CheckGlyph size={12} />
                                  ) : (
                                    <CrossGlyph size={12} />
                                  )
                                ) : (
                                  <PendingGlyph size={12} />
                                )}
                              </span>
                              <ButtonText
                                numberOfLines={1}
                                color={isActive ? "$primary600" : "$textLight800"}
                                $dark-color={isActive ? "$dmAccent" : "$textDark200"}
                                fontWeight={isActive ? "$semibold" : "$normal"}
                              >
                                {qIdx + 1}. {question.title}
                              </ButtonText>
                            </Button>
                          );
                        })}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </Box>

              <Box
                p="$4"
                borderTopWidth={1}
                borderColor="var(--color-border)"
                bg="var(--color-surface)"
              >
                <Progress total={totalQuestions} correct={totalCorrect} label="Overall Score" />
                <HStack space="sm" mt="$3">
                  <Button
                    size="sm"
                    variant="outline"
                    action="secondary"
                    flex={1}
                    onClick={onRetake}
                    onPress={onRetake}
                  >
                    <ButtonText>Retake</ButtonText>
                  </Button>
                  <ThemeToggle />
                </HStack>
              </Box>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )
  );
};

export default QuestionSheet;
