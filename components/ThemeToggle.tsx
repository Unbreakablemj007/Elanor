"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";
import { t } from "@/lib/strings";

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  // Browser chrome (status bar) colour: match a manual choice, or restore the
  // per-media defaults for "Automatic".
  const bg = getComputedStyle(root).getPropertyValue("--color-bg").trim();
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.dataset.original ??= m.content;
    m.content = choice === "system" ? m.dataset.original : bg;
  });
}

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    setChoice(readChoice());
  }, []);

  function select(next: ThemeChoice) {
    setChoice(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice still applies until reload.
    }
    applyTheme(next);
  }

  const options: [ThemeChoice, string][] = [
    ["light", t.theme.light],
    ["dark", t.theme.dark],
    ["system", t.theme.system],
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t.theme.title}
      className={`grid grid-cols-3 rounded-xl border border-line bg-surface p-1 ${compact ? "text-xs" : "text-sm"}`}
    >
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          onClick={() => select(value)}
          className={`rounded-lg font-medium transition ${compact ? "min-h-8 px-1" : "min-h-10 px-2"} ${
            choice === value ? "bg-accent-strong text-on-accent" : "text-muted"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
