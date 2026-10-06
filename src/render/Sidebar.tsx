import React from "react";
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
      <div
        className={`mdq-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`mdq-sidebar ${isOpen ? "open" : ""}`} aria-label="Quiz Navigation">
        <div className="mdq-sidebar-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h2 className="mdq-sidebar-title">{quizTitle}</h2>
            {isOpen && (
              <button
                type="button"
                className="mdq-btn mdq-btn-ghost"
                onClick={onClose}
                aria-label="Close navigation drawer"
                style={{ padding: "0.25rem 0.5rem", minHeight: "36px", minWidth: "36px" }}
              >
                ✕
              </button>
            )}
          </div>
          {quizDescription && <p className="mdq-sidebar-desc">{quizDescription}</p>}
        </div>

        <nav className="mdq-sidebar-sections">
          {sections.map((section, sIdx) => {
            const secProgress = sectionProgressList[sIdx];
            return (
              <div key={section.id} className="mdq-sidebar-section">
                <div className="mdq-sidebar-section-header">
                  <span>{section.title}</span>
                  <span>
                    {secProgress.correct} / {secProgress.total}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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
                      <button
                        key={question.id}
                        type="button"
                        className={`mdq-sidebar-question-link ${isActive ? "active" : ""}`}
                        onClick={() => {
                          onSelect(sIdx, qIdx);
                          onClose();
                        }}
                      >
                        <span className={`mdq-status-icon ${statusClass}`}>{statusIcon}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {qIdx + 1}. {question.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mdq-sidebar-footer">
          <Progress
            total={totalQuestions}
            correct={totalCorrect}
            label="Overall Score"
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              className="mdq-btn mdq-btn-secondary"
              onClick={onRetake}
              style={{ flex: 1, fontSize: "0.85rem", minHeight: "38px" }}
            >
              🔄 Retake
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
