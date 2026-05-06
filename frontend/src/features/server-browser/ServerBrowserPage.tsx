import {createEffect, createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {BookmarkPlus, ChevronDown, ChevronUp, ListFilter, Package, Play, Radar, Server, Star, X} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {browseSessionPayload, loadBrowseSessionMigrate} from './browseSession';
import {sortBrowseRows, type BrowseListSortKey} from './sortBrowseRows';
import {favoritesKeySet, favRowKey, mapQuickFavError, quickFavoritesKeySet} from '../../shared/favoriteRows';
import {historyKeySet} from '../../shared/historyRows';
import {DsSelect} from '@/components/ui/select';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {formatPlayersWithQueue} from '../../shared/formatPlayersWithQueue';
import {ServerAddressCell} from '../../shared/ServerAddressCell';
import {parallelServerPing} from '../../shared/parallelServerPing';
import {ServerJoinModal} from '../../shared/ServerJoinModal';
import {PingMsCell} from '../../shared/PingMsCell';
import {ServerPasswordCell} from '../../shared/ServerPasswordCell';
import {InGameTimeCell} from '../../shared/InGameTimeCell';
import {FormCheckboxRow} from '@/components/ui/checkbox';
import {AlertError} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableRow,
  TableScroll,
  tablePasswordColClass,
} from '@/components/ui/table';
import {cn} from '@/lib/utils';

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
    excludePassword: false,
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
    excludePassword: !!f.excludePassword,
    mapEquals: f.mapEquals ?? '',
    searchSubstring: f.searchSubstring ?? '',
  };
}

function patchFilter(base: domain.FilterState, patch: Partial<ReturnType<typeof filterFields>>): domain.FilterState {
  return domain.FilterState.createFrom({...filterFields(base), ...patch});
}

function normalizeServerRows(rows: readonly domain.ServerRow[] | null | undefined): domain.ServerRow[] {
  if (rows == null || !Array.isArray(rows)) {
    return [];
  }
  return rows as domain.ServerRow[];
}

