import {cva, type VariantProps} from 'class-variance-authority';
import {splitProps, type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent text-sm font-semibold font-[inherit] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary:
          'border-border bg-card/85 text-card-foreground backdrop-blur-[2px] hover:border-primary hover:bg-muted',
        destructive: 'border-destructive bg-transparent text-destructive hover:bg-destructive/10',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-muted',
      },
      size: {
        default: 'min-h-8 px-3 py-1.5',
        sm: 'min-h-7 px-2 text-xs',
        icon: 'size-8 min-h-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = {
  class?: string;
  children?: JSX.Element;
} & VariantProps<typeof buttonVariants> &
  JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'children', 'type']);
  return (
    <button
      type={local.type ?? 'button'}
      class={cn(buttonVariants({variant: local.variant, size: local.size}), local.class)}
      {...rest}
    >
      {local.children}
    </button>
  );
};
