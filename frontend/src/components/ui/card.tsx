import {splitProps, type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

export const Card: Component<{class?: string; children?: JSX.Element} & JSX.HTMLAttributes<HTMLDivElement>> = (
  props,
) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      class={cn(
        'mb-3 rounded-md border border-border bg-card/85 p-3 text-card-foreground shadow-ds backdrop-blur-[3px] last:mb-0',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
};

export const CardTitle: Component<{class?: string; children?: JSX.Element} & JSX.HTMLAttributes<HTMLHeadingElement>> = (
  props,
) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <h2
      class={cn(
        'mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground [&_svg]:shrink-0 [&_svg]:opacity-90',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </h2>
  );
};
