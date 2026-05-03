import {useId} from 'react';
import {clampPageSize, PAGE_PRESET_SIZES} from './pageSizeConstants';

export type PageSizeInputProps = {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function PageSizeInput({id, value, onChange, disabled, ariaLabel, className}: PageSizeInputProps) {
  const uid = useId();
  const listId = `page-size-dl-${uid.replace(/:/g, '')}`;
  return (
    <span className={className ? `page-size-combo ${className}` : 'page-size-combo'}>
      <input
        id={id}
        type="number"
        min={1}
        max={500}
        step={1}
        list={listId}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        className="page-size-combo-input"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            return;
          }
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) {
            return;
          }
          onChange(clampPageSize(n));
        }}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) {
            return;
          }
          const c = clampPageSize(n);
          if (c !== value) {
            onChange(c);
          }
        }}
      />
      <datalist id={listId}>
        {PAGE_PRESET_SIZES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </span>
  );
}
