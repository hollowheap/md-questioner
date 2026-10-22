import React from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
  VStack,
  HStack,
  ScrollView,
} from "@gluestack-ui/themed";
import { Section } from "../parse/schema.js";
import { Progress } from "./Progress.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { motion } from "motion/react";
import { transitions } from "./motion.js";
import { CheckGlyph, CrossGlyph, PendingGlyph } from "./icons.js";

export interface SidebarProps {
  quizTitle: string;
  quizDescription?: string;
  sections: Section[];
  activeSectionIndex: number;
  activeQuestionIndex: number;
  answeredQuestions: Record<string, { isCorrect: boolean; userResponse: unknown }>;
  isCollapsed?: boolean;
  onSelect: (sectionIdx: number, questionIdx: number) => void;
  onRetake: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  quizTitle,
  quizDescription,
  sections,
  activeSectionIndex,
  activeQuestionIndex,
  answeredQuestions,
  isCollapsed = false,
  onSelect,
  onRetake,
}) => {
  let totalQuestions = 0;
  let totalCorrect = 0;

  const sectionProgressList = sections.map((sec) => {
    let secCorrect = 0;
    for (const q of sec.questions) {
      totalQuestions++;
      if (answeredQuestions[q.id]?.isCorrect) {
        secCorrect++;
        totalCorrect++;
      }
    }
    return {
      id: sec.id,
      title: sec.title,
      total: sec.questions.length,
      correct: secCorrect,
    };
  });

  return (
    <motion.aside
      initial={false}
      animate={{ x: 0 }}
      transition={transitions.drawer}
      aria-label="Quiz Navigation"
      role="complementary"
      style={{
        width: isCollapsed ? 64 : 280,
        flexShrink: 0,
        position: "relative",
        height: "100%",
      }}
    >
        <Box
          data-testid="mdq-sidebar"
          testID="mdq-sidebar"
          display="flex"
          flexDirection="column"
          h="100%"
          w="100%"
          overflow="hidden"
          bg="$backgroundLight50"
          $dark-bg="$backgroundDark900"
          borderRightWidth={1}
          borderColor="$borderLight200"
          $dark-borderColor="$borderDark700"
        >
        <Box
          p={isCollapsed ? "$2" : "$5"}
          borderBottomWidth={1}
          borderColor="$borderLight200"
          $dark-borderColor="$borderDark700"
        >
          {isCollapsed ? (
            <Text
              size="sm"
              fontWeight="$semibold"
              textAlign="center"
              color="$textLight600"
              $dark-color="$textDark300"
              aria-hidden
            >
              {quizTitle.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <>
              <HStack justifyContent="space-between" alignItems="flex-start">
                <Heading size="md">
                  {quizTitle}
                </Heading>
              </HStack>
              {quizDescription && (
                <Text
                  mt="$1"
                  size="sm"
                  color="$textLight500"
                  $dark-color="$textDark400"
                >
                  {quizDescription}
                </Text>
              )}
            </>
          )}
        </Box>

        <ScrollView flex={1} p={isCollapsed ? "$2" : "$4"} role="navigation" aria-label="Quiz Sections">
          <VStack space="md">
            {sections.map((section, sIdx) => {
              const secProgress = sectionProgressList[sIdx];
              return (
                <Box key={section.id}>
                  <HStack
                    justifyContent={isCollapsed ? "center" : "space-between"}
                    alignItems="center"
                    px={isCollapsed ? "$0" : "$2"}
                    py="$1"
                    mb="$1"
                  >
                    <Text
                      size={isCollapsed ? "xs" : "sm"}
                      fontWeight="$semibold"
                      textTransform="uppercase"
                      color="$textLight500"
                      $dark-color="$textDark400"
                    >
                      {isCollapsed ? section.title.charAt(0) : section.title}
                    </Text>
                    {!isCollapsed && (
                      <Text
                        size="sm"
                        color="$textLight500"
                        $dark-color="$textDark400"
                      >
                        {secProgress.correct} / {secProgress.total}
                      </Text>
                    )}
                  </HStack>
                  <VStack space="sm">
                    {section.questions.map((question, qIdx) => {
                      const isActive =
                        sIdx === activeSectionIndex && qIdx === activeQuestionIndex;
                      const ans = answeredQuestions[question.id];

                      let statusColor = "$textLight400";
                      let statusDarkColor = "$textDark500";
                      let statusLabel = "Not answered";

                      if (ans) {
                        if (ans.isCorrect) {
                          statusColor = "$success500";
                          statusDarkColor = "$dmAccent";
                          statusLabel = "Answered correctly";
                        } else {
                          statusColor = "$error500";
                          statusDarkColor = "$error400";
                          statusLabel = "Answered incorrectly";
                        }
                      }

                      return (
                        <Button
                          key={question.id}
                          variant="link"
                          action="secondary"
                          onClick={() => {
                            onSelect(sIdx, qIdx);
                          }}
                          onPress={() => {
                            onSelect(sIdx, qIdx);
                          }}
                          bg={isActive ? "$primary100" : "transparent"}
                          $dark-bg={isActive ? "$dmAccentSoft" : "transparent"}
                          justifyContent={isCollapsed ? "center" : "flex-start"}
                          px={isCollapsed ? "$1" : "$4"}
                          py={isCollapsed ? "$2" : "$3"}
                          minHeight={isCollapsed ? 32 : 46}
                          borderRadius={isCollapsed ? "$md" : "$xl"}
                          aria-label={
                            isCollapsed
                              ? `Question ${qIdx + 1}: ${question.title}`
                              : undefined
                          }
                        >
                        {isCollapsed ? (
                          <span
                            role="img"
                            aria-label={statusLabel}
                            style={{
                              marginRight: 6,
                              color: ans
                                ? ans.isCorrect
                                  ? "var(--color-success)"
                                  : "var(--color-error)"
                                : "var(--color-muted)",
                            }}
                          >
                            {ans ? (
                              ans.isCorrect ? (
                                <CheckGlyph size={12} />
                              ) : (
                                <CrossGlyph size={12} />
                              )
                            ) : (
                              <PendingGlyph size={12} />
                            )}
                          </span>
                        ) : (
                          <Text mr="$3" color={statusColor} $dark-color={statusDarkColor}>
                            •
                          </Text>
                        )}
                          <ButtonText
                            numberOfLines={1}
                            color={isActive ? "$primary600" : "$textLight800"}
                            $dark-color={isActive ? "$dmAccent" : "$textDark200"}
                            fontWeight={isActive ? "$semibold" : "$normal"}
                          >
                            {isCollapsed ? qIdx + 1 : `${qIdx + 1}. ${question.title}`}
                          </ButtonText>
                        </Button>
                      );
                    })}
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        </ScrollView>

        <Box
          p={isCollapsed ? "$2" : "$6"}
          borderTopWidth={1}
          borderColor="$borderLight200"
          $dark-borderColor="$borderDark700"
          bg="$backgroundLight50"
          $dark-bg="$backgroundDark900"
        >
          {!isCollapsed && (
            <>
              <Progress
                total={totalQuestions}
                correct={totalCorrect}
                label="Overall Score"
              />
              <HStack space="sm" mt="$4">
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
            </>
          )}
        </Box>
        </Box>
    </motion.aside>
  );
};

export default Sidebar;
