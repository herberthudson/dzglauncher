import {NavLink, Outlet} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Clock, Package, Server, Settings, Star} from 'lucide-react';
import './layout.css';

export function AppShell() {
  const {t} = useTranslation();
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label={t('nav.ariaMain')}>
        <span className="shell-brand">dzglauncher</span>
        <div className="shell-nav-links">
          <NavLink to="/browse" className={({isActive}) => (isActive ? 'active' : '')}>
            <span className="nav-link-inner">
              <Server size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.servers')}</span>
            </span>
          </NavLink>
          <NavLink to="/settings" className={({isActive}) => (isActive ? 'active' : '')}>
            <span className="nav-link-inner">
              <Settings size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.settings')}</span>
            </span>
          </NavLink>
          <NavLink to="/favorites" className={({isActive}) => (isActive ? 'active' : '')}>
            <span className="nav-link-inner">
              <Star size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.favorites')}</span>
            </span>
          </NavLink>
          <NavLink to="/history" className={({isActive}) => (isActive ? 'active' : '')}>
            <span className="nav-link-inner">
              <Clock size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.history')}</span>
            </span>
          </NavLink>
          <NavLink to="/mods" className={({isActive}) => (isActive ? 'active' : '')}>
            <span className="nav-link-inner">
              <Package size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.modsWorkshop')}</span>
            </span>
          </NavLink>
        </div>
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
