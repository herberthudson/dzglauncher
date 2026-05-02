import type {LucideIcon} from 'lucide-react';

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
};

export function PageHeader({icon: Icon, title, description}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-icon" aria-hidden>
        <Icon size={26} strokeWidth={1.65} />
      </div>
      <div className="page-header-text">
        <h1 className="page-header-title">{title}</h1>
        {description ? <p className="page-header-desc">{description}</p> : null}
      </div>
    </header>
  );
}
