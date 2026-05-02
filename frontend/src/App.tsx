import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {AppShell} from './shared/AppShell';
import {SettingsPage} from './features/settings/SettingsPage';
import {ServerBrowserPage} from './features/server-browser/ServerBrowserPage';
import {FavoritesPage} from './features/favorites/FavoritesPage';
import {HistoryPage} from './features/history/HistoryPage';
import {ModsPage} from './features/mods/ModsPage';
import './theme/variables.css';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
