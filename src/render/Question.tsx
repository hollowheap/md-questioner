import React from "react";
import { Question as QuestionData } from "../parse/schema.js";
import { Hint } from "./Hint.js";
import { MultiChoice } from "./question-types/MultiChoice.js";
import { MultiSelect } from "./question-types/MultiSelect.js";
import { TrueFalse } from "./question-types/TrueFalse.js";
import { MatchPairs } from "./question-types/MatchPairs.js";
import { ShortAnswer } from "./question-types/ShortAnswer.js";
import { Reflection } from "./question-types/Reflection.js";

export interface QuestionProps {
  question: QuestionData;
  sectionTitle?: string;
  questionIndex?: number;
  totalInSection?: number;
  savedAnswer?: {
    isCorrect: boolean;
    userResponse: unknown;
  };
  onAnswer?: (response: unknown, isCorrect: boolean) => void;
}

export const Question: React.FC<QuestionProps> = ({
  question,
  sectionTitle,
  questionIndex = 0,
  totalInSection = 1,
  savedAnswer,
  onAnswer,
}) => {
  const handleAnswer = (response: unknown, isCorrect: boolean) => {
    onAnswer?.(response, isCorrect);
  };

  const renderQuestionBody = () => {
    switch (question.type) {
      case "multi-choice":
        return (
          <MultiChoice
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
      case "multi-select":
        return (
          <MultiSelect
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
      case "true-false":
        return (
          <TrueFalse
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
      case "match-pairs":
        return (
          <MatchPairs
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
      case "short-answer":
        return (
          <ShortAnswer
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
      case "reflection":
      default:
        return (
          <Reflection
            question={question}
            savedAnswer={savedAnswer}
            onAnswer={handleAnswer}
          />
        );
    }
  };

  return (
    <article className="mdq-card mdq-question" data-question-id={question.id}>
      <header className="mdq-question-header">
        <span className="mdq-question-meta">
          {sectionTitle ? `${sectionTitle} • ` : ""}Question {questionIndex + 1} of {totalInSection}
        </span>
      </header>

      <h3 className="mdq-question-title">{question.title}</h3>

      {question.promptHtml && (
        <div
          className="mdq-prompt"
          dangerouslySetInnerHTML={{ __html: question.promptHtml }}
        />
      )}

      {question.hint && <Hint hint={question.hint} />}

      <div className="mdq-interaction-container">
        {renderQuestionBody()}
      </div>
    </article>
  );
};

export default Question;
