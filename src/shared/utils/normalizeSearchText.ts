/**
 * Normalize free-text for Turkish-friendly substring search.
 *
 * - Coerces non-strings safely (avoids crashes when IndexedDB/Firestore
 *   values are unexpectedly null/number — empty search never touched
 *   `code`, so a dirty `code` only broke the search path).
 * - Strips bidi/zero-width format chars Android IME can insert.
 * - NFKC folds fullwidth Latin letters (ＡＦＭ → AFM).
 * - Uses tr-TR case folding (İ→i, I→ı).
 * - Strips diacritics via NFD (ş→s, ğ→g, ü→u, ö→o, ç→c).
 * - Maps remaining dotless ı→i so "besler" / "Beşler" / "BEŞLER" align.
 */
export function normalizeSearchText(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ı', 'i');
}
