import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {BookmarkPlus, ChevronDown, ChevronUp, ListFilter, Package, Play, Radar, Server, Star} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {browseSessionPayload, loadBrowseSessionMigrate} from './browseSession';
import {mapQuickFavError} from '../../shared/favoriteRows';
import {DsSelect} from '../../shared/DsSelect';
import {PageHeader} from '../../shared/PageHeader';
import {ServerAddressCell} from '../../shared/ServerAddressCell';
import {ServerJoinModal} from '../../shared/ServerJoinModal';

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
  const [browseReady, setBrowseReady] = useState(false);
  const [raw, setRaw] = useState<domain.ServerRow[]>([]);
  const [filtered, setFiltered] = useState<domain.ServerRow[]>([]);
  const [filters, setFilters] = useState(() => defaultFilters());
  const [knownMapNames, setKnownMapNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [bmId, setBmId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => clampPageSize(10));
  const [joinModalRow, setJoinModalRow] = useState<domain.ServerRow | null>(null);
  const [filtersListOpen, setFiltersListOpen] = useState(true);

  const browseRef = useRef({
    filters: defaultFilters(),
    raw: [] as domain.ServerRow[],
    page: 1,
    pageSize: clampPageSize(10),
    filtersListOpen: true,
    bmId: '',
  });
  browseRef.current = {filters, raw, page, pageSize, filtersListOpen, bmId};

  useEffect(() => {
    let cancelled = false;
    loadBrowseSessionMigrate()
      .then((snap) => {
        if (cancelled || !snap) {
          return;
        }
        if (Array.isArray(snap.raw) && snap.raw.length > 0) {
          setRaw(snap.raw.map((x) => domain.ServerRow.createFrom(x)));
        }
        setFilters(domain.FilterState.createFrom(snap.filters as Record<string, unknown>));
        setBmId(snap.bmId != null ? String(snap.bmId) : '');
        const p = snap.page;
        if (p != null && Number.isFinite(p)) {
          setPage(Math.max(1, Math.floor(p)));
        }
        const n = snap.pageSize;
        if (n != null && Number.isFinite(n)) {
          setPageSize(clampPageSize(n));
        }
        setFiltersListOpen(snap.filtersListOpen !== false);
      })
      .finally(() => {
        if (!cancelled) {
          setBrowseReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!browseReady) {
      return;
    }
    const id = window.setTimeout(() => {
      const s = browseRef.current;
      void App.SaveBrowseSession(
        JSON.stringify(browseSessionPayload(filterFields(s.filters), s.raw, s.page, s.pageSize, s.filtersListOpen, s.bmId)),
      );
    }, 250);
    return () => {
      window.clearTimeout(id);
      const s = browseRef.current;
      void App.SaveBrowseSession(
        JSON.stringify(browseSessionPayload(filterFields(s.filters), s.raw, s.page, s.pageSize, s.filtersListOpen, s.bmId)),
      );
    };
  }, [browseReady, filters, raw, page, pageSize, filtersListOpen, bmId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [filtered.length, pageSize, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const patchJoinRow = useCallback((next: domain.ServerRow) => {
    const rk = rowKey(next);
    setFiltered((prev) => prev.map((r) => (rowKey(r) === rk ? next : r)));
    setRaw((prev) => prev.map((r) => (rowKey(r) === rk ? next : r)));
  }, []);

  const applyFilters = useCallback(async () => {
    const plain = filterFields(filters);
    const out = await App.ApplyServerFilters(raw, domain.FilterState.createFrom(plain));
    setFiltered(out);
  }, [raw, filters]);

  useEffect(() => {
    applyFilters().catch((e) => setErr(String(e)));
  }, [applyFilters]);

  useEffect(() => {
    App.LoadSettings()
      .then((st) => {
        setKnownMapNames(Array.isArray(st.knownMapNames) ? st.knownMapNames : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (raw.length === 0) {
      return;
    }
    App.MergeKnownMapNamesFromRows(raw)
      .then(setKnownMapNames)
      .catch(() => {});
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

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  const perPageSelectOptions = useMemo(
    () => [...PAGE_PRESETS.map((n) => ({value: String(n), label: String(n)})), {value: 'custom', label: t('browse.other')}],
    [t],
  );

  const mapSelectOptions = useMemo(() => {
    const sorted = [...knownMapNames].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
    return [{value: '', label: t('browse.allMaps')}, ...sorted.map((m) => ({value: m, label: m}))];
  }, [knownMapNames, t]);

  if (!browseReady) {
    return (
      <div>
        <PageHeader icon={Server} title={t('browse.title')} description={t('browse.subtitle')} />
        <p className="msg">{t('common.processing')}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon={Server} title={t('browse.title')} description={t('browse.subtitle')} />
      {err ? <div className="msg msg-error">{err}</div> : null}

      <div className="browse-layout">
        <div className="browse-main">
          <section className="ds-card browse-search-card" aria-label={t('browse.searchLabel')}>
            <div className="browse-search-row">
              <div className="field browse-search-field">
                <label htmlFor="browse-search">{t('browse.searchLabel')}</label>
                <input id="browse-search" value={filters.searchSubstring} onChange={(e) => setFilters(patchFilter(filters, {searchSubstring: e.target.value}))} />
              </div>
              <div className="field browse-map-field">
                <label htmlFor="browse-map">{t('browse.map')}</label>
                <DsSelect id="browse-map" value={filters.mapEquals} options={mapSelectOptions} onChange={(v) => setFilters(patchFilter(filters, {mapEquals: v}))} />
              </div>
              <div className="browse-search-actions">
                <button type="button" className="btn" disabled={loading} onClick={fetchSteam}>
                  {t('browse.searchList')}
                </button>
              </div>
            </div>
          </section>

          <section className="ds-card browse-table-card" aria-labelledby="browse-table-title">
            <h2 id="browse-table-title" className="ds-section-title">
              <Server size={16} strokeWidth={1.75} aria-hidden />
              {t('browse.tableTitle')}
            </h2>
            <div className="browse-table-toolbar">
              <p className="browse-page-line">
                {loading ? t('common.processing') : t('browse.pageLine', {slice: pageSlice.length, filtered: filtered.length, raw: raw.length})}
              </p>
              <div className="browse-table-toolbar-actions">
                <span className="browse-toolbar-label">{t('browse.perPage')}</span>
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
                <label className="browse-page-size-num">
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
                  />
                </label>
                <div className="browse-pagination-btns">
                  <button type="button" className="btn btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                    ««
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                    ‹
                  </button>
                  <span className="browse-page-indicator" aria-live="polite">
                    {page} / {totalPages}
                  </span>
                  <button type="button" className="btn btn-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                    ›
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)} aria-label={t('browse.pageLast')}>
                    »»
                  </button>
                </div>
                <button type="button" className="btn btn-secondary" disabled={loading || pageSlice.length === 0} onClick={ping} title={t('browse.refreshPingTitle')}>
                  {t('browse.refreshPing')}
                </button>
              </div>
            </div>
            <div className="table-wrap browse-table-scroll">
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
                      <td style={{maxWidth: '18rem', whiteSpace: 'normal'}}>
                        <ServerAddressCell address={row.address} />
                      </td>
                      <td>{row.ping}</td>
                      <td>{row.distanceLabel}</td>
                      <td>
                        <div className="row-actions row-actions-icon-only">
                          <button type="button" className="btn btn-secondary" title={t('browse.connectTitle')} aria-label={t('browse.connect')} onClick={() => setJoinModalRow(row)}>
                            <Play size={14} strokeWidth={2} aria-hidden />
                          </button>
                          <button type="button" className="btn btn-secondary" title={t('browse.favTitle')} aria-label={t('browse.fav')} onClick={() => App.ToggleFavoriteRow(row).catch((e) => setErr(String(e)))}>
                            <Star size={14} strokeWidth={2} aria-hidden />
                          </button>
                          <button type="button" className="btn btn-secondary" title={t('browse.quickFavTitle')} aria-label={t('browse.quickFav')} onClick={() => App.SetQuickFavorite(row, window.prompt(t('browse.quickFavPrompt'), row.name) || row.name).catch((e) => setErr(mapQuickFavError(String(e), t)))}>
                            <BookmarkPlus size={14} strokeWidth={2} aria-hidden />
                          </button>
                          <button type="button" className="btn btn-secondary" title={t('browse.joinPanelModsTitle')} aria-label={t('browse.joinPanelMods')} onClick={() => setJoinModalRow(row)}>
                            <Package size={14} strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="browse-sidebar">
          <section className="ds-card browse-filters-card" aria-labelledby="browse-filters-title">
            <div className="browse-filters-header">
              <h2 id="browse-filters-title" className="ds-section-title">
                <ListFilter size={16} strokeWidth={1.75} aria-hidden />
                {t('browse.filtersTitle')}
              </h2>
              <button
                type="button"
                className="browse-filters-toggle"
                onClick={() => setFiltersListOpen((o) => !o)}
                aria-expanded={filtersListOpen}
                aria-controls="browse-filters-list"
                title={filtersListOpen ? t('browse.toggleFiltersHide') : t('browse.toggleFiltersShow')}
              >
                {filtersListOpen ? <ChevronUp size={18} strokeWidth={2} aria-hidden /> : <ChevronDown size={18} strokeWidth={2} aria-hidden />}
                <span className="sr-only">{filtersListOpen ? t('browse.toggleFiltersHide') : t('browse.toggleFiltersShow')}</span>
              </button>
            </div>
            {filtersListOpen ? (
              <div id="browse-filters-list" className="browse-filters-scroll" role="group" aria-label={t('browse.filtersTitle')}>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.exclude1PP} onChange={toggleFilter('exclude1PP')} />
                <span>{t('browse.f1pp')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.exclude3PP} onChange={toggleFilter('exclude3PP')} />
                <span>{t('browse.f3pp')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeDay} onChange={toggleFilter('excludeDay')} />
                <span>{t('browse.fDay')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeNight} onChange={toggleFilter('excludeNight')} />
                <span>{t('browse.fNight')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeEmpty} onChange={toggleFilter('excludeEmpty')} />
                <span>{t('browse.fEmpty')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeFull} onChange={toggleFilter('excludeFull')} />
                <span>{t('browse.fFull')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeLowPop} onChange={toggleFilter('excludeLowPop')} />
                <span>{t('browse.fLowPop')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeNonASCII} onChange={toggleFilter('excludeNonASCII')} />
                <span>{t('browse.fAscii')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.deduplicateByName} onChange={toggleFilter('deduplicateByName')} />
                <span>{t('browse.fDedupe')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeOfficial} onChange={toggleFilter('excludeOfficial')} />
                <span>{t('browse.fOfficial')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeUnofficial} onChange={toggleFilter('excludeUnofficial')} />
                <span>{t('browse.fUnofficial')}</span>
              </label>
              <label className="browse-filter-row">
                <input type="checkbox" checked={filters.excludeNonModded} onChange={toggleFilter('excludeNonModded')} />
                <span>{t('browse.fNoMods')}</span>
              </label>
            </div>
            ) : null}
          </section>

          <section className="ds-card browse-sources-card" aria-labelledby="browse-sources-title">
            <h2 id="browse-sources-title" className="ds-section-title">
              <Radar size={16} strokeWidth={1.75} aria-hidden />
              {t('browse.otherSources')}
            </h2>
            <div className="browse-sources-stack">
              <button type="button" className="btn btn-secondary" disabled={loading} onClick={scanLan}>
                {t('browse.scanLan')}
              </button>
              <div className="field browse-bm-field">
                <label htmlFor="browse-bm-id">{t('browse.bmIdLabel')}</label>
                <input id="browse-bm-id" value={bmId} onChange={(e) => setBmId(e.target.value)} placeholder={t('browse.bmPlaceholder')} autoComplete="off" />
              </div>
              <button type="button" className="btn btn-secondary" disabled={loading} onClick={resolveBm}>
                {t('browse.resolveId')}
              </button>
            </div>
          </section>
        </aside>
      </div>
      {joinModalRow ? <ServerJoinModal row={joinModalRow} onClose={() => setJoinModalRow(null)} onRowPatched={patchJoinRow} /> : null}
    </div>
  );
}
