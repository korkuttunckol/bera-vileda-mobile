export function formatLastSyncLabel(isoDate: string | null): string {
  if (!isoDate) return 'Henüz senkronize edilmedi';
  return new Date(isoDate).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
