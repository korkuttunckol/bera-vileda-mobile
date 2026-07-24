export function formatOrderReportDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatOrderReportTime(value: string): string {
  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatOrderReportDateTime(value: string): string {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildOrderReportFileNameBase(
  customerCode: string | undefined,
  customerId: string,
  reportDate: string,
): string {
  const code = customerCode ?? customerId.slice(0, 8);
  const date = new Date(reportDate).toISOString().slice(0, 10);
  return `Toplu_Siparis_${code}_${date}`;
}

export function buildMultiOrderReportFileNameBase(
  reportDate: string,
  orderCount: number,
): string {
  const date = new Date(reportDate).toISOString().slice(0, 10);
  return `Toplu_Siparis_${date}_${String(orderCount)}Siparis`;
}
