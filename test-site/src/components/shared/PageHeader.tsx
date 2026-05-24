import type { ReactNode } from 'react';

interface PageHeaderProps {
  breadcrumb?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}

export default function PageHeader({ breadcrumb, title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      {breadcrumb && <div className="page-header__breadcrumb">{breadcrumb}</div>}
      <div className="page-header__row">
        <div>
          <div className="page-header__title-row">
            <h1 className="page-header__title">{title}</h1>
            {badge && <span className="page-header__badge">{badge}</span>}
          </div>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
