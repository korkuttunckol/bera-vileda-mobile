import type { BaseEntity } from '@/shared/types/base.types';

export type DepotCountWarehouse = 'central' | 'returns';

export interface DepotCountReportLine {
  productId: string;
  barcode: string;
  sku: string;
  name: string;
  stockQuantity: number;
  countQuantity: number;
}

export interface DepotCountReport extends BaseEntity {
  warehouse: DepotCountWarehouse;
  groupCode: string;
  createdByName: string;
  lines: DepotCountReportLine[];
  isDeleted: boolean;
}
