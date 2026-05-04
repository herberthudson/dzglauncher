import {Dialog as BaseDialog} from '@kobalte/core/dialog';
import {splitProps, type Component, type ComponentProps} from 'solid-js';
import {cn} from '@/lib/utils';

export const Dialog = BaseDialog;

const overlayClass =
  'fixed inset-0 z-[1000] cursor-pointer border-0 bg-black/55 p-0 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0';

export const DialogOverlay: Component<ComponentProps<typeof BaseDialog.Overlay>> = (props) => {
  const [local, rest] = splitProps(props, ['class']);
  return <BaseDialog.Overlay class={cn(overlayClass, local.class)} {...rest} />;
};

const contentClass =
  'fixed left-1/2 top-1/2 z-[1001] box-border flex max-h-[min(88vh,36rem)] w-[min(100%,56rem)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-border bg-card p-0 text-card-foreground shadow-ds outline-none data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95';

export const DialogContent: Component<ComponentProps<typeof BaseDialog.Content>> = (props) => {
  const [local, rest] = splitProps(props, ['class']);
  return <BaseDialog.Content class={cn(contentClass, local.class)} {...rest} />;
};
