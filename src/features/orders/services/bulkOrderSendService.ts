import type { Order } from '@/shared/types/order.types';
import {
  shareBulkOrderReport,
} from '../report/orderReportService';
import type { OrderReportShareKind } from '../report/orderReport.types';

export type BulkOrderSendKind = OrderReportShareKind;

export async function sendBulkOrders(
  orders: Order[],
  createdByName: string,
  kind: BulkOrderSendKind,
): Promise<void> {
  await shareBulkOrderReport(orders, createdByName, kind);
}
