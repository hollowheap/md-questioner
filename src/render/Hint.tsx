import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionTitleText,
  AccordionIcon,
  AccordionContent,
  AccordionContentText,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@gluestack-ui/themed";

export interface HintProps {
  hint?: string;
}

export const Hint: React.FC<HintProps> = ({ hint }) => {
  if (!hint) {
    return null;
  }

  return (
    <Accordion width="100%" size="sm" variant="unfilled" type="multiple" mb="$5">
      <AccordionItem value="hint">
        <AccordionHeader>
          <AccordionTrigger>
            {({ isExpanded }: { isExpanded: boolean }) => (
              <>
                <AccordionTitleText size="sm" fontWeight="$medium">
                  Hint: {isExpanded ? "Hide" : "Show"}
                </AccordionTitleText>
                <AccordionIcon as={isExpanded ? ChevronUpIcon : ChevronDownIcon} ml="$2" />
              </>
            )}
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent pt="$2" pb="$1">
          <AccordionContentText size="sm">{hint}</AccordionContentText>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Hint;
