import React from "react";
import { ButtonText } from "@gluestack-ui/themed";
import { ButtonEx } from "./themed-aliases.js";
import { useTheme } from "./Provider.js";

export const ThemeToggle: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleCycle = () => {
    if (theme === "auto") {
      setTheme(resolvedTheme === "light" ? "dark" : "light");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "auto":
      default:
        return "Auto";
    }
  };

  return (
    <ButtonEx
      data-testid="mdq-theme-toggle"
      testID="mdq-theme-toggle"
      size="sm"
      variant="outline"
      action="secondary"
      onClick={handleCycle}
      onPress={handleCycle}
      aria-label={`${getLabel()}: toggle theme`}
      title="Switch between Light, Dark, and System Auto theme"
    >
      <ButtonText>{getLabel()}</ButtonText>
    </ButtonEx>
  );
};

export default ThemeToggle;
