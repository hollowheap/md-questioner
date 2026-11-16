import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Text,
  Heading,
  Button,
  ButtonText,
  Card,
  ScrollView,
  HStack,
} from "@gluestack-ui/themed";
import { QuizModel, Section, Question as QuestionData } from "../parse/schema.js";
import { GluestackThemeProvider } from "./Provider.js";
import { Sidebar } from "./Sidebar.js";
import { SectionTabs } from "./SectionTabs.js";
import { QuestionSheet } from "./QuestionSheet.js";
import { Results } from "./Results.js";
import { PrintView } from "./PrintView.js";
import { Question } from "./Question.js";
import { Stepper } from "./Stepper.js";
import { Shuffle } from "./Shuffle.js";
import { contentColumnStyle } from "./layout.js";
import { transitions } from "./motion.js";
import { resolveShortcut, type KeyboardSelection } from "./shortcuts.js";
import { LiveRegionContext } from "./LiveRegion.js";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

export interface AppProps {
  model?: QuizModel;
  quiz?: QuizModel;
  noShuffle?: boolean;
}

// Raw color, allowed by the token policy: the modal backdrop is a scrim, not a surface.
const MODAL_SCRIM = "rgba(0, 0, 0, 0.5)";

interface SavedState {
  activeSectionIndex: number;
  activeQuestionIndex: number;
  activeQuestionId?: string;
  answeredQuestions: Record<string, {
    isCorrect: boolean;
    userResponse: unknown;
  }>;
  showResults?: boolean;
}

