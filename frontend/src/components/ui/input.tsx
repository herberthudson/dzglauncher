import {splitProps, type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

export type InputProps = {class?: string} & JSX.InputHTMLAttributes<HTMLInputElement>;

export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <input
      class={cn(
        'box-border min-h-[2.375rem] w-full max-w-xl rounded-md border border-input bg-muted px-2 py-[0.45rem] text-sm text-foreground font-[inherit] leading-snug placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        local.class,
      )}
      {...rest}
    />
  );
};
