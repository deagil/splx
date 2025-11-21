"use client";

import { useEffect, useState } from "react";

export type ColorTheme = "default" | "slate" | "blue" | "violet" | "green" | "rose";

const STORAGE_KEY = "splx-color-theme";

export function useColorTheme() {
  const [theme, setTheme] = useState<ColorTheme>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Read from localStorage
    const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme;
    if (stored && isValidTheme(stored)) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  const changeTheme = (newTheme: ColorTheme) => {
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  };

  return { theme, setTheme: changeTheme, mounted };
}

function isValidTheme(value: string): value is ColorTheme {
  return ["default", "slate", "blue", "violet", "green", "rose"].includes(value);
}

function applyTheme(theme: ColorTheme) {
  const root = document.documentElement;

  // Remove all theme attributes
  root.removeAttribute("data-theme");

  // Apply new theme if not default
  if (theme !== "default") {
    root.setAttribute("data-theme", theme);
  }
}
