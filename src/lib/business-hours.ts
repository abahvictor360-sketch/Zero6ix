import type { BusinessHours } from "./types";

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { day: days.indexOf(parts.weekday), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function isWithinBusinessHours(hours: BusinessHours, at: Date = new Date()): boolean {
  const { day, minutes } = partsInZone(at, hours.timezone);
  if (!hours.days.includes(day)) return false;
  const end = day === 6 && hours.saturday_end ? hours.saturday_end : hours.end;
  return minutes >= toMinutes(hours.start) && minutes < toMinutes(end);
}

export function describeBusinessHours(hours: BusinessHours) {
  const sat = hours.days.includes(6) ? `, Sat ${hours.start}–${hours.saturday_end ?? hours.end}` : "";
  return `Mon–Fri ${hours.start}–${hours.end}${sat} (WAT)`;
}
