import { Badge } from '@/shared/components/ui/Badge';
import { useCustomerDisplayFields } from '@/stores/displayPreferencesStore';
import { isCustomerFieldVisible } from '@/shared/lib/indexeddb/displayPreferencesStorage';
import type { CustomerDisplayField } from '@/shared/types/displayPreferences.types';
import type { Customer } from '@/shared/types/customer.types';

interface CustomerInfoDisplayProps {
  customer: Customer;
}

export function CustomerInfoDisplay({ customer }: CustomerInfoDisplayProps) {
  const customerFields = useCustomerDisplayFields();
  const isVisible = (field: CustomerDisplayField): boolean =>
    isCustomerFieldVisible(customerFields, field);

  const secondaryParts: string[] = [];
  if (isVisible('code')) secondaryParts.push(customer.code);
  if (isVisible('phone') && customer.phone) secondaryParts.push(customer.phone);
  if (isVisible('contactPerson') && customer.contactPerson) {
    secondaryParts.push(customer.contactPerson);
  }
  if (isVisible('email') && customer.email) secondaryParts.push(customer.email);
  if (isVisible('taxNumber') && customer.taxNumber) {
    secondaryParts.push(`VN: ${customer.taxNumber}`);
  }

  const addressParts: string[] = [];
  if (isVisible('city') && customer.address?.city) {
    addressParts.push(customer.address.city);
  }
  if (isVisible('district') && customer.address?.district) {
    addressParts.push(customer.address.district);
  }
  if (isVisible('fullAddress') && customer.address?.fullAddress) {
    addressParts.push(customer.address.fullAddress);
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {isVisible('name') ? (
          <p className="truncate font-medium text-brand-navy">{customer.name}</p>
        ) : null}
        {isVisible('status') ? (
          <Badge
            label={customer.isActive ? 'Aktif' : 'Pasif'}
            variant={customer.isActive ? 'active' : 'passive'}
          />
        ) : null}
      </div>

      {secondaryParts.length > 0 ? (
        <p className="truncate text-sm text-brand-gray-500">
          {secondaryParts.join(' · ')}
        </p>
      ) : null}

      {addressParts.length > 0 ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-brand-gray-400">
          {addressParts.join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
