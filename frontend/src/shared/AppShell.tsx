import {NavLink, Outlet} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import './layout.css';

export function AppShell() {
  const {t} = useTranslation();
  return (
    <div className="shell">
      <nav className="shell-nav">
        <NavLink to="/browse" className={({isActive}) => (isActive ? 'active' : '')}>
          {t('nav.servers')}
        </NavLink>
        <NavLink to="/settings" className={({isActive}) => (isActive ? 'active' : '')}>
          {t('nav.settings')}
        </NavLink>
        <NavLink to="/favorites" className={({isActive}) => (isActive ? 'active' : '')}>
          {t('nav.favorites')}
        </NavLink>
        <NavLink to="/history" className={({isActive}) => (isActive ? 'active' : '')}>
          {t('nav.history')}
        </NavLink>
        <NavLink to="/mods" className={({isActive}) => (isActive ? 'active' : '')}>
          {t('nav.modsWorkshop')}
        </NavLink>
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
