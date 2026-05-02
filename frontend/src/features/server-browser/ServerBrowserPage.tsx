import {useCallback, useEffect, useMemo, useState} from 'react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';

function defaultFilters(): domain.FilterState {
  return domain.FilterState.createFrom({
    exclude1PP: false,
    exclude3PP: false,
    excludeDay: false,
    excludeNight: false,
    excludeEmpty: false,
    excludeFull: false,
    excludeLowPop: false,
    lowPopThresholdPct: 30,
    excludeNonASCII: false,
    deduplicateByName: false,
    excludeOfficial: false,
    excludeUnofficial: false,
    excludeNonModded: false,
    mapEquals: '',
    searchSubstring: '',
  });
}

function rowKey(r: domain.ServerRow) {
  return r.queryHost + ':' + r.queryPort + ':' + r.address;
}

function filterFields(f: domain.FilterState) {
  return {
    exclude1PP: !!f.exclude1PP,
    exclude3PP: !!f.exclude3PP,
    excludeDay: !!f.excludeDay,
    excludeNight: !!f.excludeNight,
    excludeEmpty: !!f.excludeEmpty,
    excludeFull: !!f.excludeFull,
    excludeLowPop: !!f.excludeLowPop,
    lowPopThresholdPct: f.lowPopThresholdPct ?? 30,
    excludeNonASCII: !!f.excludeNonASCII,
    deduplicateByName: !!f.deduplicateByName,
    excludeOfficial: !!f.excludeOfficial,
    excludeUnofficial: !!f.excludeUnofficial,
    excludeNonModded: !!f.excludeNonModded,
    mapEquals: f.mapEquals ?? '',
    searchSubstring: f.searchSubstring ?? '',
  };
}

function patchFilter(base: domain.FilterState, patch: Partial<ReturnType<typeof filterFields>>): domain.FilterState {
  return domain.FilterState.createFrom({...filterFields(base), ...patch});
}

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

