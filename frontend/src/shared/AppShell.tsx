import {A} from '@solidjs/router';
import {useTranslation} from 'solid-i18next';
import {Clock, Package, Server, Settings, Star} from 'lucide-solid';
import './layout.css';

export function AppShell(props: {children?: any}) {
  const [t] = useTranslation();
  return (
    <div class="shell">
      <nav class="shell-nav" aria-label={t('nav.ariaMain')}>
        <span class="shell-brand">dzglauncher</span>
        <div class="shell-nav-links">
          <A href="/browse" class="nav-link" activeClass="active" end={false}>
            <span class="nav-link-inner">
              <Server size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.servers')}</span>
            </span>
          </A>
          <A href="/settings" class="nav-link" activeClass="active">
            <span class="nav-link-inner">
              <Settings size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.settings')}</span>
            </span>
          </A>
          <A href="/favorites" class="nav-link" activeClass="active">
            <span class="nav-link-inner">
              <Star size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.favorites')}</span>
            </span>
          </A>
          <A href="/history" class="nav-link" activeClass="active">
            <span class="nav-link-inner">
              <Clock size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.history')}</span>
            </span>
          </A>
          <A href="/mods" class="nav-link" activeClass="active">
            <span class="nav-link-inner">
              <Package size={18} strokeWidth={1.75} aria-hidden />
              <span>{t('nav.modsWorkshop')}</span>
            </span>
          </A>
        </div>
      </nav>
      <main class="shell-main">{props.children}</main>
    </div>
  );
}
