import {NavLink, Outlet} from 'react-router-dom';
import './layout.css';

export function AppShell() {
  return (
    <div className="shell">
      <nav className="shell-nav">
        <NavLink to="/browse" className={({isActive}) => (isActive ? 'active' : '')}>
          Servidores
        </NavLink>
        <NavLink to="/settings" className={({isActive}) => (isActive ? 'active' : '')}>
          Definições
        </NavLink>
        <NavLink to="/favorites" className={({isActive}) => (isActive ? 'active' : '')}>
          Favoritos
        </NavLink>
        <NavLink to="/history" className={({isActive}) => (isActive ? 'active' : '')}>
          Histórico
        </NavLink>
        <NavLink to="/mods" className={({isActive}) => (isActive ? 'active' : '')}>
          Mods Workshop
        </NavLink>
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
