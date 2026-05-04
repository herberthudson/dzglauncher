import {splitProps, type Component, type JSX} from 'solid-js';
import {cn} from '@/lib/utils';

export const tablePasswordColClass = 'w-12 max-w-14 text-center';

const tableBaseClass = 'w-full border-collapse text-[0.8125rem] tabular-nums';

const scrollShellClass =
  'max-h-[min(72vh,42rem)] overflow-auto rounded-md border border-border bg-card';

export const TableScroll: Component<{class?: string; children?: JSX.Element}> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn(scrollShellClass, local.class)} {...rest}>
      {local.children}
    </div>
  );
};

export const Table: Component<JSX.HTMLAttributes<HTMLTableElement>> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <table class={cn(tableBaseClass, local.class)} {...rest}>
      {local.children}
    </table>
  );
};

export const TableHeader: Component<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <thead class={cn(local.class)} {...rest}>
      {local.children}
    </thead>
  );
};

export const TableBody: Component<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <tbody class={cn(local.class)} {...rest}>
      {local.children}
    </tbody>
  );
};

export const TableRow: Component<JSX.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <tr class={cn('transition-colors hover:bg-muted/30', local.class)} {...rest}>
      {local.children}
    </tr>
  );
};

export const TableHead: Component<JSX.ThHTMLAttributes<HTMLTableCellElement>> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <th
      class={cn(
        'sticky top-0 z-10 border-b border-border bg-card px-2 py-1.5 text-left text-[0.75rem] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </th>
  );
};

export const TableCell: Component<JSX.TdHTMLAttributes<HTMLTableCellElement>> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <td class={cn('border-b border-border px-2 py-1.5 align-middle whitespace-nowrap', local.class)} {...rest}>
      {local.children}
    </td>
  );
};

export const TableCaption: Component<JSX.HTMLAttributes<HTMLTableCaptionElement>> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <caption class={cn(local.class)} {...rest}>
      {local.children}
    </caption>
  );
};
