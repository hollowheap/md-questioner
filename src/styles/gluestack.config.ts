import { createConfig } from "@gluestack-style/react";
import { config as defaultConfig } from "@gluestack-ui/config";

const commonSpace = {
  ...defaultConfig.tokens.space,
  "4": 4,
  "8": 8,
  "12": 12,
  "16": 16,
  "20": 20,
  "24": 24,
  "28": 28,
  "32": 32,
  "40": 40,
  "64": 64,
  "80": 80,
  "96": 96,
  "124": 124,
  "128": 128,
  "160": 160,
  unit: 4,
};

const commonRadii = {
  ...defaultConfig.tokens.radii,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "2xl-2": 24,
  "3xl": 28,
  full: 9999,
};

const commonComponents = {
  ...defaultConfig.components,
  Button: {
    ...defaultConfig.components.Button,
    theme: {
      ...defaultConfig.components.Button.theme,
      borderRadius: "$2xl",
    },
  },
  Card: {
    ...defaultConfig.components.Card,
    theme: {
      ...defaultConfig.components.Card.theme,
      variants: {
        ...defaultConfig.components.Card.theme.variants,
        size: {
          ...defaultConfig.components.Card.theme.variants.size,
          lg: {
            p: "$8",
            borderRadius: "$3xl",
          },
        },
      },
    },
  },
};

const commonFonts = {
  ...defaultConfig.tokens.fonts,
  heading: '"Signifier", "Iowan Old Style", "Charter", "Source Serif 4", Georgia, serif',
  body: '"Signifier", "Iowan Old Style", "Charter", "Source Serif 4", Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const commonFontSizes = {
  ...defaultConfig.tokens.fontSizes,
  sm: 14,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 26,
  "4xl": 44,
  "5xl": 64,
};

const commonFontWeights = {
  ...defaultConfig.tokens.fontWeights,
  "400": "400",
  "430": "430",
  "450": "450",
  "480": "480",
  "500": "500",
  semibold: "600",
};

const commonLineHeights = {
  ...defaultConfig.tokens.lineHeights,
  sm: 20,
  base: 22.5,
  lg: 21.25,
  xl: 27,
  "2xl": 30.7,
  "4xl": 57.2,
  "5xl": 83.2,
};

const commonShadows = {
  subtle: "oklab(0 0 0 / 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08) 0px 4px 24px 0px",
  "subtle-2": "oklab(0 0 0 / 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 8px 40px 0px",
  "subtle-3": "rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px",
};

const commonGlobalStyle = {
  ...defaultConfig.globalStyle,
  body: {
    fontFamily: "$body",
    color: "$textLight900",
    backgroundColor: "$backgroundLight0",
    _dark: {
      color: "$textDark50",
      backgroundColor: "$backgroundDark950",
    },
  },
};

export const gluestackLightConfig = createConfig({
  ...defaultConfig,
  components: commonComponents,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Steep light theme overrides on Gluestack standard palette
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
      borderLight200: "#e1e2e5",
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

      // Surface tokens
      surfaceCanvas: "#ffffff",
      surfaceCardMist: "#f2f2f3",
      surfaceSectionFog: "#fafafb",
      surfaceAccentBlush: "#fbe1d1",
      surfaceElevatedWhite: "#ffffff",
    },
    space: commonSpace,
    radii: commonRadii,
    fonts: commonFonts,
    fontSizes: commonFontSizes,
    fontWeights: commonFontWeights,
    lineHeights: commonLineHeights,
    shadows: commonShadows,
  },
  globalStyle: commonGlobalStyle,
});

export const gluestackDarkConfig = createConfig({
  ...defaultConfig,
  components: commonComponents,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // AA warm green palette for dark mode
      primary500: "#7fb88a",
      primary400: "#7fb88a",
      primary600: "#6fa679",
      primary700: "#5e8e67",
      primary300: "#9ecfa7",
      primary200: "#bde5c4",
      primary100: "#2a3a30",
      primary50: "#1c2b20",
      primary0: "#101613",

      backgroundLight0: "#14181a",
      backgroundLight50: "#1b2024",
      backgroundLight100: "#232a2e",
      backgroundLight200: "#2e353a",
      backgroundLight300: "#2e353a",

      backgroundDark950: "#14181a",
      backgroundDark900: "#1b2024",
      backgroundDark800: "#232a2e",
      backgroundDark700: "#2e353a",

      textLight950: "#e8e6e1",
      textLight900: "#e8e6e1",
      textLight800: "#d4d0c8",
      textLight700: "#bcb6ac",
      textLight600: "#a8a29a",
      textLight500: "#a8a29a",
      textLight400: "#8a847c",
      textLight300: "#6f6a63",

      textDark50: "#e8e6e1",
      textDark100: "#e8e6e1",
      textDark200: "#d4d0c8",
      textDark300: "#bcb6ac",
      textDark400: "#a8a29a",
      textDark500: "#8a847c",
      textDark600: "#6f6a63",

      borderLight100: "#232a2e",
      borderLight200: "#2e353a",
      borderLight300: "#2e353a",
      borderLight400: "#2e353a",
      borderLight500: "#2e353a",

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

      // Surface tokens
      surfaceCanvas: "#14181a",
      surfaceCardMist: "#1b2024",
      surfaceSectionFog: "#232a2e",
      surfaceAccentBlush: "#2a3a30",
      surfaceElevatedWhite: "#1b2024",
    },
    space: commonSpace,
    radii: commonRadii,
    fonts: commonFonts,
    fontSizes: commonFontSizes,
    fontWeights: commonFontWeights,
    lineHeights: commonLineHeights,
    shadows: commonShadows,
  },
  globalStyle: commonGlobalStyle,
});

export const gluestackCustomConfig = gluestackLightConfig;
export default gluestackCustomConfig;
