import React from "react";
import { Progress as GProgress, ProgressFilledTrack } from "@gluestack-ui/themed";

export interface SectionProgressData {
  id: string;
  title: string;
  total: number;
  correct: number;
}

export interface ProgressProps {
  answered?: number;
  correct?: number;
  total: number;
  label?: string;
  sections?: SectionProgressData[];
}

export const Progress: React.FC<ProgressProps> = ({
  answered = 0,
  correct,
  total,
  label = "Overall Progress",
  sections,
}) => {
  const currentCount = correct !== undefined ? correct : answered;
  const pct = total > 0 ? Math.min(100, Math.round((currentCount / total) * 100)) : 0;

  return (
    <div className="mdq-progress-container">
      <div className="mdq-progress-label">
        <span>{label}</span>
        <span>
          {currentCount} / {total} ({pct}%)
        </span>
      </div>
      <GProgress
        value={pct}
        className="mdq-progress-bar-track"
      >
        <ProgressFilledTrack
          className="mdq-progress-bar-fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </GProgress>

      {sections && sections.length > 1 && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sections.map((sec) => {
            const secPct = sec.total > 0 ? Math.round((sec.correct / sec.total) * 100) : 0;
            return (
              <div key={sec.id} style={{ fontSize: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-muted)", marginBottom: "2px" }}>
                  <span>{sec.title}</span>
                  <span>{sec.correct}/{sec.total}</span>
                </div>
                <GProgress
                  value={secPct}
                  className="mdq-progress-bar-track"
                  style={{ height: "4px" }}
                >
                  <ProgressFilledTrack
                    className="mdq-progress-bar-fill"
                    style={{ width: `${secPct}%` }}
                    role="progressbar"
                    aria-valuenow={secPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </GProgress>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Progress;
