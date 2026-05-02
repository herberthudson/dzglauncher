import {useEffect, useMemo, useState} from 'react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {favoriteKey, favoriteKeyParts, favoritesToRows, rowKey} from '../../shared/favoriteRows';

const PAGE_PRESETS = [10, 20, 50, 100] as const;

function clampPageSize(n: number) {
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  if (n > 500) {
    return 500;
  }
  return Math.floor(n);
}

export function FavoritesPage() {
  const [s, setS] = useState<domain.Settings | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const reload = () => App.LoadSettings().then(setS);

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const allRows = useMemo(() => (s ? favoritesToRows(s) : []), [s]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [allRows.length, pageSize, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [allRows, page, pageSize]);

  if (!s) {
    return <p>A carregar…</p>;
  }

  const ping = () => {
    if (pageSlice.length === 0) {
      return;
    }
    setLoading(true);
    App.RefreshServersPing(pageSlice)
      .then((updated) => App.MergeFavoriteSnapshots(updated))
      .then(() => reload())
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const enrichMods = (row: domain.ServerRow) => {
    App.EnrichServerMods(row.queryHost, row.queryPort)
      .then((ids) => {
        const patched = domain.ServerRow.createFrom({...row, workshopModIds: ids});
        return App.MergeFavoriteSnapshots([patched]);
      })
      .then(() => reload())
      .catch((e) => setErr(String(e)));
  };

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  return (
    <div>
      <h1 style={{marginTop: 0}}>Favoritos</h1>
      {err ? <div className="msg msg-error">{err}</div> : null}
      <div className="toolbar">
        <button type="button" className="btn btn-secondary" disabled={loading || !s.quickFavorite} onClick={() => App.ClearQuickFavorite().then(reload)}>
          Limpar favorito rápido
        </button>
        <button type="button" className="btn btn-secondary" disabled={loading || pageSlice.length === 0} onClick={ping} title="Apenas servidores desta página">
          Atualizar ping (A2S) — página atual
        </button>
      </div>
      <div className="toolbar" style={{alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'}}>
        <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Por página</span>
        <select
          value={presetValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') {
              return;
            }
            setPageSize(parseInt(v, 10));
            setPage(1);
          }}
          style={{width: '5.5rem'}}
        >
          {PAGE_PRESETS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="custom">Outro…</option>
        </select>
        <label style={{display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
          Número
          <input
            type="number"
            min={1}
            max={500}
            value={pageSize}
            onChange={(e) => {
              const n = clampPageSize(parseInt(e.target.value, 10));
              setPageSize(n);
              setPage(1);
            }}
            style={{width: '4.5rem'}}
          />
        </label>
      </div>
      <div className="toolbar" style={{justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'}}>
        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0}}>
          {loading ? 'A processar…' : `Página: ${pageSlice.length} linhas · ${allRows.length} favoritos`}
        </p>
        <div style={{display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <button type="button" className="btn btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage(1)}>
            ««
          </button>
          <button type="button" className="btn btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '8rem', textAlign: 'center'}}>
            {page} / {totalPages}
          </span>
          <button type="button" className="btn btn-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
          <button type="button" className="btn btn-secondary" disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)}>
            »»
          </button>
        </div>
      </div>
      {allRows.length === 0 ? <p>Lista vazia. Adicione a partir do browser de servidores.</p> : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Mapa</th>
              <th>PP</th>
              <th>Forn.</th>
              <th>Mods</th>
              <th>Hora</th>
              <th>Jog.</th>
              <th>Endereço</th>
              <th>Ping</th>
              <th>Dist.</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((row) => {
              const qf = s.quickFavorite;
              const isQuick =
                !!qf &&
                row.queryHost.trim().toLowerCase() === qf.ip.trim().toLowerCase() &&
                row.gamePort === qf.gamePort &&
                row.queryPort === qf.queryPort;
              return (
                <tr key={rowKey(row)}>
                  <td style={{maxWidth: '14rem', whiteSpace: 'normal'}}>
                    {row.name}
                    {isQuick ? <span style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.35rem'}}>(rápido)</span> : null}
                  </td>
                  <td>{row.mapName}</td>
                  <td>{row.perspective}</td>
                  <td>{row.provider}</td>
                  <td>{row.modded ? 'sim' : 'não'}</td>
                  <td>{row.inGameTime}</td>
                  <td>
                    {row.players}/{row.maxPlayers}
                  </td>
                  <td>{row.address}</td>
                  <td>{row.ping}</td>
                  <td>{row.distanceLabel}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => App.LaunchConnect(row).catch((e) => setErr(String(e)))}>
                        Ligar
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => enrichMods(row)}>
                        Mods A2S
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          const k = favoriteKeyParts(row.queryHost, row.gamePort, row.queryPort);
                          const matchesQuick = s.quickFavorite != null && favoriteKey(s.quickFavorite) === k;
                          App.RemoveFavorite(row.queryHost, row.gamePort, row.queryPort)
                            .then(() => (matchesQuick ? App.ClearQuickFavorite() : Promise.resolve()))
                            .then(reload)
                            .catch((e) => setErr(String(e)));
                        }}
                      >
                        Remover
                      </button>
                    </div>
                    {row.workshopModIds?.length ? <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '12rem'}}>{row.workshopModIds.join(', ')}</div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
