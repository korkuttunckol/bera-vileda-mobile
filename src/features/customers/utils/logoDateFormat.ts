/** Converts Logo's YYYY-MM-DD date text to the app's DD-MM-YYYY display. */
export function formatLogoDate(value: string | null | undefined): string {
  const date = value?.trim();
  if (!date) return '';

  const match = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(date);
  if (!match) return date;

  return `${match[3]}-${match[2]}-${match[1]}${match[4]}`;
}
