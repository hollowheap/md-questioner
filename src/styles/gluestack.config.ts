import { createConfig } from "@gluestack-style/react";
import { config as defaultConfig } from "@gluestack-ui/config";

export const gluestackCustomConfig = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Steep theme overrides on Gluestack standard palette
      primary500: "#5d2a1a",
      primary600: "#4d2215",
      primary700: "#3d1b11",
      primary400: "#753521",
      primary300: "#984e36",
      primary200: "#d49a84",
      primary100: "#fbe1d1",
      primary50: "#fff5ee",
      primary0: "#ffffff",

      backgroundLight0: "#ffffff",
      backgroundLight50: "#fafafb",
      backgroundLight100: "#f2f2f3",
      backgroundLight200: "#e6e6e8",
      backgroundLight300: "#dcdce0",

      backgroundDark950: "#14181a",
      backgroundDark900: "#1b2024",
      backgroundDark800: "#232a2e",
      backgroundDark700: "#2e353a",

      textLight950: "#17191c",
      textLight900: "#17191c",
      textLight800: "#2a2c30",
      textLight700: "#4b4e57",
      textLight600: "#5f636e",
      textLight500: "#777b86",
      textLight400: "#979799",
      textLight300: "#a3a6af",

      textDark50: "#e8e6e1",
      textDark100: "#e8e6e1",
      textDark200: "#d4d0c8",
      textDark300: "#bcb6ac",
      textDark400: "#a8a29a",
      textDark500: "#8a847c",
      textDark600: "#6f6a63",

      borderLight100: "#f2f2f3",
      borderLight200: "#e2e2e6",
      borderLight300: "#d1d1d6",
      borderLight400: "#a3a6af",
      borderLight500: "#979799",

      borderDark700: "#2e353a",
      borderDark800: "#2e353a",
      borderDark900: "#232a2e",

      // Custom steep semantic tokens
      inkBlack: "#17191c",
      paperWhite: "#ffffff",
      mistGray: "#f2f2f3",
      fogWhite: "#fafafb",
      slateGray: "#777b86",
      ashGray: "#979799",
      smokeGray: "#a3a6af",
      blushPeach: "#fbe1d1",
      siennaBrown: "#5d2a1a",
      dmSurface0: "#14181a",
      dmSurface1: "#1b2024",
      dmSurface2: "#232a2e",
      dmTextHi: "#e8e6e1",
      dmTextMid: "#a8a29a",
      dmTextLo: "#6f6a63",
      dmAccent: "#7fb88a",
      dmAccentSoft: "#2a3a30",
      dmAccentInk: "#101613",
      dmBorder: "#2e353a",
    },
    fonts: {
      ...defaultConfig.tokens.fonts,
      heading: '"Iowan Old Style", "Charter", "Source Serif 4", Georgia, serif',
      body: '"Iowan Old Style", "Charter", "Source Serif 4", Georgia, serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
  },
});

export default gluestackCustomConfig;
