import { createConfig } from "@gluestack-style/react";
import { config as defaultConfig } from "@gluestack-ui/config";

const commonRadii = {
  ...defaultConfig.tokens.radii,
  none: 0,
  xs: 2,
  sm: 6,
  md: 6,
  lg: 8,
  xl: 8,
  "2xl": 8,
  "2xl-2": 8,
  "3xl": 8,
  full: 9999,
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

export const componentsConfig = {
  ...defaultConfig.components,
  Button: {
    ...defaultConfig.components.Button,
    theme: {
      ...defaultConfig.components.Button.theme,
      borderRadius: "$md",
      variants: {
        ...defaultConfig.components.Button.theme.variants,
        action: {
          ...defaultConfig.components.Button.theme.variants.action,
          primary: {
            ...defaultConfig.components.Button.theme.variants.action.primary,
            bg: "$primary500",
            borderColor: "$primary300",
            _text: {
              color: "$textLight0",
            },
            _dark: {
              bg: "$primary400",
              borderColor: "$primary400",
              _text: {
                color: "$textDark0",
              },
              ":hover": {
                bg: "$primary300",
              },
            },
          },
        },
      },
    },
  },
};

export const gluestackUIConfig = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Steep light theme overrides on Gluestack standard palette
      primary500: "#5d2a1a",
      primary600: "#4d2215",
      primary700: "#3d1b11",
      primary400: "#7fb88a",
      primary300: "#984e36",
      primary200: "#d49a84",
      primary100: "#fbe1d1",
      primary50: "#fff5ee",
      primary0: "#ffffff",

      dmAccent: "#7fb88a",
      dmAccentSoft: "#2a3a30",
      dmAccentInk: "#101613",

      textLight0: "#ffffff",
      textDark0: "#101613",

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
      dmBorder: "#2e353a",

      // Surface tokens
      surfaceCanvas: "#ffffff",
      surfaceCardMist: "#f2f2f3",
      surfaceSectionFog: "#fafafb",
      surfaceAccentBlush: "#fbe1d1",
      surfaceElevatedWhite: "#ffffff",
    },
    space: defaultConfig.tokens.space,
    radii: commonRadii,
    fonts: commonFonts,
    fontSizes: commonFontSizes,
    fontWeights: commonFontWeights,
    lineHeights: commonLineHeights,
    shadows: commonShadows,
  },
  components: componentsConfig,
  globalStyle: commonGlobalStyle,
});

export const gluestackLightConfig = gluestackUIConfig;
export const gluestackDarkConfig = gluestackUIConfig;
export const gluestackCustomConfig = gluestackUIConfig;
export default gluestackUIConfig;

