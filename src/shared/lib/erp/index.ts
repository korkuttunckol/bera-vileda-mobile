import { LogoWingsFileAdapter } from './adapters/LogoWingsFileAdapter';
import type { ErpPort } from './ports/ErpPort';

export type { ErpPort, ErpExportResult, ErpImportResult, ErpOrderPayload } from './ports/ErpPort';
export { LogoWingsFileAdapter } from './adapters/LogoWingsFileAdapter';
export { NullErpAdapter } from './adapters/NullErpAdapter';

/**
 * V2 varsayılan ERP adapter: Logo GO Wings dosya aktarımı.
 * API adapter eklendiğinde bu factory üzerinden değiştirilir.
 */
export function createErpAdapter(): ErpPort {
  return new LogoWingsFileAdapter();
}

/** Geriye dönük uyumluluk — senkron motoru ve testler için tek örnek. */
export const erpAdapter: ErpPort = createErpAdapter();
