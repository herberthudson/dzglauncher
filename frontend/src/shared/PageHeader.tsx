import type {Component} from 'solid-js';

type PageHeaderProps = {
  icon: Component<{size?: number; strokeWidth?: number; class?: string; 'aria-hidden'?: boolean}>;
  title: string;
  description?: string;
};

export function PageHeader(props: PageHeaderProps) {
  const Icon = props.icon;
  return (
    <header class="page-header">
      <div class="page-header-icon" aria-hidden>
        <Icon size={26} strokeWidth={1.65} />
      </div>
      <div class="page-header-text">
        <h1 class="page-header-title">{props.title}</h1>
        {props.description ? <p class="page-header-desc">{props.description}</p> : null}
      </div>
    </header>
  );
}
