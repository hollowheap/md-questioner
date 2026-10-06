import React from "react";
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
        return "☀️ Light";
      case "dark":
        return "🌙 Dark";
      case "auto":
      default:
        return "💻 Auto";
    }
  };

  return (
    <button
      type="button"
      className="mdq-btn mdq-btn-secondary mdq-theme-toggle"
      onClick={handleCycle}
      aria-label={`Toggle theme (current: ${theme})`}
      title="Switch between Light, Dark, and System Auto theme"
      style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", minHeight: "38px" }}
    >
      {getLabel()}
    </button>
  );
};

export default ThemeToggle;
