import {createEffect, createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {BookmarkPlus, ChevronDown, ChevronUp, ListFilter, Package, Play, Radar, Server, Star, X} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {browseSessionPayload, loadBrowseSessionMigrate} from './browseSession';
import {mapQuickFavError} from '../../shared/favoriteRows';
import {DsSelect} from '../../shared/DsSelect';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {formatPlayersWithQueue} from '../../shared/formatPlayersWithQueue';
import {ServerAddressCell} from '../../shared/ServerAddressCell';
import {ServerJoinModal} from '../../shared/ServerJoinModal';
import {ServerPasswordCell} from '../../shared/ServerPasswordCell';

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

export default function ServerBrowserPage() {
  const [t] = useTranslation();
  let applyFiltersGen = 0;
  const [browseReady, setBrowseReady] = createSignal(false);
  const [raw, setRaw] = createSignal<domain.ServerRow[]>([]);
  const [filtered, setFiltered] = createSignal<domain.ServerRow[]>([]);
  const [filters, setFilters] = createSignal(defaultFilters());
  const [knownMapNames, setKnownMapNames] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [err, setErr] = createSignal('');
  const [bmId, setBmId] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(clampPageSize(10));
  const [joinModalRow, setJoinModalRow] = createSignal<domain.ServerRow | null>(null);
  const [filtersListOpen, setFiltersListOpen] = createSignal(true);

  onMount(() => {
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
  });

  const persistBrowse = () => {
    void App.SaveBrowseSession(
      JSON.stringify(
        browseSessionPayload(filterFields(filters()), raw(), page(), pageSize(), filtersListOpen(), bmId()),
      ),
    );
  };

  createEffect(() => {
    if (!browseReady()) {
      return;
    }
    void filters();
    void raw();
    void page();
    void pageSize();
    void filtersListOpen();
    void bmId();
    const id = window.setTimeout(persistBrowse, 250);
    onCleanup(() => {
      window.clearTimeout(id);
      persistBrowse();
    });
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(filtered().length / pageSize()) || 1));

  createEffect(() => {
    const tp = totalPages();
    setPage((p) => Math.min(Math.max(1, p), tp));
  });

  const pageSlice = createMemo(() => {
    const start = (page() - 1) * pageSize();
    return filtered().slice(start, start + pageSize());
  });

  const patchJoinRow = (next: domain.ServerRow) => {
    const rk = rowKey(next);
    setFiltered((prev) => prev.map((r) => (rowKey(r) === rk ? next : r)));
    setRaw((prev) => prev.map((r) => (rowKey(r) === rk ? next : r)));
  };

  createEffect(() => {
    void filters();
    void raw();
    if (!browseReady()) {
      return;
    }
    const gen = ++applyFiltersGen;
    const plain = filterFields(filters());
    const rawSnap = raw();
    void App.ApplyServerFilters(rawSnap, domain.FilterState.createFrom(plain))
      .then((out) => {
        if (gen !== applyFiltersGen) {
          return;
        }
        setFiltered(out);
      })
      .catch((e) => {
        if (gen === applyFiltersGen) {
          setErr(String(e));
        }
      });
  });

  onMount(() => {
    App.LoadSettings()
      .then((st) => {
        setKnownMapNames(Array.isArray(st.knownMapNames) ? st.knownMapNames : []);
      })
      .catch(() => {});
  });

  createEffect(() => {
    if (raw().length === 0) {
      return;
    }
    App.MergeKnownMapNamesFromRows(raw())
      .then(setKnownMapNames)
      .catch(() => {});
  });

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
    const sl = pageSlice();
    if (sl.length === 0) {
      return;
    }
    setLoading(true);
    App.RefreshServersPing(sl)
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
    if (!bmId().trim()) {
      return;
    }
    setLoading(true);
    setErr('');
    App.ResolveBattlemetricsID(bmId().trim())
      .then((row) => {
        setRaw([row]);
        setPage(1);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const mapSelectOptions = createMemo(() => {
    const sorted = [...knownMapNames()].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
    return [{value: '', label: t('browse.allMaps')}, ...sorted.map((m) => ({value: m, label: m}))];
  });

  return (
    <>
      <Show
        when={browseReady()}
        fallback={
          <div>
            <PageHeader icon={Server} title={t('browse.title')} description={t('browse.subtitle')} />
            <p class="msg">{t('common.processing')}</p>
          </div>
        }
      >
        <div>
          <PageHeader icon={Server} title={t('browse.title')} description={t('browse.subtitle')} />
          <Show when={!!err()}>
            <div class="msg msg-error">{err()}</div>
          </Show>

          <div class="browse-layout">
            <div class="browse-main">
              <section class="ds-card browse-search-card" aria-label={t('browse.searchLabel')}>
                <div class="browse-search-row">
                  <div class="field browse-search-field">
                    <label for="browse-search">{t('browse.searchLabel')}</label>
                    <div class="browse-field-input-row">
                      <input
                        id="browse-search"
                        value={filters().searchSubstring}
                        onInput={(e) => setFilters(patchFilter(filters(), {searchSubstring: e.currentTarget.value}))}
                      />
                      <button
                        type="button"
                        class="btn btn-secondary browse-input-clear"
                        disabled={!filters().searchSubstring}
                        aria-label={t('common.clearField')}
                        onClick={() => setFilters(patchFilter(filters(), {searchSubstring: ''}))}
                      >
                        <X size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div class="field browse-map-field">
                    <label for="browse-map">{t('browse.map')}</label>
                    <div class="browse-field-input-row">
                      <div class="browse-field-input-grow">
                        <DsSelect
                          id="browse-map"
                          value={filters().mapEquals}
                          options={mapSelectOptions()}
                          onChange={(v) => setFilters(patchFilter(filters(), {mapEquals: v}))}
                        />
                      </div>
                      <button
                        type="button"
                        class="btn btn-secondary browse-input-clear"
                        disabled={!filters().mapEquals}
                        aria-label={t('common.clearField')}
                        onClick={() => setFilters(patchFilter(filters(), {mapEquals: ''}))}
                      >
                        <X size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div class="browse-search-actions">
                    <button type="button" class="btn" disabled={loading()} onClick={fetchSteam}>
                      {t('browse.searchList')}
                    </button>
                  </div>
                </div>
              </section>

              <section class="ds-card browse-table-card" aria-labelledby="browse-table-title">
                <h2 id="browse-table-title" class="ds-section-title">
                  <Server size={16} strokeWidth={1.75} aria-hidden />
                  {t('browse.tableTitle')}
                </h2>
                <div class="browse-table-toolbar">
                  <p class="browse-page-line">
                    {loading()
                      ? t('common.processing')
                      : t('browse.pageLine', {slice: pageSlice().length, filtered: filtered().length, raw: raw().length})}
                  </p>
                  <div class="browse-table-toolbar-actions">
                    <span class="browse-toolbar-label">{t('browse.perPage')}</span>
                    <PageSizeInput
                      id="browse-page-size"
                      value={pageSize()}
                      disabled={loading()}
                      ariaLabel={t('browse.perPage')}
                      onChange={(n) => {
                        setPageSize(n);
                        setPage(1);
                      }}
                    />
                    <div class="browse-pagination-btns">
                      <button type="button" class="btn btn-secondary" disabled={page() <= 1 || loading()} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                        ««
                      </button>
                      <button type="button" class="btn btn-secondary" disabled={page() <= 1 || loading()} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                        ‹
                      </button>
                      <span class="browse-page-indicator" aria-live="polite">
                        {page()} / {totalPages()}
                      </span>
                      <button
                        type="button"
                        class="btn btn-secondary"
                        disabled={page() >= totalPages() || loading()}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label={t('browse.pageNext')}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary"
                        disabled={page() >= totalPages() || loading()}
                        onClick={() => setPage(totalPages())}
                        aria-label={t('browse.pageLast')}
                      >
                        »»
                      </button>
                    </div>
                    <button type="button" class="btn btn-secondary" disabled={loading() || pageSlice().length === 0} onClick={ping} title={t('browse.refreshPingTitle')}>
                      {t('browse.refreshPing')}
                    </button>
                  </div>
                </div>
                <div class="table-wrap browse-table-scroll">
                  <table class="data">
                    <caption class="sr-only">{t('browse.tableCaption')}</caption>
                    <thead>
                      <tr>
                        <th scope="col" title={t('browse.thNameLong')}>
                          {t('browse.thName')}
                        </th>
                        <th scope="col" class="server-password-th" title={t('browse.thPasswordLong')}>
                          {t('browse.thPassword')}
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
                      <For each={pageSlice()}>
                        {(row) => (
                          <tr>
                            <td style={{'max-width': '14rem', 'white-space': 'normal'}}>{row.name}</td>
                            <td class="server-password-td">
                              <ServerPasswordCell row={row} />
                            </td>
                            <td>{row.mapName}</td>
                            <td>{row.perspective}</td>
                            <td>{row.provider}</td>
                            <td>{row.modded ? t('common.yes') : t('common.no')}</td>
                            <td>{row.inGameTime}</td>
                            <td>{formatPlayersWithQueue(row.players, row.maxPlayers, row.queueSize)}</td>
                            <td style={{'max-width': '18rem', 'white-space': 'normal'}}>
                              <ServerAddressCell address={row.address} />
                            </td>
                            <td>{row.ping}</td>
                            <td>{row.distanceLabel}</td>
                            <td>
                              <div class="row-actions row-actions-icon-only">
                                <button type="button" class="btn btn-secondary" title={t('browse.connectTitle')} aria-label={t('browse.connect')} onClick={() => setJoinModalRow(row)}>
                                  <Play size={14} strokeWidth={2} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-secondary"
                                  title={t('browse.favTitle')}
                                  aria-label={t('browse.fav')}
                                  onClick={() => App.ToggleFavoriteRow(row).catch((e) => setErr(String(e)))}
                                >
                                  <Star size={14} strokeWidth={2} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-secondary"
                                  title={t('browse.quickFavTitle')}
                                  aria-label={t('browse.quickFav')}
                                  onClick={() =>
                                    App.SetQuickFavorite(row, window.prompt(t('browse.quickFavPrompt'), row.name) || row.name).catch((e) =>
                                      setErr(mapQuickFavError(String(e), t)),
                                    )
                                  }
                                >
                                  <BookmarkPlus size={14} strokeWidth={2} aria-hidden />
                                </button>
                                <button type="button" class="btn btn-secondary" title={t('browse.joinPanelModsTitle')} aria-label={t('browse.joinPanelMods')} onClick={() => setJoinModalRow(row)}>
                                  <Package size={14} strokeWidth={2} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside class="browse-sidebar">
              <section class="ds-card browse-filters-card" aria-labelledby="browse-filters-title">
                <div class="browse-filters-header">
                  <h2 id="browse-filters-title" class="ds-section-title">
                    <ListFilter size={16} strokeWidth={1.75} aria-hidden />
                    {t('browse.filtersTitle')}
                  </h2>
                  <button
                    type="button"
                    class="browse-filters-toggle"
                    onClick={() => setFiltersListOpen((o) => !o)}
                    aria-expanded={filtersListOpen()}
                    aria-controls="browse-filters-list"
                    title={filtersListOpen() ? t('browse.toggleFiltersHide') : t('browse.toggleFiltersShow')}
                  >
                    {filtersListOpen() ? <ChevronUp size={18} strokeWidth={2} aria-hidden /> : <ChevronDown size={18} strokeWidth={2} aria-hidden />}
                    <span class="sr-only">{filtersListOpen() ? t('browse.toggleFiltersHide') : t('browse.toggleFiltersShow')}</span>
                  </button>
                </div>
                <Show when={filtersListOpen()}>
                  <div id="browse-filters-list" class="browse-filters-scroll" role="group" aria-label={t('browse.filtersTitle')}>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().exclude1PP} onChange={toggleFilter('exclude1PP')} />
                      <span>{t('browse.f1pp')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().exclude3PP} onChange={toggleFilter('exclude3PP')} />
                      <span>{t('browse.f3pp')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeDay} onChange={toggleFilter('excludeDay')} />
                      <span>{t('browse.fDay')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeNight} onChange={toggleFilter('excludeNight')} />
                      <span>{t('browse.fNight')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeEmpty} onChange={toggleFilter('excludeEmpty')} />
                      <span>{t('browse.fEmpty')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeFull} onChange={toggleFilter('excludeFull')} />
                      <span>{t('browse.fFull')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeLowPop} onChange={toggleFilter('excludeLowPop')} />
                      <span>{t('browse.fLowPop')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeNonASCII} onChange={toggleFilter('excludeNonASCII')} />
                      <span>{t('browse.fAscii')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().deduplicateByName} onChange={toggleFilter('deduplicateByName')} />
                      <span>{t('browse.fDedupe')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeOfficial} onChange={toggleFilter('excludeOfficial')} />
                      <span>{t('browse.fOfficial')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeUnofficial} onChange={toggleFilter('excludeUnofficial')} />
                      <span>{t('browse.fUnofficial')}</span>
                    </label>
                    <label class="browse-filter-row">
                      <input type="checkbox" checked={filters().excludeNonModded} onChange={toggleFilter('excludeNonModded')} />
                      <span>{t('browse.fNoMods')}</span>
                    </label>
                  </div>
                </Show>
              </section>

              <section class="ds-card browse-sources-card" aria-labelledby="browse-sources-title">
                <h2 id="browse-sources-title" class="ds-section-title">
                  <Radar size={16} strokeWidth={1.75} aria-hidden />
                  {t('browse.otherSources')}
                </h2>
                <div class="browse-sources-stack">
                  <button type="button" class="btn btn-secondary" disabled={loading()} onClick={scanLan}>
                    {t('browse.scanLan')}
                  </button>
                  <div class="field browse-bm-field">
                    <label for="browse-bm-id">{t('browse.bmIdLabel')}</label>
                    <div class="browse-field-input-row">
                      <input id="browse-bm-id" value={bmId()} onInput={(e) => setBmId(e.currentTarget.value)} placeholder={t('browse.bmPlaceholder')} autocomplete="off" />
                      <button type="button" class="btn btn-secondary browse-input-clear" disabled={!bmId().trim()} aria-label={t('common.clearField')} onClick={() => setBmId('')}>
                        <X size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <button type="button" class="btn btn-secondary" disabled={loading()} onClick={resolveBm}>
                    {t('browse.resolveId')}
                  </button>
                </div>
              </section>
            </aside>
          </div>
          <Show when={joinModalRow()}>
            <ServerJoinModal row={joinModalRow()} onClose={() => setJoinModalRow(null)} onRowPatched={patchJoinRow} />
          </Show>
        </div>
      </Show>
    </>
  );
}
