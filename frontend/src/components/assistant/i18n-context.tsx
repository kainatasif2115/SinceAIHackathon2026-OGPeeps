"use client";

import { createContext, use } from "react";
import { getDictionary, type Dictionary } from "@/lib/i18n";

export const I18nContext = createContext<Dictionary>(getDictionary("en"));

/** The UI strings for the currently selected language. */
export function useT(): Dictionary {
  return use(I18nContext);
}
