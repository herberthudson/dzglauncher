import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ListFilter, Radar, Rows3, Server} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {DsSelect} from '../../shared/DsSelect';
import {PageHeader} from '../../shared/PageHeader';
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

  const perPageSelectOptions = useMemo(
    () => [...PAGE_PRESETS.map((n) => ({value: String(n), label: String(n)})), {value: 'custom', label: t('browse.other')}],
    [t],
  );

  const mapSelectOptions = useMemo(
    () => [{value: '', label: t('browse.allMaps')}, ...maps.map((m) => ({value: m, label: m}))],
    [maps, t],
  );

  return (
    <div>
      <PageHeader icon={Server} title={t('browse.title')} description={t('browse.subtitle')} />
      {err ? <div className="msg msg-error">{err}</div> : null}
      {modsHint ? <div className={modsHint.level === 'warn' ? 'msg msg-warn' : 'msg msg-info'}>{modsHint.text}</div> : null}

      <section className="ds-card" aria-labelledby="browse-sources-title">
        <h2 id="browse-sources-title" className="ds-section-title">
          <Radar size={16} strokeWidth={1.75} aria-hidden />
          {t('browse.sourcesTitle')}
        </h2>
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
        <div className="field-row">
          <div className="field" style={{flex: '1 1 12rem', maxWidth: '20rem', marginBottom: 0}}>
            <label htmlFor="browse-bm-id">{t('browse.bmIdLabel')}</label>
            <input id="browse-bm-id" value={bmId} onChange={(e) => setBmId(e.target.value)} placeholder={t('browse.bmPlaceholder')} autoComplete="off" />
          </div>
          <button type="button" className="btn btn-secondary" disabled={loading} onClick={resolveBm}>
            {t('browse.resolveId')}
          </button>
        </div>
      </section>

      <section className="ds-card" aria-labelledby="browse-pagination-title">
        <h2 id="browse-pagination-title" className="ds-section-title">
          <Rows3 size={16} strokeWidth={1.75} aria-hidden />
          {t('browse.paginationTitle')}
        </h2>
        <div className="toolbar" style={{alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'}}>
          <span style={{fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600}}>{t('browse.perPage')}</span>
          <DsSelect
            ariaLabel={t('browse.perPage')}
            width="auto"
            className="ds-select-w-compact"
            value={presetValue}
            options={perPageSelectOptions}
            onChange={(v) => {
              if (v === 'custom') {
                return;
              }
              setPageSize(parseInt(v, 10));
              setPage(1);
            }}
          />
          <label style={{display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-muted)'}}>
            <span>{t('browse.number')}</span>
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
              style={{width: '4.5rem', maxWidth: 'none'}}
            />
          </label>
        </div>
        <div className="field">
          <label htmlFor="browse-search">{t('browse.searchLabel')}</label>
          <input id="browse-search" value={filters.searchSubstring} onChange={(e) => setFilters(patchFilter(filters, {searchSubstring: e.target.value}))} />
        </div>
        <div className="field">
          <label htmlFor="browse-map">{t('browse.map')}</label>
          <DsSelect id="browse-map" value={filters.mapEquals} options={mapSelectOptions} onChange={(v) => setFilters(patchFilter(filters, {mapEquals: v}))} />
        </div>
      </section>

      <section className="ds-card" aria-labelledby="browse-filters-title">
        <h2 id="browse-filters-title" className="ds-section-title">
          <ListFilter size={16} strokeWidth={1.75} aria-hidden />
          {t('browse.filtersTitle')}
        </h2>
        <div className="grid-filters" role="group" aria-label={t('browse.filtersTitle')}>
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
      </section>

      <section className="ds-card" aria-labelledby="browse-table-title">
        <h2 id="browse-table-title" className="ds-section-title">
          <Server size={16} strokeWidth={1.75} aria-hidden />
          {t('browse.tableTitle')}
        </h2>
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
          <caption className="sr-only">{t('browse.tableCaption')}</caption>
          <thead>
            <tr>
              <th scope="col" title={t('browse.thNameLong')}>
                {t('browse.thName')}
              </th>
              <th scope="col" title={t('browse.thMapLong')}>
                {t('browse.thMap')}
              </th>
              <th scope="col" title={t('browse.thPPLong')}>
                {t('browse.thPP')}
              </th>
              <th scope="col" title={t('browse.thProvLong')}>
                {t('browse.thProv')}
              </th>
              <th scope="col" title={t('browse.thModsLong')}>
                {t('browse.thMods')}
              </th>
              <th scope="col" title={t('browse.thTimeLong')}>
                {t('browse.thTime')}
              </th>
              <th scope="col" title={t('browse.thPlayersLong')}>
                {t('browse.thPlayers')}
              </th>
              <th scope="col" title={t('browse.thAddrLong')}>
                {t('browse.thAddr')}
              </th>
              <th scope="col" title={t('browse.thPingLong')}>
                {t('browse.thPing')}
              </th>
              <th scope="col" title={t('browse.thDistLong')}>
                {t('browse.thDist')}
              </th>
              <th scope="col" title={t('browse.thActionsLong')}>
                {t('browse.thActions')}
              </th>
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
                    <button type="button" className="btn btn-secondary" title={t('browse.connectTitle')} onClick={() => App.LaunchConnect(row).catch((e) => setErr(String(e)))}>
                      {t('browse.connect')}
                    </button>
                    <button type="button" className="btn btn-secondary" title={t('browse.favTitle')} onClick={() => App.ToggleFavoriteRow(row).catch((e) => setErr(String(e)))}>
                      {t('browse.fav')}
                    </button>
                    <button type="button" className="btn btn-secondary" title={t('browse.quickFavTitle')} onClick={() => App.SetQuickFavorite(row, window.prompt(t('browse.quickFavPrompt'), row.name) || row.name).catch((e) => setErr(String(e)))}>
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
      </section>
    </div>
  );
}
