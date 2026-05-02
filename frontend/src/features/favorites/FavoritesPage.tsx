import {useEffect, useState} from 'react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';

export function FavoritesPage() {
  const [s, setS] = useState<domain.Settings | null>(null);

  const reload = () => App.LoadSettings().then(setS);

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  if (!s) {
    return <p>A carregar…</p>;
  }

  return (
    <div>
      <h1 style={{marginTop: 0}}>Favoritos</h1>
      {s.quickFavorite ? (
        <p>
          <strong>Favorito rápido:</strong> {s.quickFavoriteLabel || s.quickFavorite.ip} — {s.quickFavorite.ip}:{s.quickFavorite.gamePort} (q {s.quickFavorite.queryPort})
          <button type="button" className="btn btn-secondary" style={{marginLeft: '0.5rem'}} onClick={() => App.ClearQuickFavorite().then(reload)}>
            Limpar
          </button>
        </p>
      ) : (
        <p>Sem favorito rápido definido.</p>
      )}
      <ul style={{listStyle: 'none', padding: 0}}>
        {s.favorites.map((f, i) => (
          <li key={i} style={{marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
            <strong>{f.label || f.ip}</strong> — {f.ip}:{f.gamePort} query {f.queryPort}
            <button type="button" className="btn btn-danger" style={{marginLeft: '0.5rem'}} onClick={() => App.RemoveFavorite(f.ip, f.gamePort, f.queryPort).then(reload)}>
              Remover
            </button>
          </li>
        ))}
      </ul>
      {s.favorites.length === 0 ? <p>Lista vazia. Adicione a partir do browser de servidores.</p> : null}
    </div>
  );
}
