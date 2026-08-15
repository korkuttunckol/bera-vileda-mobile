/**
 * User permission profile foundation (PR #38).
 *
 * This defines the data contract for Admin / Satış Temsilcisi / Merch scoping.
 * Runtime master-data filtering, scoped sync, and server enforcement are NOT
 * applied in this PR — types + normalization only.
 *
 * Security is NOT complete with this foundation alone.
 */

/** Known customer field keys for allow-list masks (future UI / scoped feed). */
export const CUSTOMER_FIELD_MASK_KEYS = [
  'id',
  'code',
  'name',
  'city',
  'district',
  'fullAddress',
  'phone',
  'contactPerson',
  'email',
  'taxNumber',
  'taxOffice',
  'status',
  'logoSalesRepCode',
  'specialCode2',
  'erpId',
] as const;

export type CustomerFieldMaskKey = (typeof CUSTOMER_FIELD_MASK_KEYS)[number];

/** Known product field keys for allow-list masks (future UI / scoped feed). */
export const PRODUCT_FIELD_MASK_KEYS = [
  'id',
  'sku',
  'barcode',
  'name',
  'groupCode',
  'specialCode',
  'specialCode2',
  'vatRate',
  'stockQuantity',
  'listPrice',
  'unit',
  'category',
  'erpId',
] as const;

export type ProductFieldMaskKey = (typeof PRODUCT_FIELD_MASK_KEYS)[number];

/**
 * Fields that must remain available for order flows (future UI must not allow
 * removing these from a user's effective mask). Not enforced in this PR.
 */
export const REQUIRED_CUSTOMER_FIELD_MASK_KEYS = [
  'id',
  'code',
  'name',
] as const satisfies readonly CustomerFieldMaskKey[];

export const REQUIRED_PRODUCT_FIELD_MASK_KEYS = [
  'id',
  'barcode',
  'name',
] as const satisfies readonly ProductFieldMaskKey[];

/**
 * Permission / scope profile stored on AppUser.
 * Admin role treats all constraints as unlimited (ignore lists).
 */
export interface UserPermissionProfile {
  /** Logo CLCARD.SPECODE values → match Customer.logoSalesRepCode (future). */
  salesRepCodes: string[];
  /** Prefix wildcards only, e.g. "08*" (future Merch customer scope). */
  merchCustomerPatterns: string[];
  /** Exact Customer.code matches (future Merch customer scope). */
  merchCustomerCodes: string[];
  /** Product.groupCode / Logo STGRPCODE allow-list (future Merch stock scope). */
  merchStockGroupCodes: string[];
  /** Allow-list of customer field keys visible to the user (future). */
  customerFieldMask: string[];
  /** Allow-list of product field keys visible to the user (future). */
  productFieldMask: string[];
}

export const EMPTY_USER_PERMISSION_PROFILE: UserPermissionProfile = {
  salesRepCodes: [],
  merchCustomerPatterns: [],
  merchCustomerCodes: [],
  merchStockGroupCodes: [],
  customerFieldMask: [],
  productFieldMask: [],
};

export type UserPermissionProfileFields = Partial<UserPermissionProfile>;
