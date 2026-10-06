import React, { useEffect, useMemo, useState } from "react";
import { QuizModel, Section, Question as QuestionData } from "../parse/schema.js";
import { GluestackThemeProvider } from "./Provider.js";
import { Sidebar } from "./Sidebar.js";
import { SectionTabs } from "./SectionTabs.js";
import { Question } from "./Question.js";
import { Stepper } from "./Stepper.js";
import { Shuffle } from "./Shuffle.js";

export interface AppProps {
  model?: QuizModel;
  quiz?: QuizModel;
  noShuffle?: boolean;
}

interface SavedState {
  activeSectionIndex: number;
  activeQuestionIndex: number;
  answeredQuestions: Record<string, {
    isCorrect: boolean;
    userResponse: unknown;
  }>;
}

export const App: React.FC<AppProps> = ({ model, quiz, noShuffle = false }) => {
  const quizModel = model || quiz;

  if (!quizModel || !quizModel.sections || quizModel.sections.length === 0) {
    return (
      <div data-testid="mdq-root" className="mdq-root" style={{ padding: "2rem" }}>
        <p>No quiz content available.</p>
      </div>
    );
  }

  const storageKey = `mdq-progress-${quizModel.contentHash}`;

  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<string, { isCorrect: boolean; userResponse: unknown }>
  >({});
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showRetakeModal, setShowRetakeModal] = useState<boolean>(false);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);

  // Restore saved state on mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved: SavedState = JSON.parse(savedRaw);
        if (
          typeof saved.activeSectionIndex === "number" &&
          saved.activeSectionIndex >= 0 &&
          saved.activeSectionIndex < quizModel.sections.length
        ) {
          setActiveSectionIndex(saved.activeSectionIndex);
          const sec = quizModel.sections[saved.activeSectionIndex];
          if (
            typeof saved.activeQuestionIndex === "number" &&
            saved.activeQuestionIndex >= 0 &&
            saved.activeQuestionIndex < sec.questions.length
          ) {
            setActiveQuestionIndex(saved.activeQuestionIndex);
          }
        }
        if (saved.answeredQuestions && typeof saved.answeredQuestions === "object") {
          setAnsweredQuestions(saved.answeredQuestions);
        }
      }
    } catch {
      // Storage unavailable or corrupted
    }
  }, [storageKey, quizModel.sections]);

  // Persist state changes
  useEffect(() => {
    try {
      const stateToSave: SavedState = {
        activeSectionIndex,
        activeQuestionIndex,
        answeredQuestions,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch {
      // Storage unavailable
    }
  }, [storageKey, activeSectionIndex, activeQuestionIndex, answeredQuestions]);

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
    if (activeQuestionIndex < displayedQuestions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else if (activeSectionIndex < quizModel.sections.length - 1) {
      setActiveSectionIndex((prev) => prev + 1);
      setActiveQuestionIndex(0);
      setIsShuffled(false);
    }
  };

  const handleAnswerQuestion = (response: unknown, isCorrect: boolean) => {
    if (!currentQuestion) return;
    setAnsweredQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        isCorrect,
        userResponse: response,
      },
    }));
  };

  // Retake logic
  const handleResetAll = () => {
    setAnsweredQuestions({});
    setActiveSectionIndex(0);
    setActiveQuestionIndex(0);
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
      <div data-testid="mdq-root" className="mdq-root">
        <Sidebar
          quizTitle={quizModel.title}
          quizDescription={quizModel.description}
          sections={quizModel.sections}
          activeSectionIndex={activeSectionIndex}
          activeQuestionIndex={activeQuestionIndex}
          answeredQuestions={answeredQuestions}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSelect={handleSelectQuestion}
          onRetake={() => setShowRetakeModal(true)}
        />

        <main className="mdq-main">
          <div className="mdq-top-bar">
            <div className="mdq-top-bar-left">
              <button
                type="button"
                className="mdq-menu-toggle"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open navigation menu"
              >
                ☰
              </button>
              <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>
                {quizModel.title}
              </span>
            </div>

            <div className="mdq-top-bar-right">
              <Shuffle
                isShuffled={isShuffled}
                onToggle={() => {
                  setIsShuffled(!isShuffled);
                  setActiveQuestionIndex(0);
                }}
                noShuffle={noShuffle}
              />
            </div>
          </div>

          <div className="mdq-content-container">
            <SectionTabs
              sections={quizModel.sections}
              activeIndex={activeSectionIndex}
              onSelect={handleSectionChange}
            />

            {currentQuestion ? (
              <Question
                key={currentQuestion.id}
                question={currentQuestion}
                sectionTitle={quizModel.sections.length > 1 ? currentSection.title : undefined}
                questionIndex={activeQuestionIndex}
                totalInSection={displayedQuestions.length}
                savedAnswer={answeredQuestions[currentQuestion.id]}
                onAnswer={handleAnswerQuestion}
              />
            ) : (
              <p>No questions found in this section.</p>
            )}
          </div>

          <Stepper
            current={activeQuestionIndex}
            total={displayedQuestions.length}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </main>

        {showRetakeModal && (
          <div className="mdq-modal-backdrop" onClick={() => setShowRetakeModal(false)}>
            <div className="mdq-modal" onClick={(e) => e.stopPropagation()}>
              <h4>Retake Quiz</h4>
              <p>Would you like to reset your progress for the current section or the entire quiz?</p>
              <div className="mdq-modal-actions">
                <button
                  type="button"
                  className="mdq-btn mdq-btn-ghost"
                  onClick={() => setShowRetakeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="mdq-btn mdq-btn-secondary"
                  onClick={handleResetSection}
                >
                  Reset Section
                </button>
                <button
                  type="button"
                  className="mdq-btn mdq-btn-primary"
                  onClick={handleResetAll}
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GluestackThemeProvider>
  );
};

export default App;
