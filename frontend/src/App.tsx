import {lazy} from 'solid-js';
import {Navigate, Route, Router} from '@solidjs/router';
import {AppShell} from './shared/AppShell';
import {StartupUpdateToast} from './shared/StartupUpdateToast';
import {I18nSync} from './i18n/I18nSync';
import './theme/app.css';

const ServerBrowserPage = lazy(() => import('./features/server-browser/ServerBrowserPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const FavoritesPage = lazy(() => import('./features/favorites/FavoritesPage'));
const HistoryPage = lazy(() => import('./features/history/HistoryPage'));
const ModsPage = lazy(() => import('./features/mods/ModsPage'));
const AboutPage = lazy(() => import('./features/about/AboutPage'));

function RootLayout(props: {children?: any}) {
  return (
    <I18nSync>
      <StartupUpdateToast />
      <AppShell>{props.children}</AppShell>
    </I18nSync>
  );
}

export default function App() {
  return (
    <Router root={RootLayout}>
      <Route path="/" component={() => <Navigate href="/browse" />} />
      <Route path="/browse" component={ServerBrowserPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/mods" component={ModsPage} />
      <Route path="/about" component={AboutPage} />
    </Router>
  );
}
