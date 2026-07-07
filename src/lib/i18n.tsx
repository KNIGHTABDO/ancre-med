"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { JSX } from "react";

export type Lang = "fr" | "en";

const STORAGE_KEY = "ancremed.lang";

interface LangContextValue {
  readonly lang: Lang;
  readonly setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "fr",
  setLang: () => undefined,
});

export function LanguageProvider({ children }: { children: ReactNode }): JSX.Element {
  // Always render "fr" first (matches SSR output), then hydrate the saved choice.
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "fr") setLangState(saved);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang): void => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — selection lasts for the session */
    }
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

/** Pick the value for the active language: tr(lang, fr, en). */
export function tr<T>(lang: Lang, fr: T, en: T): T {
  return lang === "fr" ? fr : en;
}