export function ServerBrowserPage() {
  const [raw, setRaw] = useState<domain.ServerRow[]>([]);
  const [filtered, setFiltered] = useState<domain.ServerRow[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [maps, setMaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [bmId, setBmId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [filtered.length, pageSize, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const applyFilters = useCallback(async () => {
    const plain = filterFields(filters);
    const out = await App.ApplyServerFilters(raw, domain.FilterState.createFrom(plain));
    setFiltered(out);
  }, [raw, filters]);

  useEffect(() => {
    applyFilters().catch((e) => setErr(String(e)));
  }, [applyFilters]);

  useEffect(() => {
    if (raw.length) {
      App.DiscoverMapNames(raw).then(setMaps).catch(() => {});
    } else {
      setMaps([]);
    }
  }, [raw]);

  const toggleFilter = (key: keyof domain.FilterState) => () => {
    setFilters((prev) => {
      const cur = prev[key];
      const nextBool = typeof cur === 'boolean' ? !cur : cur;
      return patchFilter(prev, {[key]: nextBool} as Partial<ReturnType<typeof filterFields>>);
    });
  };

  const fetchSteam = () => {
    setLoading(true);
    setErr('');
    App.FetchSteamServers()
      .then((rows) => {
        setRaw(rows);
        setPage(1);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const ping = () => {
    if (pageSlice.length === 0) {
      return;
    }
    setLoading(true);
    App.RefreshServersPing(pageSlice)
      .then((updated) => {
        const umap = new Map(updated.map((r) => [rowKey(r), r]));
        setFiltered((prev) => prev.map((r) => umap.get(rowKey(r)) ?? r));
        setRaw((prev) => prev.map((r) => umap.get(rowKey(r)) ?? r));
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const scanLan = () => {
    setLoading(true);
    setErr('');
    App.ScanLAN()
      .then((rows) => {
        setRaw(rows);
        setPage(1);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const resolveBm = () => {
    if (!bmId.trim()) {
      return;
    }
    setLoading(true);
    setErr('');
    App.ResolveBattlemetricsID(bmId.trim())
      .then((row) => {
        setRaw([row]);
        setPage(1);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const enrichMods = (row: domain.ServerRow) => {
    App.EnrichServerMods(row.queryHost, row.queryPort)
      .then((ids) => {
        setFiltered((prev) =>
          prev.map((r) => (r.address === row.address && r.queryPort === row.queryPort ? domain.ServerRow.createFrom({...r, workshopModIds: ids}) : r)),
        );
        setRaw((prev) =>
          prev.map((r) => (r.address === row.address && r.queryPort === row.queryPort ? domain.ServerRow.createFrom({...r, workshopModIds: ids}) : r)),
        );
      })
      .catch((e) => setErr(String(e)));
  };

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  return (
    <div>
      <h1 style={{marginTop: 0}}>Browser de servidores</h1>
      {err ? <div className="msg msg-error">{err}</div> : null}
      <div className="toolbar">
        <button type="button" className="btn" disabled={loading} onClick={fetchSteam}>
          Carregar lista Steam
        </button>
        <button type="button" className="btn btn-secondary" disabled={loading || pageSlice.length === 0} onClick={ping} title="Apenas servidores desta página">
          Atualizar ping (A2S) — página atual
        </button>
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={scanLan}>
          Escanear LAN
        </button>
      </div>
      <div className="toolbar">
        <input value={bmId} onChange={(e) => setBmId(e.target.value)} placeholder="ID Battlemetrics" style={{width: '10rem'}} />
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={resolveBm}>
          Resolver ID
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
      <div className="field">
        <label>Pesquisa (nome, mapa, IP)</label>
        <input value={filters.searchSubstring} onChange={(e) => setFilters(patchFilter(filters, {searchSubstring: e.target.value}))} />
      </div>
      <div className="field">
        <label>Mapa</label>
        <select value={filters.mapEquals} onChange={(e) => setFilters(patchFilter(filters, {mapEquals: e.target.value}))}>
          <option value="">Todos os mapas</option>
          {maps.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="grid-filters">
        <label>
          <input type="checkbox" checked={filters.exclude1PP} onChange={toggleFilter('exclude1PP')} />
          Excluir 1PP
        </label>
        <label>
          <input type="checkbox" checked={filters.exclude3PP} onChange={toggleFilter('exclude3PP')} />
          Excluir 3PP
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeDay} onChange={toggleFilter('excludeDay')} />
          Excluir dia (hora in-game)
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeNight} onChange={toggleFilter('excludeNight')} />
          Excluir noite
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeEmpty} onChange={toggleFilter('excludeEmpty')} />
          Excluir vazios
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeFull} onChange={toggleFilter('excludeFull')} />
          Excluir cheios
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeLowPop} onChange={toggleFilter('excludeLowPop')} />
          Excluir acima do limiar de baixa pop.
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeNonASCII} onChange={toggleFilter('excludeNonASCII')} />
          Excluir nomes não-ASCII
        </label>
        <label>
          <input type="checkbox" checked={filters.deduplicateByName} onChange={toggleFilter('deduplicateByName')} />
          Duplicados por nome
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeOfficial} onChange={toggleFilter('excludeOfficial')} />
          Excluir oficiais
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeUnofficial} onChange={toggleFilter('excludeUnofficial')} />
          Excluir não oficiais
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeNonModded} onChange={toggleFilter('excludeNonModded')} />
          Excluir sem mods
        </label>
      </div>
      <div className="toolbar" style={{justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'}}>
        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0}}>
          {loading ? 'A processar…' : `Página: ${pageSlice.length} linhas · ${filtered.length} filtrados · ${raw.length} na fonte`}
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
            {pageSlice.map((row) => (
              <tr key={row.address + ':' + row.queryPort}>
                <td style={{maxWidth: '14rem', whiteSpace: 'normal'}}>{row.name}</td>
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
                    <button type="button" className="btn btn-secondary" onClick={() => App.ToggleFavoriteRow(row).catch((e) => setErr(String(e)))}>
                      Fav
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => App.SetQuickFavorite(row, window.prompt('Etiqueta', row.name) || row.name).catch((e) => setErr(String(e)))}>
                      Fav rápido
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => enrichMods(row)}>
                      Mods A2S
                    </button>
                  </div>
                  {row.workshopModIds?.length ? <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '12rem'}}>{row.workshopModIds.join(', ')}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
