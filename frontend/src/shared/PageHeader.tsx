import type {Component} from 'solid-js';
import {cn} from '@/lib/utils';

type PageHeaderProps = {
  icon: Component<{size?: number; strokeWidth?: number; class?: string; 'aria-hidden'?: boolean}>;
  title: string;
  description?: string;
  class?: string;
};

export function PageHeader(props: PageHeaderProps) {
  const Icon = props.icon;
  return (
    <header class={cn('mb-3 flex items-start gap-2', props.class)}>
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"
        aria-hidden
      >
        <Icon size={26} strokeWidth={1.65} />
      </div>
      <div class="min-w-0">
        <h1 class="m-0 text-[1.375rem] font-semibold leading-tight tracking-tight">{props.title}</h1>
        {props.description ? (
          <p class="mt-1.5 max-w-2xl text-[0.8125rem] leading-snug text-muted-foreground">{props.description}</p>
        ) : null}
      </div>
    </header>
  );
}
