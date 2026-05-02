import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {useA2sModsHint} from '../../shared/useA2sModsHint';

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
  const {t} = useTranslation();
  const [raw, setRaw] = useState<domain.ServerRow[]>([]);
  const [filtered, setFiltered] = useState<domain.ServerRow[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [maps, setMaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [bmId, setBmId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modsHint, setModsHint] = useA2sModsHint();
  const [modsBusyKey, setModsBusyKey] = useState<string | null>(null);

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
    const rk = rowKey(row);
    setErr('');
    setModsHint(null);
    setModsBusyKey(rk);
    App.EnrichServerMods(row.queryHost, row.queryPort)
      .then((ids) => {
        const list = Array.isArray(ids) ? ids : [];
        const next = domain.ServerRow.createFrom({...row, workshopModIds: list});
        setFiltered((prev) => prev.map((r) => (rowKey(r) === rk ? next : r)));
        setRaw((prev) => prev.map((r) => (rowKey(r) === rk ? next : r)));
        const label = row.name || row.address;
        if (!list.length) {
          setModsHint({
            level: 'warn',
            text: t('browse.modsA2sNone', {name: label}),
          });
        } else {
          setModsHint({
            level: 'info',
            text: t('browse.modsA2sOk', {count: list.length, name: label}),
          });
        }
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setModsBusyKey(null));
  };

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  return (
    <div>
      <h1 style={{marginTop: 0}}>{t('browse.title')}</h1>
      {err ? <div className="msg msg-error">{err}</div> : null}
      {modsHint ? <div className={modsHint.level === 'warn' ? 'msg msg-warn' : 'msg msg-info'}>{modsHint.text}</div> : null}
      <div className="toolbar">
        <button type="button" className="btn" disabled={loading} onClick={fetchSteam}>
          {t('browse.loadSteam')}
        </button>
        <button type="button" className="btn btn-secondary" disabled={loading || pageSlice.length === 0} onClick={ping} title={t('browse.refreshPingTitle')}>
          {t('browse.refreshPing')}
        </button>
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={scanLan}>
          {t('browse.scanLan')}
        </button>
      </div>
      <div className="toolbar">
        <input value={bmId} onChange={(e) => setBmId(e.target.value)} placeholder={t('browse.bmPlaceholder')} style={{width: '10rem'}} />
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={resolveBm}>
          {t('browse.resolveId')}
        </button>
      </div>
      <div className="toolbar" style={{alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'}}>
        <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{t('browse.perPage')}</span>
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
          <option value="custom">{t('browse.other')}</option>
        </select>
        <label style={{display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
          {t('browse.number')}
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
        <label>{t('browse.searchLabel')}</label>
        <input value={filters.searchSubstring} onChange={(e) => setFilters(patchFilter(filters, {searchSubstring: e.target.value}))} />
      </div>
      <div className="field">
        <label>{t('browse.map')}</label>
        <select value={filters.mapEquals} onChange={(e) => setFilters(patchFilter(filters, {mapEquals: e.target.value}))}>
          <option value="">{t('browse.allMaps')}</option>
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
          {t('browse.f1pp')}
        </label>
        <label>
          <input type="checkbox" checked={filters.exclude3PP} onChange={toggleFilter('exclude3PP')} />
          {t('browse.f3pp')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeDay} onChange={toggleFilter('excludeDay')} />
          {t('browse.fDay')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeNight} onChange={toggleFilter('excludeNight')} />
          {t('browse.fNight')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeEmpty} onChange={toggleFilter('excludeEmpty')} />
          {t('browse.fEmpty')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeFull} onChange={toggleFilter('excludeFull')} />
          {t('browse.fFull')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeLowPop} onChange={toggleFilter('excludeLowPop')} />
          {t('browse.fLowPop')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeNonASCII} onChange={toggleFilter('excludeNonASCII')} />
          {t('browse.fAscii')}
        </label>
        <label>
          <input type="checkbox" checked={filters.deduplicateByName} onChange={toggleFilter('deduplicateByName')} />
          {t('browse.fDedupe')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeOfficial} onChange={toggleFilter('excludeOfficial')} />
          {t('browse.fOfficial')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeUnofficial} onChange={toggleFilter('excludeUnofficial')} />
          {t('browse.fUnofficial')}
        </label>
        <label>
          <input type="checkbox" checked={filters.excludeNonModded} onChange={toggleFilter('excludeNonModded')} />
          {t('browse.fNoMods')}
        </label>
      </div>
      <div className="toolbar" style={{justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'}}>
        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0}}>
          {loading ? t('common.processing') : t('browse.pageLine', {slice: pageSlice.length, filtered: filtered.length, raw: raw.length})}
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
              <th>{t('browse.thName')}</th>
              <th>{t('browse.thMap')}</th>
              <th>{t('browse.thPP')}</th>
              <th>{t('browse.thProv')}</th>
              <th>{t('browse.thMods')}</th>
              <th>{t('browse.thTime')}</th>
              <th>{t('browse.thPlayers')}</th>
              <th>{t('browse.thAddr')}</th>
              <th>{t('browse.thPing')}</th>
              <th>{t('browse.thDist')}</th>
              <th>{t('browse.thActions')}</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((row) => (
              <tr key={rowKey(row)}>
                <td style={{maxWidth: '14rem', whiteSpace: 'normal'}}>{row.name}</td>
                <td>{row.mapName}</td>
                <td>{row.perspective}</td>
                <td>{row.provider}</td>
                <td>{row.modded ? t('common.yes') : t('common.no')}</td>
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
                      {t('browse.connect')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => App.ToggleFavoriteRow(row).catch((e) => setErr(String(e)))}>
                      {t('browse.fav')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => App.SetQuickFavorite(row, window.prompt(t('browse.quickFavPrompt'), row.name) || row.name).catch((e) => setErr(String(e)))}>
                      {t('browse.quickFav')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={modsBusyKey === rowKey(row)}
                      title={t('browse.modsA2STitle')}
                      onClick={() => enrichMods(row)}
                    >
                      {modsBusyKey === rowKey(row) ? t('browse.modsA2SBusy') : t('browse.modsA2S')}
                    </button>
                  </div>
                  {row.workshopModIds && row.workshopModIds.length > 0 ? (
                    <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '14rem'}}>{row.workshopModIds.join(', ')}</div>
                  ) : row.workshopModIds && row.workshopModIds.length === 0 ? (
                    <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '14rem'}}>{t('browse.rulesNoWorkshop')}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