export default function ServerBrowserPage() {
  const [t] = useTranslation();
  let applyFiltersGen = 0;
  let browseFetchGen = 0;
  const [browseReady, setBrowseReady] = createSignal(false);
  const [raw, setRaw] = createSignal<domain.ServerRow[]>([]);
  const [filtered, setFiltered] = createSignal<domain.ServerRow[]>([]);
  const [filters, setFilters] = createSignal(defaultFilters());
  const [knownMapNames, setKnownMapNames] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [pingInFlight, setPingInFlight] = createSignal(false);
  const [err, setErr] = createSignal('');
  const [bmId, setBmId] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(clampPageSize(10));
  const [joinModalRow, setJoinModalRow] = createSignal<domain.ServerRow | null>(null);
  const [filtersListOpen, setFiltersListOpen] = createSignal(true);
  const [browseSortKey, setBrowseSortKey] = createSignal<BrowseListSortKey | null>(null);
  const [browseSortAsc, setBrowseSortAsc] = createSignal(true);
  const [settingsForFavUi, setSettingsForFavUi] = createSignal<domain.Settings | null>(null);

  const endBrowseFetchIfCurrent = (gen: number) => {
    if (gen === browseFetchGen) {
      setLoading(false);
    }
  };

  const favKeysForBrowse = createMemo(() => favoritesKeySet(settingsForFavUi() ?? domain.Settings.createFrom({})));
  const quickFavKeysForBrowse = createMemo(() => quickFavoritesKeySet(settingsForFavUi() ?? domain.Settings.createFrom({})));
  const historyKeysForBrowse = createMemo(() => historyKeySet(settingsForFavUi() ?? domain.Settings.createFrom({})));

  const refreshBrowseSettingsUi = () => {
    void App.LoadSettings()
      .then((st) => setSettingsForFavUi(domain.Settings.createFrom(st as object)))
      .catch(() => {});
  };

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
        browseSessionPayload(filterFields(filters()), normalizeServerRows(raw()), page(), pageSize(), filtersListOpen(), bmId()),
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

  const orderedFiltered = createMemo(() => sortBrowseRows(normalizeServerRows(filtered()), browseSortKey(), browseSortAsc(), rowKey));

  const totalPages = createMemo(() => Math.max(1, Math.ceil(orderedFiltered().length / pageSize()) || 1));

  createEffect(() => {
    const tp = totalPages();
    setPage((p) => Math.min(Math.max(1, p), tp));
  });

  const pageSlice = createMemo(() => {
    const start = (page() - 1) * pageSize();
    return orderedFiltered().slice(start, start + pageSize());
  });

  const toggleBrowseSort = (key: BrowseListSortKey) => {
    if (browseSortKey() === key) {
      setBrowseSortAsc((a) => !a);
    } else {
      setBrowseSortKey(key);
      setBrowseSortAsc(true);
    }
  };

  const patchJoinRow = (next: domain.ServerRow) => {
    const rk = rowKey(next);
    setFiltered((prev) => normalizeServerRows(prev).map((r) => (rowKey(r) === rk ? next : r)));
    setRaw((prev) => normalizeServerRows(prev).map((r) => (rowKey(r) === rk ? next : r)));
  };

  createEffect(() => {
    if (!browseReady()) {
      return;
    }
    const r = raw();
    const f = filtered();
    if (r == null || !Array.isArray(r)) {
      setRaw([]);
    }
    if (f == null || !Array.isArray(f)) {
      setFiltered([]);
    }
  });

  createEffect(() => {
    void filters();
    void raw();
    if (!browseReady()) {
      return;
    }
    const gen = ++applyFiltersGen;
    const plain = filterFields(filters());
    const rawSnap = normalizeServerRows(raw());
    void App.ApplyServerFilters(rawSnap, domain.FilterState.createFrom(plain))
      .then((out) => {
        if (gen !== applyFiltersGen) {
          return;
        }
        setFiltered(normalizeServerRows(out));
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
        setSettingsForFavUi(domain.Settings.createFrom(st as object));
      })
      .catch(() => {});
  });

  createEffect(() => {
    const rows = normalizeServerRows(raw());
    if (rows.length === 0) {
      return;
    }
    App.MergeKnownMapNamesFromRows(rows)
      .then(setKnownMapNames)
      .catch(() => {});
  });

  const setFilterBool = (key: keyof domain.FilterState) => (checked: boolean) => {
    setFilters((prev) => patchFilter(prev, {[key]: checked} as Partial<ReturnType<typeof filterFields>>));
  };

  const fetchSteam = () => {
    const gen = ++browseFetchGen;
    setLoading(true);
    setErr('');
    setPingInFlight(false);
    App.FetchSteamServers()
      .then((rows) => {
        if (gen !== browseFetchGen) {
          return;
        }
        setRaw(normalizeServerRows(rows));
        setPage(1);
      })
      .catch((e) => {
        if (gen === browseFetchGen) {
          setErr(String(e));
        }
      })
      .finally(() => endBrowseFetchIfCurrent(gen));
  };

  const ping = () => {
    const sl = pageSlice();
    if (sl.length === 0) {
      return;
    }
    setErr('');
    setPingInFlight(true);
    void parallelServerPing(sl, (r) => App.RefreshServerPing(r), 12, (u) => {
      patchJoinRow(u);
    })
      .catch((e) => setErr(String(e)))
      .finally(() => setPingInFlight(false));
  };

  const scanLan = () => {
    const gen = ++browseFetchGen;
    setLoading(true);
    setErr('');
    setPingInFlight(false);
    App.ScanLAN()
      .then((rows) => {
        if (gen !== browseFetchGen) {
          return;
        }
        setRaw(normalizeServerRows(rows));
        setPage(1);
      })
      .catch((e) => {
        if (gen === browseFetchGen) {
          setErr(String(e));
        }
      })
      .finally(() => endBrowseFetchIfCurrent(gen));
  };

  const resolveBm = () => {
    if (!bmId().trim()) {
      return;
    }
    const gen = ++browseFetchGen;
    setLoading(true);
    setErr('');
    setPingInFlight(false);
    App.ResolveBattlemetricsID(bmId().trim())
      .then((row) => {
        if (gen !== browseFetchGen) {
          return;
        }
        setRaw(normalizeServerRows(row != null ? [row] : []));
        setPage(1);
      })
      .catch((e) => {
        if (gen === browseFetchGen) {
          setErr(String(e));
        }
      })
      .finally(() => endBrowseFetchIfCurrent(gen));
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
            <p class="text-sm text-muted-foreground">{t('common.processing')}</p>
          </div>
        }
      >
        <div>
          <PageHeader icon={Server} title={t('browse.title')} description={t('browse.subtitle')} />
          <Show when={!!err()}>
            <AlertError>{err()}</AlertError>
          </Show>

          <div class="mt-2 flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <Card class="mb-0" aria-label={t('browse.searchLabel')}>
                <div class="flex flex-wrap items-end gap-2">
                  <div class="mb-0 min-w-[12rem] flex-1 basis-64">
                    <Label for="browse-search">{t('browse.searchLabel')}</Label>
                    <div class="flex max-w-xl items-stretch gap-1.5">
                      <Input
                        id="browse-search"
                        class="min-w-0 flex-1"
                        value={filters().searchSubstring}
                        onInput={(e) => setFilters(patchFilter(filters(), {searchSubstring: e.currentTarget.value}))}
                      />
                      <Button
                        variant="secondary"
                        class="min-w-[2.375rem] shrink-0 px-2"
                        disabled={!filters().searchSubstring}
                        aria-label={t('common.clearField')}
                        onClick={() => setFilters(patchFilter(filters(), {searchSubstring: ''}))}
                      >
                        <X size={16} strokeWidth={2} aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <div class="mb-0 min-w-[10rem] max-w-xs flex-1 basis-56">
                    <Label for="browse-map">{t('browse.map')}</Label>
                    <div class="flex max-w-xl items-stretch gap-1.5">
                      <div class="min-w-0 flex-1">
                        <DsSelect
                          id="browse-map"
                          value={filters().mapEquals}
                          options={mapSelectOptions()}
                          onChange={(v) => setFilters(patchFilter(filters(), {mapEquals: v}))}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        class="min-w-[2.375rem] shrink-0 px-2"
                        disabled={!filters().mapEquals}
                        aria-label={t('common.clearField')}
                        onClick={() => setFilters(patchFilter(filters(), {mapEquals: ''}))}
                      >
                        <X size={16} strokeWidth={2} aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <div class="mb-0.5 shrink-0">
                    <Button disabled={loading()} onClick={fetchSteam}>
                      {t('browse.searchList')}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card class="mb-0 flex min-h-0 flex-col" aria-labelledby="browse-table-title">
                <CardTitle id="browse-table-title">
                  <Server size={16} strokeWidth={1.75} aria-hidden />
                  {t('browse.tableTitle')}
                </CardTitle>
                <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p class="m-0 min-w-[10rem] flex-1 text-[0.8rem] text-muted-foreground">
                    {loading() || pingInFlight()
                      ? t('common.processing')
                      : t('browse.pageLine', {slice: pageSlice().length, filtered: normalizeServerRows(filtered()).length, raw: normalizeServerRows(raw()).length})}
                  </p>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[0.8125rem] font-semibold text-muted-foreground">{t('browse.perPage')}</span>
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
                    <div class="flex flex-wrap items-center gap-1.5">
                      <Button variant="secondary" disabled={page() <= 1 || loading()} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                        ««
                      </Button>
                      <Button variant="secondary" disabled={page() <= 1 || loading()} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                        ‹
                      </Button>
                      <span class="min-w-[5.5rem] text-center text-[0.85rem] text-muted-foreground" aria-live="polite">
                        {page()} / {totalPages()}
                      </span>
                      <Button
                        variant="secondary"
                        disabled={page() >= totalPages() || loading()}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label={t('browse.pageNext')}
                      >
                        ›
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={page() >= totalPages() || loading()}
                        onClick={() => setPage(totalPages())}
                        aria-label={t('browse.pageLast')}
                      >
                        »»
                      </Button>
                    </div>
                    <Button variant="secondary" disabled={loading() || pingInFlight() || pageSlice().length === 0} onClick={ping} title={t('browse.refreshPingTitle')}>
                      {t('browse.refreshPing')}
                    </Button>
                  </div>
                </div>
                <TableScroll>
                  <Table>
                    <TableCaption class="sr-only">{t('browse.tableCaption')}</TableCaption>
                    <thead>
                      <tr>
                        <TableHead scope="col" title={t('browse.thNameLong')}>
                          {t('browse.thName')}
                        </TableHead>
                        <TableHead scope="col" class={tablePasswordColClass} title={t('browse.thPasswordLong')}>
                          {t('browse.thPassword')}
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thMapLong')}>
                          {t('browse.thMap')}
                        </TableHead>
                        <TableHead scope="col" class="p-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class={cn(
                              'h-auto min-h-8 w-full justify-start rounded-none px-2 py-1.5 text-[0.75rem] font-semibold uppercase tracking-wide',
                              browseSortKey() === 'perspective' ? 'text-foreground' : 'text-muted-foreground',
                            )}
                            title={t('browse.thPPLong')}
                            aria-label={t('browse.sortPPTitle')}
                            onClick={() => toggleBrowseSort('perspective')}
                          >
                            {t('browse.thPP')}
                            <Show when={browseSortKey() === 'perspective'}>
                              {browseSortAsc() ? <ChevronUp size={14} strokeWidth={2} aria-hidden /> : <ChevronDown size={14} strokeWidth={2} aria-hidden />}
                            </Show>
                          </Button>
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thProvLong')}>
                          {t('browse.thProv')}
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thModsLong')}>
                          {t('browse.thMods')}
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thTimeLong')}>
                          {t('browse.thTime')}
                        </TableHead>
                        <TableHead scope="col" class="p-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class={cn(
                              'h-auto min-h-8 w-full justify-start rounded-none px-2 py-1.5 text-[0.75rem] font-semibold uppercase tracking-wide',
                              browseSortKey() === 'players' ? 'text-foreground' : 'text-muted-foreground',
                            )}
                            title={t('browse.thPlayersLong')}
                            aria-label={t('browse.sortPlayersTitle')}
                            onClick={() => toggleBrowseSort('players')}
                          >
                            {t('browse.thPlayers')}
                            <Show when={browseSortKey() === 'players'}>
                              {browseSortAsc() ? <ChevronUp size={14} strokeWidth={2} aria-hidden /> : <ChevronDown size={14} strokeWidth={2} aria-hidden />}
                            </Show>
                          </Button>
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thAddrLong')}>
                          {t('browse.thAddr')}
                        </TableHead>
                        <TableHead scope="col" class="p-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class={cn(
                              'h-auto min-h-8 w-full justify-start rounded-none px-2 py-1.5 text-[0.75rem] font-semibold uppercase tracking-wide',
                              browseSortKey() === 'ping' ? 'text-foreground' : 'text-muted-foreground',
                            )}
                            title={t('browse.thPingLong')}
                            aria-label={t('browse.sortPingTitle')}
                            onClick={() => toggleBrowseSort('ping')}
                          >
                            {t('browse.thPing')}
                            <Show when={browseSortKey() === 'ping'}>
                              {browseSortAsc() ? <ChevronUp size={14} strokeWidth={2} aria-hidden /> : <ChevronDown size={14} strokeWidth={2} aria-hidden />}
                            </Show>
                          </Button>
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thDistLong')}>
                          {t('browse.thDist')}
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thActionsLong')}>
                          {t('browse.thActions')}
                        </TableHead>
                      </tr>
                    </thead>
                    <TableBody>
                      <For each={pageSlice()}>
                        {(row) => {
                          const rk = favRowKey(row);
                          const inFav = favKeysForBrowse().has(rk);
                          const inQuick = quickFavKeysForBrowse().has(rk);
                          const inHist = historyKeysForBrowse().has(rk);
                          const inYellowRow = inFav || inQuick;
                          return (
                          <TableRow
                            class={cn(
                              inYellowRow && '[&_td]:border-amber-600/75',
                              !inYellowRow && inHist && '[&_td]:border-sky-500/70',
                            )}
                          >
                            <TableCell class="max-w-56 whitespace-normal">{row.name}</TableCell>
                            <TableCell class={tablePasswordColClass}>
                              <ServerPasswordCell row={row} />
                            </TableCell>
                            <TableCell>{row.mapName}</TableCell>
                            <TableCell>{row.perspective}</TableCell>
                            <TableCell>{row.provider}</TableCell>
                            <TableCell>{row.modded ? t('common.yes') : t('common.no')}</TableCell>
                            <TableCell>
                              <InGameTimeCell inGameTime={row.inGameTime} />
                            </TableCell>
                            <TableCell>{formatPlayersWithQueue(row.players, row.maxPlayers, row.queueSize)}</TableCell>
                            <TableCell class="max-w-72 whitespace-normal">
                              <ServerAddressCell address={row.address} />
                            </TableCell>
                            <TableCell>
                              <PingMsCell value={row.ping} />
                            </TableCell>
                            <TableCell>{row.distanceLabel}</TableCell>
                            <TableCell>
                              <div class="flex flex-wrap gap-1 [&_button]:min-h-7 [&_button]:min-w-7 [&_button]:justify-center [&_button]:p-1 [&_button]:text-xs">
                                <Button variant="secondary" size="sm" title={t('browse.connectTitle')} aria-label={t('browse.connect')} onClick={() => setJoinModalRow(row)}>
                                  <Play size={14} strokeWidth={2} aria-hidden />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  title={t('browse.favTitle')}
                                  aria-label={t('browse.fav')}
                                  onClick={() =>
                                    App.ToggleFavoriteRow(row)
                                      .then(() => refreshBrowseSettingsUi())
                                      .catch((e) => setErr(String(e)))
                                  }
                                >
                                  <Star
                                    size={14}
                                    strokeWidth={2}
                                    aria-hidden
                                    fill={inFav ? 'currentColor' : 'none'}
                                    class={cn(inFav && 'text-amber-500')}
                                  />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  title={t('browse.quickFavTitle')}
                                  aria-label={t('browse.quickFav')}
                                  onClick={() =>
                                    App.SetQuickFavorite(row, window.prompt(t('browse.quickFavPrompt'), row.name) || row.name)
                                      .then(() => refreshBrowseSettingsUi())
                                      .catch((e) => setErr(mapQuickFavError(String(e), t)))
                                  }
                                >
                                  <BookmarkPlus
                                    size={14}
                                    strokeWidth={2}
                                    aria-hidden
                                    fill={inQuick ? 'currentColor' : 'none'}
                                    class={cn(inQuick && 'text-amber-500')}
                                  />
                                </Button>
                                <Button variant="secondary" size="sm" title={t('browse.joinPanelModsTitle')} aria-label={t('browse.joinPanelMods')} onClick={() => setJoinModalRow(row)}>
                                  <Package size={14} strokeWidth={2} aria-hidden />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        }}
                      </For>
                    </TableBody>
                  </Table>
                </TableScroll>
              </Card>
            </div>

            <aside class="flex flex-col gap-2 lg:sticky lg:top-1 lg:max-h-[calc(100dvh-var(--ds-nav-height)-1.5rem)] lg:w-64 lg:shrink-0 lg:overflow-hidden">
              <Card class="mb-0 flex max-h-[min(46vh,22rem)] flex-col" aria-labelledby="browse-filters-title">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <CardTitle id="browse-filters-title" class="mb-0">
                    <ListFilter size={16} strokeWidth={1.75} aria-hidden />
                    {t('browse.filtersTitle')}
                  </CardTitle>
                  <Button
                    variant="secondary"
                    size="icon"
                    class="size-9 shrink-0"
                    onClick={() => setFiltersListOpen((o) => !o)}
                    aria-expanded={filtersListOpen()}
                    aria-controls="browse-filters-list"
                    title={filtersListOpen() ? t('browse.toggleFiltersHide') : t('browse.toggleFiltersShow')}
                  >
                    {filtersListOpen() ? <ChevronUp size={18} strokeWidth={2} aria-hidden /> : <ChevronDown size={18} strokeWidth={2} aria-hidden />}
                    <span class="sr-only">{filtersListOpen() ? t('browse.toggleFiltersHide') : t('browse.toggleFiltersShow')}</span>
                  </Button>
                </div>
                <Show when={filtersListOpen()}>
                  <div
                    id="browse-filters-list"
                    class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-background p-1"
                    role="group"
                    aria-label={t('browse.filtersTitle')}
                  >
                    <FormCheckboxRow checked={filters().exclude1PP} onChange={setFilterBool('exclude1PP')}>
                      {t('browse.f1pp')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().exclude3PP} onChange={setFilterBool('exclude3PP')}>
                      {t('browse.f3pp')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeDay} onChange={setFilterBool('excludeDay')}>
                      {t('browse.fDay')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeNight} onChange={setFilterBool('excludeNight')}>
                      {t('browse.fNight')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeEmpty} onChange={setFilterBool('excludeEmpty')}>
                      {t('browse.fEmpty')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeFull} onChange={setFilterBool('excludeFull')}>
                      {t('browse.fFull')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeLowPop} onChange={setFilterBool('excludeLowPop')}>
                      {t('browse.fLowPop')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeNonASCII} onChange={setFilterBool('excludeNonASCII')}>
                      {t('browse.fAscii')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().deduplicateByName} onChange={setFilterBool('deduplicateByName')}>
                      {t('browse.fDedupe')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeOfficial} onChange={setFilterBool('excludeOfficial')}>
                      {t('browse.fOfficial')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeUnofficial} onChange={setFilterBool('excludeUnofficial')}>
                      {t('browse.fUnofficial')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludeNonModded} onChange={setFilterBool('excludeNonModded')}>
                      {t('browse.fNoMods')}
                    </FormCheckboxRow>
                    <FormCheckboxRow checked={filters().excludePassword} onChange={setFilterBool('excludePassword')}>
                      {t('browse.fPassword')}
                    </FormCheckboxRow>
                  </div>
                </Show>
              </Card>

              <Card class="mb-0" aria-labelledby="browse-sources-title">
                <CardTitle id="browse-sources-title">
                  <Radar size={16} strokeWidth={1.75} aria-hidden />
                  {t('browse.otherSources')}
                </CardTitle>
                <div class="flex flex-col gap-2">
                  <Button variant="secondary" disabled={loading()} onClick={scanLan}>
                    {t('browse.scanLan')}
                  </Button>
                  <div class="mb-0">
                    <Label for="browse-bm-id">{t('browse.bmIdLabel')}</Label>
                    <div class="flex max-w-xl items-stretch gap-1.5">
                      <Input
                        id="browse-bm-id"
                        class="min-w-0 flex-1"
                        value={bmId()}
                        onInput={(e) => setBmId(e.currentTarget.value)}
                        placeholder={t('browse.bmPlaceholder')}
                        autocomplete="off"
                      />
                      <Button variant="secondary" class="min-w-[2.375rem] shrink-0 px-2" disabled={!bmId().trim()} aria-label={t('common.clearField')} onClick={() => setBmId('')}>
                        <X size={16} strokeWidth={2} aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <Button variant="secondary" disabled={loading()} onClick={resolveBm}>
                    {t('browse.resolveId')}
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
          <Show when={joinModalRow()}>
            <ServerJoinModal
              row={joinModalRow()}
              onClose={() => {
                refreshBrowseSettingsUi();
                setJoinModalRow(null);
              }}
              onRowPatched={patchJoinRow}
            />
          </Show>
        </div>
      </Show>
    </>
  );
}
