/**
 * Normalize free-text for Turkish-friendly substring search.
 *
 * - Coerces non-strings safely (avoids crashes when IndexedDB/Firestore
 *   values are unexpectedly null/number).
 * - Uses tr-TR case folding (İ→i, I→ı).
 * - Strips diacritics via NFD (ş→s, ğ→g, ü→u, ö→o, ç→c).
 * - Maps remaining dotless ı→i so "besler" / "Beşler" / "BEŞLER" align.
 */
export function normalizeSearchText(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ı', 'i');
}
