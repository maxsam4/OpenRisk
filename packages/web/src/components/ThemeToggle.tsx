"use client";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="icon-btn" title="Toggle theme" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}
