/**
 * Utilities for date and time calculations in CronosFlow
 */

export function formatSecondsToDigital(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function minutesToDecimalHours(minutes: number): number {
  return Number((minutes / 60).toFixed(2));
}

export function decimalHoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns YYYY-MM-DD string for a Date object in local time
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a local Date
 */
export function parseISODate(isoStr: string): Date {
  const [year, month, day] = isoStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gets the Monday of the week containing the specified date
 */
export function getMondayOfWeek(dateInput: Date | string): Date {
  const d = typeof dateInput === 'string' ? parseISODate(dateInput) : new Date(dateInput);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Gets the 7 days of the week starting from Monday
 */
export interface WeekDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNameShort: string; // 'Lun', 'Mar', ...
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

const SPANISH_DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function getWeekDays(mondayDate: Date): WeekDay[] {
  const todayStr = toISODateString(new Date());
  const days: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(mondayDate);
    current.setDate(mondayDate.getDate() + i);
    const dateStr = toISODateString(current);
    days.push({
      date: current,
      dateStr,
      dayNameShort: SPANISH_DAY_NAMES[i],
      dayNumber: current.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: i >= 5,
    });
  }

  return days;
}

/**
 * Formats a week range in Spanish: "27 Oct - 02 Nov 2026"
 */
export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDay = monday.getDate();
  const startMonth = monday.toLocaleDateString('es-ES', { month: 'short' });
  const endDay = sunday.getDate();
  const endMonth = sunday.toLocaleDateString('es-ES', { month: 'short' });
  const endYear = sunday.getFullYear();

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
}

export function formatDateSpanish(dateStr: string): string {
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

export function getPresetDateRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const todayStr = toISODateString(today);

  if (preset === 'this_week') {
    const mon = getMondayOfWeek(today);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: toISODateString(mon), end: toISODateString(sun) };
  }

  if (preset === 'last_week') {
    const mon = getMondayOfWeek(today);
    mon.setDate(mon.getDate() - 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: toISODateString(mon), end: toISODateString(sun) };
  }

  if (preset === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: toISODateString(firstDay), end: toISODateString(lastDay) };
  }

  if (preset === 'last_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toISODateString(firstDay), end: toISODateString(lastDay) };
  }

  // All time or default: last 30 days
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return { start: toISODateString(thirtyDaysAgo), end: todayStr };
}
