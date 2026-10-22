import type { Transition } from "motion/react";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const transitions = {
  fast: { duration: 0.14, ease: EASE_OUT },
  base: { duration: 0.22, ease: EASE_OUT },
  drawer: { type: "spring", stiffness: 380, damping: 38, mass: 0.9 },
} satisfies Record<string, Transition>;
