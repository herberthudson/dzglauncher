import {type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

export const AlertError: Component<{class?: string; children?: JSX.Element}> = (props) => (
  <div class={cn('my-2 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive', props.class)}>
    {props.children}
  </div>
);

export const AlertSuccess: Component<{class?: string; children?: JSX.Element}> = (props) => (
  <div
    class={cn(
      'my-2 rounded-md border border-success/35 bg-success/10 px-3 py-2 text-sm text-success',
      props.class,
    )}
  >
    {props.children}
  </div>
);

export const AlertInfo: Component<{class?: string; children?: JSX.Element}> = (props) => (
  <div
    class={cn(
      'my-2 rounded-md border border-info-border/40 bg-info/10 px-3 py-2 text-sm text-foreground',
      props.class,
    )}
  >
    {props.children}
  </div>
);
