import React from "react";
import { Button, ButtonText, ButtonIcon, SunIcon, MoonIcon } from "@gluestack-ui/themed";
import { useTheme } from "./Provider.js";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleCycle = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("auto");
    } else {
      setTheme("light");
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
    <Button
      data-testid="mdq-theme-toggle"
      testID="mdq-theme-toggle"
      size="sm"
      variant="outline"
      action="secondary"
      onClick={handleCycle}
      onPress={handleCycle}
      aria-label={`Toggle theme (current: ${theme})`}
      title="Switch between Light, Dark, and System Auto theme"
    >
      <ButtonIcon as={theme === "dark" ? MoonIcon : SunIcon} mr="$1.5" />
      <ButtonText>{getLabel()}</ButtonText>
    </Button>
  );
};

export default ThemeToggle;
