import {Checkbox} from '@kobalte/core/checkbox';
import {Check} from 'lucide-solid';
import {splitProps, type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

export type TableCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  ariaLabel?: string;
  title?: string;
  class?: string;
};

export const TableCheckbox: Component<TableCheckboxProps> = (props) => {
  const [local, rest] = splitProps(props, ['checked', 'onChange', 'disabled', 'indeterminate', 'ariaLabel', 'title', 'class']);
  return (
    <Checkbox
      checked={local.checked}
      onChange={local.onChange}
      disabled={local.disabled}
      indeterminate={local.indeterminate}
      title={local.title}
      class={cn('inline-flex items-center align-middle', local.class)}
      {...rest}
    >
      <Checkbox.Input class="sr-only" aria-label={local.ariaLabel} />
      <Checkbox.Control class="flex size-4 shrink-0 items-center justify-center rounded border border-primary bg-background shadow data-[checked]:bg-primary data-[checked]:text-primary-foreground">
        <Checkbox.Indicator>
          <Check class="size-3" strokeWidth={2.5} aria-hidden />
        </Checkbox.Indicator>
      </Checkbox.Control>
    </Checkbox>
  );
};

export type FormCheckboxRowProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  class?: string;
  children?: JSX.Element;
};

export const FormCheckboxRow: Component<FormCheckboxRowProps> = (props) => {
  const [local, rest] = splitProps(props, ['checked', 'onChange', 'disabled', 'class', 'children']);
  return (
    <Checkbox
      checked={local.checked}
      onChange={local.onChange}
      disabled={local.disabled}
      class={cn('flex min-h-9 cursor-pointer items-center gap-2 px-1 py-0.5 text-[0.8125rem] text-foreground', local.class)}
      {...rest}
    >
      <Checkbox.Input class="sr-only" />
      <Checkbox.Control class="flex size-4 shrink-0 items-center justify-center rounded border border-primary bg-background shadow data-[checked]:bg-primary data-[checked]:text-primary-foreground">
        <Checkbox.Indicator>
          <Check class="size-3" strokeWidth={2.5} aria-hidden />
        </Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.Label class="cursor-pointer select-none leading-snug">{local.children}</Checkbox.Label>
    </Checkbox>
  );
};
