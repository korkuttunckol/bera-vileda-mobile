/**
 * Logo order export DTOs — LG_002_01_ORFICHE / LG_002_01_ORFLINE shape.
 * Pure data; no SQL INSERT/UPDATE in Stage 3A.
 */

/** LG_002_01_ORFICHE row prepared for future insert */
export interface LogoOrficheDto {
  /** Assigned by Logo on insert; provisional value before insert */
  LOGICALREF: number;
  TRCODE: 1;
  CLIENTREF: number;
  SOURCEINDEX: 0;
  /** BERA branch name */
  SPECODE: string;
  /** BERA branch name (Stage 3A mapping) */
  GENEXP1: string;
  /** Optional: BERA local order number for CUSTORDNO */
  CUSTORDNO?: string;
  /** ISO order date — informational for later DATE_/TIME_ conversion */
  orderDateIso?: string;
}

/** LG_002_01_ORFLINE row prepared for future insert */
export interface LogoOrflineDto {
  /** Assigned by Logo on insert; provisional before insert */
  LOGICALREF: number;
  ORDFICHEREF: number;
  LINENO_: number;
  STOCKREF: number;
  CLIENTREF: number;
  AMOUNT: number;
  PRICE: number;
  TOTAL: number;
  SHIPPEDAMOUNT: 0;
  UOMREF: 24;
  USREF: 7;
  LINETYPE: 0;
  SOURCEINDEX: 0;
  TRCODE: 1;
  /** Current ITEMS.CODE from resolver — not OrderLine.barcodeAtOrder */
  currentBarcode: string;
  /** Current PRODUCERCODE from resolver */
  currentSku: string;
  /** How the line was matched to the catalog */
  matchedBy: 'erpId' | 'sku' | 'barcode';
  /** BERA OrderLine id (trace only; not a Logo column) */
  beraLineId: string;
}

export type LogoOrderExportPendingReason =
  | 'customer_erpId_missing'
  | 'customer_not_found'
  | 'line_matching_pending'
  | 'product_erpId_missing';

export interface LogoOrderExportPendingDetail {
  reason: LogoOrderExportPendingReason;
  message: string;
  lineId?: string;
  productId?: string;
}

export interface LogoOrderExportMapped {
  status: 'mapped';
  orfiche: LogoOrficheDto;
  orflines: LogoOrflineDto[];
}

export interface LogoOrderExportMatchingPending {
  status: 'matching_pending';
  details: LogoOrderExportPendingDetail[];
}

export type LogoOrderExportResult =
  | LogoOrderExportMapped
  | LogoOrderExportMatchingPending;
