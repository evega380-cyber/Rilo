import { validDate } from './budget.ts';

// Explicit UTC keeps calendar dates from shifting a day on devices in other time zones.
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export function displayDate(date?: string | null): string {
  return date && validDate(date) ? dateFormatter.format(new Date(`${date}T12:00:00Z`)) : '';
}
export function dateInput(date: string): string {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
}
export function parseDateInput(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const date = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  return validDate(date) ? date : null;
}
