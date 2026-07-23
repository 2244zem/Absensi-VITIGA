export function getJakartaHour(): number {
  return parseInt(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
  }), 10);
}

export function formatJakartaTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

export function formatJakartaDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

export function formatJakartaDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

export function getJakartaDateParts(date?: Date): { year: number; month: number; day: number } {
  const d = date || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).formatToParts(d);
  return {
    year: parseInt(parts.find(p => p.type === 'year')!.value, 10),
    month: parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1,
    day: parseInt(parts.find(p => p.type === 'day')!.value, 10),
  };
}

export function getTodayJakartaBounds(): { start: string; end: string } {
  const { year, month, day } = getJakartaDateParts();
  const jakartaMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0) - 7 * 3600000);
  const start = jakartaMidnight.toISOString();
  const end = new Date(jakartaMidnight.getTime() + 24 * 3600000 - 1).toISOString();
  return { start, end };
}

export function getJakartaDayBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  const start = d.toISOString();
  const end = new Date(d.getTime() + 24 * 3600000 - 1).toISOString();
  return { start, end };
}

export function getJakartaMonthBounds(year: number, month: number): { start: string; end: string } {
  const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00+07:00`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+07:00`;
  return { start: startStr, end: endStr };
}

export const OVERTIME_HOUR = 18;
export const LATE_THRESHOLD_HOUR = 8;
export const WORK_START_HOUR = 8;
export const COOLDOWN_MINUTES = 20;