import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import type { Order, OrderLine } from '@/shared/types/order.types';
import { buildOrderReportFileNameBase, buildMultiOrderReportFileNameBase } from './orderReportFormat';
import type {
  BulkOrderReport,
  OrderReportCustomerBlock,
  OrderReportLine,
} from './orderReport.types';

async function enrichLines(lines: OrderLine[]): Promise<OrderReportLine[]> {
  return Promise.all(
    lines.map(async (line) => {
      const product = await productLocalRepository.getById(line.productId);
      return {
        barcode: product?.barcode ?? '',
        productName: line.productName,
        productSku: line.productSku,
        quantity: line.quantity,
      };
    }),
  );
}

function buildCustomerBlock(
  order: Order,
  lines: OrderReportLine[],
): OrderReportCustomerBlock {
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    customerCode: order.customerCode ?? '-',
    customerName: order.customerName,
    branchName: order.branchName ?? 'Merkez',
    lineCount: lines.length,
    lines,
    totalQuantity,
  };
}

export async function buildBulkOrderReportFromOrder(
  order: Order,
  lines: OrderLine[],
  createdByName: string,
): Promise<BulkOrderReport> {
  const enrichedLines = await enrichLines(lines);
  const customerBlock = buildCustomerBlock(order, enrichedLines);

  return {
    reportDate: order.orderDate,
    createdByName,
    customers: [customerBlock],
    grandTotalQuantity: customerBlock.totalQuantity,
    fileNameBase: buildOrderReportFileNameBase(
      order.customerCode,
      order.customerId,
      order.orderDate,
    ),
  };
}

export async function buildBulkOrderReportFromOrders(
  entries: Array<{ order: Order; lines: OrderLine[] }>,
  createdByName: string,
  reportDate = new Date().toISOString(),
): Promise<BulkOrderReport> {
  const customers: OrderReportCustomerBlock[] = [];

  for (const entry of entries) {
    const enrichedLines = await enrichLines(entry.lines);
    customers.push(buildCustomerBlock(entry.order, enrichedLines));
  }

  const grandTotalQuantity = customers.reduce(
    (sum, customer) => sum + customer.totalQuantity,
    0,
  );

  if (entries.length === 0) {
    return {
      reportDate,
      createdByName,
      customers: [],
      grandTotalQuantity: 0,
      fileNameBase: `Toplu_Siparis_${new Date(reportDate).toISOString().slice(0, 10)}`,
    };
  }

  const firstOrder = entries[0].order;
  const fileNameBase =
    entries.length > 1
      ? buildMultiOrderReportFileNameBase(reportDate, entries.length)
      : buildOrderReportFileNameBase(
          firstOrder.customerCode,
          firstOrder.customerId,
          reportDate,
        );

  return {
    reportDate,
    createdByName,
    customers,
    grandTotalQuantity,
    fileNameBase,
  };
}
