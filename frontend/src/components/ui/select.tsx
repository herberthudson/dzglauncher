import {Select} from '@kobalte/core/select';
import {ChevronDown, Check} from 'lucide-solid';
import {createMemo, splitProps, type Component} from 'solid-js';
import {cn} from '@/lib/utils';

export type SelectStrOption = {value: string; label: string};

export type SelectStrProps = {
  id?: string;
  value: string;
  options: SelectStrOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  class?: string;
  className?: string;
  width?: 'full' | 'auto';
};

type SelectItemNode = {rawValue: SelectStrOption};

const itemBox =
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50';

const StringSelectItem: Component<{item: SelectItemNode}> = (props) => (
  <Select.Item item={props.item as never} class={itemBox}>
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <Select.ItemIndicator>
        <Check class="size-4" strokeWidth={2} aria-hidden />
      </Select.ItemIndicator>
    </span>
    <Select.ItemLabel>{props.item.rawValue.label}</Select.ItemLabel>
  </Select.Item>
);

export function StringSelect(props: SelectStrProps) {
  const [local, rest] = splitProps(props, [
    'id',
    'value',
    'options',
    'onChange',
    'disabled',
    'ariaLabel',
    'class',
    'className',
    'width',
  ]);
  const selected = createMemo(() => local.options.find((o) => o.value === local.value));
  const width = () => local.width ?? 'full';
  const extra = () => local.class ?? local.className ?? '';

  return (
    <Select<SelectStrOption>
      {...rest}
      id={local.id}
      options={local.options}
      optionValue="value"
      optionTextValue="label"
      value={selected()}
      onChange={(opt) => {
        if (opt) {
          local.onChange(opt.value);
        }
      }}
      disabled={local.disabled}
      itemComponent={StringSelectItem}
      placement="bottom-start"
    >
      <Select.Trigger
        class={cn(
          'flex min-h-[2.375rem] w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-muted px-2 py-[0.45rem] text-left text-sm text-foreground font-[inherit] leading-snug focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45',
          width() === 'auto' ? 'max-w-none' : 'max-w-xl',
          extra(),
        )}
        aria-label={local.ariaLabel}
      >
        <Select.Value<SelectStrOption>>
          {(s) => (
            <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{s.selectedOption()?.label ?? ''}</span>
          )}
        </Select.Value>
        <Select.Icon class="shrink-0 text-muted-foreground">
          <ChevronDown size={16} strokeWidth={2} aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content class="z-[10000] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95">
          <Select.Listbox class="max-h-[min(280px,50vh)] overflow-y-auto outline-none" />
        </Select.Content>
      </Select.Portal>
    </Select>
  );
}

export const DsSelect: Component<SelectStrProps> = StringSelect;
export type DsSelectOption = SelectStrOption;
export type DsSelectProps = SelectStrProps;