export const App: React.FC<AppProps> = ({ model, quiz, noShuffle = false }) => {
  const quizModel = model || quiz;

  if (!quizModel || !quizModel.sections || quizModel.sections.length === 0) {
    return (
      <Box
        data-testid="mdq-root"
        testID="mdq-root"
        flexDirection="row"
        minHeight="100%"
        bg="$backgroundLight0"
        $dark-bg="$backgroundDark950"
        p="$8"
      >
        <Text>No quiz content available.</Text>
      </Box>
    );
  }

  const storageKey = `mdq-progress-${quizModel.contentHash}`;

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") return window.innerWidth < 1024;
    return false;
  });
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<string, { isCorrect: boolean; userResponse: unknown }>
  >({});
  const [isQuestionSheetOpen, setIsQuestionSheetOpen] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [keyboardSelection, setKeyboardSelection] = useState<KeyboardSelection | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mdq-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("mdq-sidebar-collapsed", isSidebarCollapsed ? "1" : "0");
    } catch {
      // Storage unavailable
    }
  }, [isSidebarCollapsed]);
  const [showRetakeModal, setShowRetakeModal] = useState<boolean>(false);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [liveMessage, setLiveMessage] = useState<string>("");
  const announceTimer = useRef<number | null>(null);

  const announce = useCallback((message: string) => {
    // Clearing first makes repeated messages announce again.
    setLiveMessage("");
    if (announceTimer.current !== null) window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => {
      announceTimer.current = null;
      setLiveMessage(message);
    }, 30);
  }, []);

  useEffect(
    () => () => {
      if (announceTimer.current !== null) window.clearTimeout(announceTimer.current);
    },
    []
  );

  // Restore saved state on mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved: SavedState = JSON.parse(savedRaw);
        const validQuestionIds = new Set(
          quizModel.sections.flatMap((section) => section.questions.map((question) => question.id))
        );

        let restoredSection = -1;
        if (typeof saved.activeQuestionId === "string") {
          restoredSection = quizModel.sections.findIndex((section) =>
            section.questions.some((question) => question.id === saved.activeQuestionId)
          );
        }
        if (
          restoredSection === -1 &&
          typeof saved.activeSectionIndex === "number" &&
          saved.activeSectionIndex >= 0 &&
          saved.activeSectionIndex < quizModel.sections.length
        ) {
          restoredSection = saved.activeSectionIndex;
        }

        if (restoredSection >= 0) {
          setActiveSectionIndex(restoredSection);
          const section = quizModel.sections[restoredSection];
          const byId =
            typeof saved.activeQuestionId === "string"
              ? section.questions.findIndex((question) => question.id === saved.activeQuestionId)
              : -1;
          const byIndex =
            typeof saved.activeQuestionIndex === "number" ? saved.activeQuestionIndex : 0;
          const restoredQuestion = byId >= 0 ? byId : byIndex;
          if (restoredQuestion >= 0 && restoredQuestion < section.questions.length) {
            setActiveQuestionIndex(restoredQuestion);
          }
        }

        if (saved.answeredQuestions && typeof saved.answeredQuestions === "object") {
          const restoredAnswers: Record<string, { isCorrect: boolean; userResponse: unknown }> = {};
          for (const [questionId, entry] of Object.entries(saved.answeredQuestions)) {
            if (!validQuestionIds.has(questionId) || !entry || typeof entry !== "object") continue;
            if (typeof entry.isCorrect !== "boolean") continue;
            restoredAnswers[questionId] = {
              isCorrect: entry.isCorrect,
              userResponse: entry.userResponse,
            };
          }
          setAnsweredQuestions(restoredAnswers);
        }
        if (saved.showResults === true) {
          setShowResults(true);
        }
      }
    } catch {
      // Storage unavailable or corrupted
    }
  }, [storageKey, quizModel.sections]);

  const currentSection: Section = quizModel.sections[activeSectionIndex] || quizModel.sections[0];

  // In-section question shuffling
  const displayedQuestions: QuestionData[] = useMemo(() => {
    const rawQuestions = currentSection.questions || [];
    if (!isShuffled) return rawQuestions;
    const shuffled = [...rawQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [currentSection, isShuffled]);

  const currentQuestion: QuestionData | undefined = displayedQuestions[activeQuestionIndex];

  // Persist state changes, keying the position by question identity so a shuffled
  // display order cannot restore a different question after a reload.
  useEffect(() => {
    try {
      const stateToSave: SavedState = {
        activeSectionIndex,
        activeQuestionIndex,
        activeQuestionId: currentQuestion?.id,
        answeredQuestions,
        showResults,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch {
      // Storage unavailable
    }
  }, [
    storageKey,
    activeSectionIndex,
    activeQuestionIndex,
    currentQuestion?.id,
    answeredQuestions,
    showResults,
  ]);

  // Announce the active question whenever navigation changes it.
  useEffect(() => {
    announce(`Question ${activeQuestionIndex + 1} of ${displayedQuestions.length}`);
  }, [activeQuestionIndex, activeSectionIndex, displayedQuestions.length, announce]);

  // A digit shortcut must not leak into the next question.
  useEffect(() => {
    setKeyboardSelection(null);
  }, [activeQuestionIndex, activeSectionIndex]);

  // Navigation handlers
  const handleSectionChange = (newSecIdx: number) => {
    setActiveSectionIndex(newSecIdx);
    setActiveQuestionIndex(0);
    setIsShuffled(false);
  };

  const handleSelectQuestion = (secIdx: number, qIdx: number) => {
    setActiveSectionIndex(secIdx);
    setActiveQuestionIndex(qIdx);
  };

  const hasPrev = activeQuestionIndex > 0 || activeSectionIndex > 0;
  const hasNext =
    activeQuestionIndex < displayedQuestions.length - 1 ||
    activeSectionIndex < quizModel.sections.length - 1;

  const handlePrev = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex((prev) => prev - 1);
    } else if (activeSectionIndex > 0) {
      const prevSecIdx = activeSectionIndex - 1;
      const prevSec = quizModel.sections[prevSecIdx];
      setActiveSectionIndex(prevSecIdx);
      setActiveQuestionIndex(Math.max(0, prevSec.questions.length - 1));
      setIsShuffled(false);
    }
  };

  const handleNext = () => {
    if (showResults) return;
    if (activeQuestionIndex < displayedQuestions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else if (activeSectionIndex < quizModel.sections.length - 1) {
      setActiveSectionIndex((prev) => prev + 1);
      setActiveQuestionIndex(0);
      setIsShuffled(false);
    } else {
      setShowResults(true);
    }
  };

  const isLastQuestion =
    activeSectionIndex === quizModel.sections.length - 1 &&
    activeQuestionIndex === displayedQuestions.length - 1;

  const handleAnswerQuestion = (response: unknown, isCorrect: boolean) => {
    if (!currentQuestion) return;
    setAnsweredQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        isCorrect,
        userResponse: response,
      },
    }));
    announce(isCorrect ? "Correct answer" : "Incorrect answer");
  };

  // Keyboard shortcuts: digits pick an option, arrows move between questions.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (showRetakeModal || isQuestionSheetOpen) return;
      const target = event.target as HTMLElement | null;
      const action = resolveShortcut({
        key: event.key,
        target: target
          ? {
              tagName: target.tagName,
              type: (target as HTMLInputElement).type,
              isContentEditable: target.isContentEditable,
            }
          : null,
      });
      if (!action) return;
      event.preventDefault();
      if (action.type === "select-option") {
        setKeyboardSelection((prev) => ({
          index: action.index,
          nonce: (prev?.nonce ?? 0) + 1,
        }));
      } else if (action.type === "previous-question") {
        handlePrev();
      } else {
        handleNext();
      }
    };

    // Capture phase: choice groups consume arrow keys before the bubble phase.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    showRetakeModal,
    isQuestionSheetOpen,
    showResults,
    displayedQuestions,
    activeSectionIndex,
    activeQuestionIndex,
  ]);

  // Retake logic
  const handleResetAll = () => {
    setAnsweredQuestions({});
    setActiveSectionIndex(0);
    setActiveQuestionIndex(0);
    setShowResults(false);
    setShowRetakeModal(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const handleResetSection = () => {
    setAnsweredQuestions((prev) => {
      const next = { ...prev };
      for (const q of currentSection.questions) {
        delete next[q.id];
      }
      return next;
    });
    setActiveQuestionIndex(0);
    setShowRetakeModal(false);
  };

  return (
    <GluestackThemeProvider>
      <MotionConfig reducedMotion="user">
      <LiveRegionContext.Provider value={announce}>
      <div className="mdq-shell">
      <Box
        data-testid="mdq-root"
        testID="mdq-root"
        flexDirection="row"
        gap="$6"
        h="100%"
        overflow="hidden"
        bg="$backgroundLight0"
        $dark-bg="$backgroundDark950"
      >
        {!isMobile && (
          <Sidebar
            quizTitle={quizModel.title}
            quizDescription={quizModel.description}
            sections={quizModel.sections}
            activeSectionIndex={activeSectionIndex}
            activeQuestionIndex={activeQuestionIndex}
            answeredQuestions={answeredQuestions}
            isCollapsed={isSidebarCollapsed}
            onSelect={handleSelectQuestion}
            onRetake={() => setShowRetakeModal(true)}
          />
        )}

        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          minWidth={0}
          h="100%"
          style={{ minHeight: 0 }}
          overflow="hidden"
          role="main"
        >
          <Box
            flexShrink={0}
            py="$4"
            borderBottomWidth={1}
            borderColor="$borderLight200"
            $dark-borderColor="$borderDark700"
            bg="$backgroundLight0"
            $dark-bg="$backgroundDark900"
          >
            {isMobile ? (
              <Box px="$4">
                <HStack space="sm" alignItems="center" justifyContent="space-between">
                  <Heading size="sm" numberOfLines={1} flexShrink={1}>
                    {quizModel.title}
                  </Heading>
                  <HStack space="sm" alignItems="center" flexShrink={0}>
                    <Button
                      data-testid="mdq-sheet-toggle"
                      testID="mdq-sheet-toggle"
                      variant="outline"
                      action="secondary"
                      size="sm"
                      onClick={() => setIsQuestionSheetOpen(true)}
                      onPress={() => setIsQuestionSheetOpen(true)}
                      aria-label="Questions: open the question list"
                      aria-haspopup="dialog"
                    >
                      <ButtonText>Questions</ButtonText>
                    </Button>
                    <Shuffle
                      isShuffled={isShuffled}
                      onToggle={() => {
                        setIsShuffled(!isShuffled);
                        setActiveQuestionIndex(0);
                      }}
                      noShuffle={noShuffle}
                    />
                  </HStack>
                </HStack>
                <Box mt="$3">
                  <SectionTabs
                    sections={quizModel.sections}
                    activeIndex={activeSectionIndex}
                    onSelect={handleSectionChange}
                    scrollable
                    inHeader
                  />
                </Box>
              </Box>
            ) : (
              <HStack
                style={contentColumnStyle}
                px="$8"
                justifyContent="space-between"
                alignItems="center"
              >
                <HStack space="sm" alignItems="center">
                  <Button
                    data-testid="mdq-sidebar-toggle"
                    testID="mdq-sidebar-toggle"
                    size="sm"
                    variant="outline"
                    action="secondary"
                    onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                    onPress={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                    aria-expanded={!isSidebarCollapsed}
                    aria-label={
                      isSidebarCollapsed
                        ? "Expand navigation sidebar"
                        : "Collapse navigation sidebar"
                    }
                  >
                    <ButtonText>{isSidebarCollapsed ? "Expand" : "Collapse"}</ButtonText>
                  </Button>
                  <Text size="sm" fontWeight="$semibold">{currentSection.title}</Text>
                  <Text size="sm" color="$textLight400">•</Text>
                  <Text size="sm" color="$textLight600" $dark-color="$textDark400">
                    Question {activeQuestionIndex + 1} of {displayedQuestions.length}
                  </Text>
                </HStack>

                <Shuffle
                  isShuffled={isShuffled}
                  onToggle={() => {
                    setIsShuffled(!isShuffled);
                    setActiveQuestionIndex(0);
                  }}
                  noShuffle={noShuffle}
                />
              </HStack>
            )}
          </Box>

          {/* The sheet column carries the side rules, so the header and footer
              rules stay connected to the content between them. */}
          <Box
            style={{ ...contentColumnStyle, minHeight: 0 }}
            flex={1}
            px={isMobile ? "$4" : "$8"}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderColor="$borderLight200"
            $dark-borderColor="$borderDark700"
            bg="$backgroundLight0"
            $dark-bg="$backgroundDark900"
          >
            <ScrollView flex={1} style={{ minHeight: 0 }}>
              <Box pt={isMobile ? "$6" : "$8"} pb={isMobile ? "$8" : "$24"}>
              {!isMobile && (
                <SectionTabs
                  sections={quizModel.sections}
                  activeIndex={activeSectionIndex}
                  onSelect={handleSectionChange}
                />
              )}

              {/* Enter-only animation: an AnimatePresence exit queue re-created the
                  question subtree and discarded in-progress answers. */}
              {showResults ? (
                <motion.div
                  key="results"
                  data-testid="mdq-results-body"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transitions.base}
                >
                  <Results
                    sections={quizModel.sections}
                    answeredQuestions={answeredQuestions}
                    onRetakeAll={handleResetAll}
                    onReview={() => setShowResults(false)}
                  />
                </motion.div>
              ) : currentQuestion ? (
                <motion.div
                  key={currentQuestion.id}
                  data-testid="mdq-question-body"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transitions.base}
                >
                  <Question
                    question={currentQuestion}
                    sectionTitle={quizModel.sections.length > 1 ? currentSection.title : undefined}
                    questionIndex={activeQuestionIndex}
                    totalInSection={displayedQuestions.length}
                    savedAnswer={answeredQuestions[currentQuestion.id]}
                    keyboardSelection={keyboardSelection}
                    onAnswer={handleAnswerQuestion}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={transitions.fast}
                >
                  <Text>No questions found in this section.</Text>
                </motion.div>
              )}
              </Box>
            </ScrollView>
          </Box>

          <Stepper
            current={activeQuestionIndex}
            total={displayedQuestions.length}
            hasPrev={showResults ? true : hasPrev}
            hasNext={showResults ? false : hasNext || isLastQuestion}
            nextLabel={isLastQuestion && !showResults ? "Finish" : "Next"}
            counterLabel={showResults ? "Results" : undefined}
            onPrev={showResults ? () => setShowResults(false) : handlePrev}
            onNext={handleNext}
            isMobile={isMobile}
          />
        </Box>

        <AnimatePresence>
          {showRetakeModal && (
            <motion.div
              key="retake-modal"
              data-testid="mdq-retake-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitions.fast}
              onClick={() => setShowRetakeModal(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                background: MODAL_SCRIM,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={transitions.base}
                onClick={(event) => event.stopPropagation()}
                style={{ width: "100%", maxWidth: 440 }}
              >
                <Card variant="elevated" p="$6">
                  <Heading size="md" mb="$2">Retake Quiz</Heading>
                  <Text mb="$4">Would you like to reset your progress for the current section or the entire quiz?</Text>
                  <HStack space="md" justifyContent="flex-end">
                    <Button
                      size="md"
                      variant="link"
                      action="secondary"
                      onClick={() => setShowRetakeModal(false)}
                      onPress={() => setShowRetakeModal(false)}
                    >
                      <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                      size="md"
                      variant="outline"
                      action="secondary"
                      onClick={handleResetSection}
                      onPress={handleResetSection}
                    >
                      <ButtonText>Reset Section</ButtonText>
                    </Button>
                    <Button
                      size="md"
                      variant="solid"
                      action="negative"
                      onClick={handleResetAll}
                      onPress={handleResetAll}
                    >
                      <ButtonText>Reset All</ButtonText>
                    </Button>
                  </HStack>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMobile && (
          <QuestionSheet
            isOpen={isQuestionSheetOpen}
            onClose={() => setIsQuestionSheetOpen(false)}
            sections={quizModel.sections}
            activeSectionIndex={activeSectionIndex}
            activeQuestionIndex={activeQuestionIndex}
            answeredQuestions={answeredQuestions}
            onSelect={handleSelectQuestion}
            onRetake={() => {
              setIsQuestionSheetOpen(false);
              setShowRetakeModal(true);
            }}
          />
        )}

        <div
          className="mdq-visually-hidden"
          role="status"
          aria-live="polite"
          data-testid="mdq-live-region"
        >
          {liveMessage}
        </div>
      </Box>

        <PrintView
          title={quizModel.title}
          description={quizModel.description}
          sections={quizModel.sections}
        />
      </div>
      </LiveRegionContext.Provider>
      </MotionConfig>
    </GluestackThemeProvider>
  );
};

export default App;
