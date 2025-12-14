import { en } from "./en";
import { tr } from "./tr";

const translations: Record<string, Record<string, string>> = {
  en,
  tr,
};

let currentLocale = "en";

export function setLocale(locale: string) {
  currentLocale = locale;
}

export function getLocale(): string {
  return currentLocale;
}

export function t(key: string): string {
  const keys = key.split(".");
  let value: any = translations[currentLocale];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}

