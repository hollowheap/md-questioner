import React from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
  ButtonIcon,
  Icon,
  CloseIcon,
  CheckIcon,
  CircleIcon,
  VStack,
  HStack,
  ScrollView,
} from "@gluestack-ui/themed";
import { Section } from "../parse/schema.js";
import { Progress } from "./Progress.js";
import { ThemeToggle } from "./ThemeToggle.js";

export interface SidebarProps {
  quizTitle: string;
  quizDescription?: string;
  sections: Section[];
  activeSectionIndex: number;
  activeQuestionIndex: number;
  answeredQuestions: Record<string, { isCorrect: boolean; userResponse: unknown }>;
  isOpen: boolean;
  onClose: () => void;
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
  isOpen,
  onClose,
  onSelect,
  onRetake,
}) => {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") return window.innerWidth < 1024;
    return false;
  });
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

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
    <>
      {isMobile && isOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.45)"
          zIndex={999}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <Box
        data-testid="mdq-sidebar"
        testID="mdq-sidebar"
        position={isMobile ? "fixed" : "sticky"}
        top={0}
        {...(isMobile
          ? { left: 0, bottom: 0, zIndex: 1000 }
          : { h: "100vh", flexShrink: 0 })}
        w={280}
        transform={isMobile ? (isOpen ? "translateX(0)" : "translateX(-100%)") : undefined}
        bg="$backgroundLight50"
        $dark-bg="$backgroundDark900"
        borderRightWidth={1}
        borderColor="$borderLight200"
        $dark-borderColor="$borderDark700"
        aria-label="Quiz Navigation"
        role="complementary"
      >
        <Box
          p="$6"
          borderBottomWidth={1}
          borderColor="$borderLight200"
          $dark-borderColor="$borderDark700"
        >
          <HStack justifyContent="space-between" alignItems="flex-start">
            <Heading size="md">
              {quizTitle}
            </Heading>
            {isMobile && isOpen && (
              <Button
                size="sm"
                variant="link"
                action="secondary"
                onClick={onClose}
                onPress={onClose}
                aria-label="Close navigation drawer"
                p="$1"
              >
                <ButtonIcon as={CloseIcon} size="md" />
              </Button>
            )}
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
        </Box>

        <ScrollView flex={1} p="$3" role="navigation" aria-label="Quiz Sections">
          <VStack space="md">
            {sections.map((section, sIdx) => {
              const secProgress = sectionProgressList[sIdx];
              return (
                <Box key={section.id}>
                  <HStack
                    justifyContent="space-between"
                    alignItems="center"
                    px="$2"
                    py="$1"
                    mb="$1"
                  >
                    <Text
                      size="sm"
                      fontWeight="$semibold"
                      textTransform="uppercase"
                      color="$textLight500"
                      $dark-color="$textDark400"
                    >
                      {section.title}
                    </Text>
                    <Text
                      size="sm"
                      color="$textLight500"
                      $dark-color="$textDark400"
                    >
                      {secProgress.correct} / {secProgress.total}
                    </Text>
                  </HStack>
                  <VStack space="sm">
                    {section.questions.map((question, qIdx) => {
                      const isActive =
                        sIdx === activeSectionIndex && qIdx === activeQuestionIndex;
                      const ans = answeredQuestions[question.id];

                      let StatusIcon = CircleIcon;
                      let statusColor = "$textLight400";
                      let statusDarkColor = "$textDark500";

                      if (ans) {
                        if (ans.isCorrect) {
                          StatusIcon = CheckIcon;
                          statusColor = "$success500";
                          statusDarkColor = "$dmAccent";
                        } else {
                          StatusIcon = CloseIcon;
                          statusColor = "$error500";
                          statusDarkColor = "$error400";
                        }
                      }

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
                          px="$4"
                          py="$3"
                          minHeight={46}
                          borderRadius="$xl"
                        >
                          <Icon as={StatusIcon} size="xs" mr="$2" color={statusColor} $dark-color={statusDarkColor} />
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
              );
            })}
          </VStack>
        </ScrollView>

        <Box
          p="$6"
          borderTopWidth={1}
          borderColor="$borderLight200"
          $dark-borderColor="$borderDark700"
          bg="$backgroundLight50"
          $dark-bg="$backgroundDark900"
        >
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
        </Box>
      </Box>
    </>
  );
};

export default Sidebar;
