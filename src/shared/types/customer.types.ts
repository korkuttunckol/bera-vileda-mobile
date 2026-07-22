import type { BaseEntity, SyncStatus } from './base.types';

export type CustomerSource = 'manual' | 'excel';

export interface CustomerAddress {
  city?: string;
  district?: string;
  fullAddress?: string;
}

export interface Customer extends BaseEntity {
  code: string;
  name: string;
  taxNumber?: string;
  address?: CustomerAddress;
  contactPerson?: string;
  phone?: string;
  email?: string;
  salesRepId: string;
  priceListId?: string;
  creditLimit?: number;
  isActive: boolean;
  isDeleted: boolean;
  source: CustomerSource;
  erpId?: string;
  erpSyncStatus?: 'pending' | 'synced' | 'error';
}

export interface CustomerBranch {
  id: string;
  customerId: string;
  name: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  isActive: boolean;
  isDeleted: boolean;
  erpId?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  version: number;
}

export type CustomerFormData = Pick<
  Customer,
  | 'code'
  | 'name'
  | 'taxNumber'
  | 'contactPerson'
  | 'phone'
  | 'email'
  | 'isActive'
> & {
  city?: string;
  district?: string;
  fullAddress?: string;
};

export type BranchFormData = Pick<
  CustomerBranch,
  'name' | 'address' | 'phone' | 'contactPerson' | 'isActive'
>;
