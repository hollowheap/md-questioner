import React from "react";
import { Box, Text, Button, ButtonText, HStack } from "@gluestack-ui/themed";
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
    <Box role="navigation" aria-label="Sections">
      <HStack space="sm" mb="$6" role="tablist">
        {sections.map((section, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Button
              key={section.id}
              type="button"
              variant={isActive ? "solid" : "outline"}
              action={isActive ? "primary" : "secondary"}
              onClick={() => onSelect(idx)}
              onPress={() => onSelect(idx)}
              aria-selected={isActive}
              role="tab"
            >
              <ButtonText>{section.title}</ButtonText>
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
};

export default SectionTabs;
