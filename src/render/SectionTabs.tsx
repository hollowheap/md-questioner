import React from "react";
import { Section } from "../parse/schema.js";

export interface SectionTabsProps {
  sections: Section[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({
  sections,
  activeIndex,
  onSelect,
}) => {
  if (!sections || sections.length <= 1) {
    return null;
  }

  return (
    <nav className="mdq-section-tabs" aria-label="Sections">
      {sections.map((section, idx) => {
        const isActive = idx === activeIndex;
        return (
          <button
            key={section.id}
            type="button"
            className={`mdq-tab ${isActive ? "active" : ""}`}
            onClick={() => onSelect(idx)}
            aria-selected={isActive}
            role="tab"
          >
            {section.title}
          </button>
        );
      })}
    </nav>
  );
};

export default SectionTabs;
