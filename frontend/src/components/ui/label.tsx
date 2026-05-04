import {splitProps, type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

export const Label: Component<{class?: string; children?: JSX.Element} & JSX.LabelHTMLAttributes<HTMLLabelElement>> = (
  props,
) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <label
      class={cn(
        'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </label>
  );
};
