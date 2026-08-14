/**
 * Admin visibility override — tip / interface tasarımı (Stage 3C-2).
 * Settings UI ve runtime filtre bu PR'da bağlanmaz.
 *
 * Logo CLCARD.SPECODE → Customer.logoSalesRepCode ile ilişkilidir.
 * CustomerBranch / stok visibility bu tasarımın konusu değildir.
 */

/** Hangi Logo satış elemanı kodlarının Admin tarafından görünür sayılacağı. */
export interface LogoSalesRepVisibilityOverride {
  /** Logo SPECODE değerleri (örn. "2217") */
  allowedLogoSalesRepCodes: string[];
  /**
   * true ise listedeki kodlar hariç tutulur (deny-list);
   * false / undefined ise allow-list.
   */
  excludeListed?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

/** İleride Settings'e eklenebilecek opsiyonel konteyner (şimdilik kullanılmaz). */
export interface LogoCustomerVisibilitySettings {
  salesRepOverride?: LogoSalesRepVisibilityOverride;
}
