import {splitProps, type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

export type TextareaProps = {class?: string} & JSX.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: Component<TextareaProps> = (props) => {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <textarea
      class={cn(
        'box-border min-h-[4.5rem] w-full max-w-xl resize-y rounded-md border border-input bg-muted px-2 py-[0.45rem] text-sm text-foreground font-[inherit] leading-snug focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        local.class,
      )}
      {...rest}
    />
  );
};
