import { Card } from '@/shared/components/ui/Card';
import { cn } from '@/shared/utils/cn';

interface DisplayFieldToggleListProps<T extends string> {
  fields: T[];
  labels: Record<T, string>;
  selected: T[];
  required?: T[];
  onToggle: (field: T) => void;
}

export function DisplayFieldToggleList<T extends string>({
  fields,
  labels,
  selected,
  required = [],
  onToggle,
}: DisplayFieldToggleListProps<T>) {
  return (
    <Card padding="none" className="divide-y divide-brand-gray-100">
      {fields.map((field) => {
        const isRequired = required.includes(field);
        const isChecked = selected.includes(field);

        return (
          <label
            key={field}
            className={cn(
              'flex items-center justify-between gap-3 px-4 py-3.5',
              isRequired ? 'cursor-default' : 'cursor-pointer active:bg-brand-gray-50',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-navy">{labels[field]}</p>
              {isRequired ? (
                <p className="text-xs text-brand-gray-500">Zorunlu alan</p>
              ) : null}
            </div>
            <input
              type="checkbox"
              checked={isChecked}
              disabled={isRequired}
              onChange={() => { onToggle(field); }}
              className="h-5 w-5 shrink-0 rounded border-brand-gray-300 text-brand-navy focus:ring-brand-navy/30 disabled:opacity-60"
            />
          </label>
        );
      })}
    </Card>
  );
}
