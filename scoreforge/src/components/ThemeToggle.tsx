"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      title={isLight ? "Dark Mode" : "Light Mode"}
      aria-label={isLight ? "Dark Mode aktivieren" : "Light Mode aktivieren"}
      className="flex justify-center items-center bg-(--sf-surface) border border-(--sf-text)/15 rounded-md w-8 h-8 text-base"
      type="button"
    >
      <span aria-hidden="true">{isLight ? "🌙" : "☀️"}</span>
    </button>
  );
}
