import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {AppShell} from './shared/AppShell';
import {SettingsPage} from './features/settings/SettingsPage';
import {ServerBrowserPage} from './features/server-browser/ServerBrowserPage';
import {FavoritesPage} from './features/favorites/FavoritesPage';
import {HistoryPage} from './features/history/HistoryPage';
import {ModsPage} from './features/mods/ModsPage';
import {I18nSync} from './i18n/I18nSync';
import './theme/variables.css';

function App() {
  return (
    <BrowserRouter>
      <I18nSync>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/browse" replace />} />
            <Route path="browse" element={<ServerBrowserPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="mods" element={<ModsPage />} />
          </Route>
        </Routes>
      </I18nSync>
    </BrowserRouter>
  );
}

export default App;
