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

export function ServerBrowserPage() {
  const [raw, setRaw] = useState<domain.ServerRow[]>([]);
  const [filtered, setFiltered] = useState<domain.ServerRow[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [maps, setMaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [bmId, setBmId] = useState('');

  const applyFilters = useCallback(async () => {
    const f = filters;
    const out = await App.ApplyServerFilters(raw, f);
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
      return domain.FilterState.createFrom({...prev, [key]: nextBool});
    });
  };

  const fetchSteam = () => {
    setLoading(true);
    setErr('');
    App.FetchSteamServers()
      .then((rows) => {
        setRaw(rows);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const ping = () => {
    setLoading(true);
    App.RefreshServersPing(filtered)
      .then((updated) => {
        setFiltered(updated);
        const key = (r: domain.ServerRow) => r.queryHost + ':' + r.queryPort + ':' + r.address;
        const umap = new Map(updated.map((r) => [key(r), r]));
        setRaw((prev) => prev.map((r) => umap.get(key(r)) || r));
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const scanLan = () => {
    setLoading(true);
    setErr('');
    App.ScanLAN()
      .then(setRaw)
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
      .then((row) => setRaw([row]))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const enrichMods = (row: domain.ServerRow) => {
    App.EnrichServerMods(row.queryHost, row.queryPort)
      .then((ids) => {
        const next = filtered.map((r) => (r.address === row.address && r.queryPort === row.queryPort ? domain.ServerRow.createFrom({...r, workshopModIds: ids}) : r));
        setFiltered(next);
        setRaw((prev) => prev.map((r) => (r.address === row.address && r.queryPort === row.queryPort ? domain.ServerRow.createFrom({...r, workshopModIds: ids}) : r)));
      })
      .catch((e) => setErr(String(e)));
  };

  const rowsMemo = useMemo(() => filtered, [filtered]);

  return (
    <div>
      <h1 style={{marginTop: 0}}>Browser de servidores</h1>
      {err ? <div className="msg msg-error">{err}</div> : null}
      <div className="toolbar">
        <button type="button" className="btn" disabled={loading} onClick={fetchSteam}>
          Carregar lista Steam
        </button>
        <button type="button" className="btn btn-secondary" disabled={loading || !filtered.length} onClick={ping}>
          Atualizar ping (A2S)
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
      <div className="field">
        <label>Pesquisa (nome, mapa, IP)</label>
        <input value={filters.searchSubstring} onChange={(e) => setFilters(domain.FilterState.createFrom({...filters, searchSubstring: e.target.value}))} />
      </div>
      <div className="field">
        <label>Mapa</label>
        <select value={filters.mapEquals} onChange={(e) => setFilters(domain.FilterState.createFrom({...filters, mapEquals: e.target.value}))}>
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
      <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
        {loading ? 'A processar…' : `${rowsMemo.length} servidores visíveis (${raw.length} na fonte)`}
      </p>
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
            {rowsMemo.map((row) => (
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
