export function formatDate(dateString: string, locale: string = "en-US"): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    const yesterdayText = locale === "tr" ? "Dün, " : "Yesterday, ";
    return yesterdayText + date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  } else {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }) + ", " + date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  }
}

import { t } from "../localization";

export function formatDuration(start: string, end: string | null): string {
  if (!end) return t("common.ongoing");
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diff = Math.floor((endTime - startTime) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) {
    return `${hours}${t("common.hourShort")} ${minutes}${t("common.minuteShort")}`;
  }
  return `${minutes}${t("common.minuteShort")}`;
}
