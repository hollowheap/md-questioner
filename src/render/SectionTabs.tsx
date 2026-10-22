import React from "react";
import { Box, Text, ButtonText, HStack } from "@gluestack-ui/themed";
import { ButtonEx } from "./themed-aliases.js";
import { Section } from "../parse/schema.js";

export interface SectionTabsProps {
  sections: Section[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Renders the tabs in a horizontally scrollable strip (header variant). */
  scrollable?: boolean;
  /** Compact spacing for the header variant. */
  inHeader?: boolean;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({
  sections,
  activeIndex,
  onSelect,
  scrollable = false,
  inHeader = false,
}) => {
  if (!sections || sections.length <= 1) {
    return null;
  }

  const buttons = sections.map((section, idx) => {
    const isActive = idx === activeIndex;
    return (
      // The key forces a remount: Gluestack caches action/variant styles per
      // instance and does not re-resolve them when those props change.
      <Box key={`${section.id}-${isActive ? "active" : "idle"}`} flexShrink={0}>
        <ButtonEx
          size={inHeader ? "sm" : "md"}
          variant={isActive ? "solid" : "outline"}
          action={isActive ? "primary" : "secondary"}
          onClick={() => onSelect(idx)}
          onPress={() => onSelect(idx)}
          aria-selected={isActive}
          role="tab"
        >
          <ButtonText>{section.title}</ButtonText>
        </ButtonEx>
      </Box>
    );
  });

  if (scrollable) {
    return (
      <Box flex={1} minWidth={0} role="navigation" aria-label="Sections">
        <div
          role="tablist"
          style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}
        >
          {buttons}
        </div>
      </Box>
    );
  }

  return (
    <Box role="navigation" aria-label="Sections">
      <HStack space="md" mb="$8" role="tablist">
        {buttons}
      </HStack>
    </Box>
  );
};

export default SectionTabs;
