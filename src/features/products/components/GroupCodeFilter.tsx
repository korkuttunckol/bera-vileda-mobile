import { cn } from '@/shared/utils/cn';

interface GroupCodeFilterProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function GroupCodeFilter({
  value,
  options,
  onChange,
}: GroupCodeFilterProps) {
  if (options.length === 0) return null;

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
      <div className="flex min-w-min gap-1.5 rounded-xl bg-brand-gray-100/80 p-1">
        <button
          type="button"
          onClick={() => {
            onChange('');
          }}
          className={cn(
            'shrink-0 rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98]',
            value === ''
              ? 'bg-white text-brand-navy shadow-sm ring-1 ring-brand-navy/10'
              : 'text-brand-gray-500 hover:text-brand-navy',
          )}
        >
          Tümü
        </button>
        {options.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              onChange(code);
            }}
            className={cn(
              'shrink-0 rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98]',
              value === code
                ? 'bg-white text-brand-navy shadow-sm ring-1 ring-brand-navy/10'
                : 'text-brand-gray-500 hover:text-brand-navy',
            )}
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}
