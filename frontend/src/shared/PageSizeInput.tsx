import {For} from 'solid-js';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import {clampPageSize, PAGE_PRESET_SIZES} from './pageSizeConstants';

export type PageSizeInputProps = {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  class?: string;
  className?: string;
};

export function PageSizeInput(props: PageSizeInputProps) {
  const listId = `page-size-dl-${Math.random().toString(36).slice(2, 9)}`;
  const comboClass = () => {
    const c = props.class ?? props.className;
    return cn('inline-flex items-stretch', c);
  };
  return (
    <span class={comboClass()}>
      <Input
        id={props.id}
        type="number"
        min={1}
        max={500}
        step={1}
        list={listId}
        value={props.value}
        disabled={props.disabled}
        aria-label={props.ariaLabel}
        class="w-[5.5rem] max-w-none"
        onInput={(e) => {
          const raw = e.currentTarget.value;
          if (raw === '') {
            return;
          }
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) {
            return;
          }
          props.onChange(clampPageSize(n));
        }}
        onBlur={(e) => {
          const raw = e.currentTarget.value.trim();
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) {
            return;
          }
          const c = clampPageSize(n);
          if (c !== props.value) {
            props.onChange(c);
          }
        }}
      />
      <datalist id={listId}>
        <For each={PAGE_PRESET_SIZES}>{(n) => <option value={n} />}</For>
      </datalist>
    </span>
  );
}
