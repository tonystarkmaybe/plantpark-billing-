/**
 * Date/time helpers for the Sales tab. Everything is presented in the shop
 * timezone (Asia/Kolkata) so "today" and timestamps match the backend, which
 * computes day boundaries in IST.
 */

const SHOP_TZ = "Asia/Kolkata";

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: SHOP_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: SHOP_TZ,
  day: "numeric",
  month: "short",
});

const fullFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: SHOP_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: SHOP_TZ,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function formatFullDate(iso: string): string {
  return fullFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

/** Today's date in the shop timezone, as YYYY-MM-DD (for the date <input> + API). */
export function todayISO(): string {
  // en-CA yields YYYY-MM-DD; apply the shop tz so the "day" is the shop's day.
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ }).format(new Date());
}

/** The shop-timezone calendar day (YYYY-MM-DD) of an arbitrary instant. */
export function isoDayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ }).format(new Date(iso));
}

/** Friendly label for a YYYY-MM-DD value: "Today", "Yesterday", else a full date. */
export function friendlyDayLabel(ymd: string): string {
  const today = todayISO();
  if (ymd === today) return "Today";
  // Yesterday = today minus one day, computed on the plain date string.
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (ymd === yesterday) return "Yesterday";
  // Render the YYYY-MM-DD as a readable date (parse as local midnight).
  return fullFmt.format(new Date(`${ymd}T00:00:00`));
}

/** Shift a YYYY-MM-DD string by N days (calendar math, tz-agnostic). */
export function shiftDay(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
