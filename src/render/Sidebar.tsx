import React from "react";
import { Box, Heading, Text, Button, ButtonText, VStack } from "@gluestack-ui/themed";
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
      <Box
        className={`mdq-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <Box className={`mdq-sidebar ${isOpen ? "open" : ""}`} aria-label="Quiz Navigation" role="complementary">
        <Box className="mdq-sidebar-header">
          <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Heading size="md" className="mdq-sidebar-title">{quizTitle}</Heading>
            {isOpen && (
              <Button
                type="button"
                className="mdq-btn mdq-btn-ghost"
                onClick={onClose}
                onPress={onClose}
                aria-label="Close navigation drawer"
                style={{ padding: "0.25rem 0.5rem", minHeight: "36px", minWidth: "36px" }}
              >
                <ButtonText>✕</ButtonText>
              </Button>
            )}
          </Box>
          {quizDescription && <Text className="mdq-sidebar-desc">{quizDescription}</Text>}
        </Box>

        <Box className="mdq-sidebar-sections" role="navigation" aria-label="Quiz Sections">
          {sections.map((section, sIdx) => {
            const secProgress = sectionProgressList[sIdx];
            return (
              <Box key={section.id} className="mdq-sidebar-section">
                <Box className="mdq-sidebar-section-header">
                  <Text>{section.title}</Text>
                  <Text>
                    {secProgress.correct} / {secProgress.total}
                  </Text>
                </Box>
                <VStack style={{ gap: "2px" }}>
                  {section.questions.map((question, qIdx) => {
                    const isActive = sIdx === activeSectionIndex && qIdx === activeQuestionIndex;
                    const ans = answeredQuestions[question.id];

                    let statusIcon = "○";
                    let statusClass = "unanswered";

                    if (ans) {
                      if (ans.isCorrect) {
                        statusIcon = "✓";
                        statusClass = "correct";
                      } else {
                        statusIcon = "✗";
                        statusClass = "incorrect";
                      }
                    }

                    return (
                      <Button
                        key={question.id}
                        type="button"
                        variant="link"
                        action="secondary"
                        className={`mdq-sidebar-question-link ${isActive ? "active" : ""}`}
                        onClick={() => {
                          onSelect(sIdx, qIdx);
                          onClose();
                        }}
                        onPress={() => {
                          onSelect(sIdx, qIdx);
                          onClose();
                        }}
                        style={{ justifyContent: "flex-start", paddingLeft: "0.65rem", paddingRight: "0.65rem" }}
                      >
                        <Text className={`mdq-status-icon ${statusClass}`}>{statusIcon}</Text>
                        <ButtonText style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit", fontWeight: isActive ? "600" : "400" }}>
                          {qIdx + 1}. {question.title}
                        </ButtonText>
                      </Button>
                    );
                  })}
                </VStack>
              </Box>
            );
          })}
        </Box>

        <Box className="mdq-sidebar-footer">
          <Progress
            total={totalQuestions}
            correct={totalCorrect}
            label="Overall Score"
          />
          <Box style={{ display: "flex", flexDirection: "row", gap: "0.5rem", marginTop: "1rem" }}>
            <Button
              variant="outline"
              action="secondary"
              type="button"
              className="mdq-btn mdq-btn-secondary"
              onClick={onRetake}
              onPress={onRetake}
              style={{ flex: 1, fontSize: "0.85rem", minHeight: "38px" }}
            >
              <ButtonText>Retake</ButtonText>
            </Button>
            <ThemeToggle />
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Sidebar;
