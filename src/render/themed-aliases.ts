import React from "react";
import { Button, InputField, TextareaInput } from "@gluestack-ui/themed";

/**
 * Gluestack's typed props omit a handful of DOM attributes that
 * react-native-web still forwards to the underlying element. These aliases
 * re-admit them so the attribute can stay in the JSX without a cast.
 */
type ButtonExtras = {
  type?: "button" | "submit" | "reset";
  title?: string;
  "aria-selected"?: boolean;
  "aria-pressed"?: boolean;
};

type TextareaInputExtras = {
  disabled?: boolean;
};

type ButtonWithExtras = React.ComponentProps<typeof Button> & ButtonExtras;
type TextareaInputWithExtras = React.ComponentProps<typeof TextareaInput> & TextareaInputExtras;

export const ButtonEx = Button as React.ComponentType<ButtonWithExtras>;
export const TextareaInputEx = TextareaInput as React.ComponentType<TextareaInputWithExtras>;

// Same omission for the text input's inner field.
type InputFieldWithExtras = React.ComponentProps<typeof InputField> & { disabled?: boolean };
export const InputFieldEx = InputField as React.ComponentType<InputFieldWithExtras>;
