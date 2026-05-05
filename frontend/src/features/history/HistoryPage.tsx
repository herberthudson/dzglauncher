import {createEffect, createMemo, createSignal, For, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {BookmarkPlus, Clock, Package, Play, Server, Trash2} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {mapQuickFavError, rowKey} from '../../shared/favoriteRows';
import {historyEntries} from '../../shared/historyRows';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {formatPlayersWithQueue} from '../../shared/formatPlayersWithQueue';
import {ServerAddressCell} from '../../shared/ServerAddressCell';
import {parallelServerPing} from '../../shared/parallelServerPing';
import {ServerJoinModal} from '../../shared/ServerJoinModal';
import {PingMsCell} from '../../shared/PingMsCell';
import {ServerPasswordCell} from '../../shared/ServerPasswordCell';
import {AlertError} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
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

export default function HistoryPage() {
  const [t, i18n] = useTranslation();
  const [s, setS] = createSignal<domain.Settings | null>(null);
  const [err, setErr] = createSignal('');
  const [pingInFlight, setPingInFlight] = createSignal(false);
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(clampPageSize(10));
  const [joinModalRow, setJoinModalRow] = createSignal<domain.ServerRow | null>(null);
  const [rowMergedByKey, setRowMergedByKey] = createSignal<Record<string, domain.ServerRow>>({});

  const reload = () =>
    App.LoadSettings()
      .then((v) => {
        setErr('');
        setS(domain.Settings.createFrom(v as object));
      })
      .catch((e: unknown) => {
        setErr(String(e));
        setS(null);
      });

  onMount(() => {
    void reload();
  });

  const hist = () => (s() && Array.isArray(s()!.history) ? s()!.history : []);

  const allEntries = createMemo(() => historyEntries(hist()));

  const historyFingerprint = createMemo(() =>
    allEntries()
      .map((e) => `${e.historyIndex}:${rowKey(e.row)}`)
      .join('|'),
  );

  createEffect(() => {
    historyFingerprint();
    setRowMergedByKey({});
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(allEntries().length / pageSize()) || 1));

  createEffect(() => {
    const tp = totalPages();
    setPage((p) => Math.min(Math.max(1, p), tp));
  });

  const pageSlice = createMemo(() => {
    void rowMergedByKey();
    const start = (page() - 1) * pageSize();
    return allEntries().slice(start, start + pageSize());
  });

  const pageSliceRows = createMemo(() => {
    const m = rowMergedByKey();
    return pageSlice().map((e) => {
      const k = rowKey(e.row);
      return {
        historyIndex: e.historyIndex,
        atUnix: e.atUnix,
        row: domain.ServerRow.createFrom((m[k] ?? e.row) as object),
      };
    });
  });

  const formatConnected = (atUnix: number) => {
    if (!atUnix) {
      return '';
    }
    const d = new Date(atUnix * 1000);
    return d.toLocaleString(i18n().language, {dateStyle: 'short', timeStyle: 'short'});
  };

  const noopPatch = (_next: domain.ServerRow) => {};

  const ping = () => {
    const sl = pageSlice();
    if (sl.length === 0) {
      return;
    }
    const rows = sl.map((e) => e.row);
    setErr('');
    setPingInFlight(true);
    void parallelServerPing(rows, (r) => App.RefreshServerPing(r), 12, (u) => {
      setRowMergedByKey((prev) => ({...prev, [rowKey(u)]: u}));
    })
      .catch((e) => setErr(String(e)))
      .finally(() => setPingInFlight(false));
  };

  return (
    <>
      <Show when={!s()}>
        <p class="text-muted-foreground">{t('common.loading')}</p>
      </Show>
      <Show when={s()}>
        <div>
          <PageHeader icon={Clock} title={t('history.title')} description={t('history.subtitle')} />
          <Show when={!!err()}>
            <AlertError>{err()}</AlertError>
          </Show>

          <Card class="mb-0 flex min-h-0 flex-col" aria-labelledby="hist-table-title">
            <CardTitle id="hist-table-title">
              <Server size={16} strokeWidth={1.75} aria-hidden />
              {t('history.tableTitle')}
            </CardTitle>
            {allEntries().length === 0 ? <p class="mt-0 text-muted-foreground">{t('history.empty')}</p> : null}
            {allEntries().length > 0 ? (
              <>
                <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p class="m-0 min-w-[10rem] flex-1 text-[0.8rem] text-muted-foreground">
                    {pingInFlight() ? t('common.processing') : t('history.pageLine', {slice: pageSlice().length, total: allEntries().length})}
                  </p>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[0.8125rem] font-semibold text-muted-foreground">{t('browse.perPage')}</span>
                    <PageSizeInput
                      id="history-page-size"
                      value={pageSize()}
                      disabled={pingInFlight()}
                      ariaLabel={t('browse.perPage')}
                      onChange={(n) => {
                        setPageSize(n);
                        setPage(1);
                      }}
                    />
                    <div class="flex flex-wrap items-center gap-1.5">
                      <Button variant="secondary" disabled={page() <= 1 || pingInFlight()} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                        ««
                      </Button>
                      <Button variant="secondary" disabled={page() <= 1 || pingInFlight()} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                        ‹
                      </Button>
                      <span class="min-w-[5.5rem] text-center text-[0.85rem] text-muted-foreground" aria-live="polite">
                        {page()} / {totalPages()}
                      </span>
                      <Button variant="secondary" disabled={page() >= totalPages() || pingInFlight()} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                        ›
                      </Button>
                      <Button variant="secondary" disabled={page() >= totalPages() || pingInFlight()} onClick={() => setPage(totalPages())} aria-label={t('browse.pageLast')}>
                        »»
                      </Button>
                    </div>
                    <Button variant="secondary" disabled={pingInFlight() || pageSlice().length === 0} onClick={ping} title={t('favorites.refreshPingTitle')}>
                      {t('favorites.refreshPing')}
                    </Button>
                  </div>
                </div>
                <TableScroll>
                  <Table>
                    <TableCaption class="sr-only">{t('history.tableCaption')}</TableCaption>
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
                        <TableHead scope="col" title={t('browse.thPPLong')}>
                          {t('browse.thPP')}
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
                        <TableHead scope="col" title={t('browse.thPlayersLong')}>
                          {t('browse.thPlayers')}
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thAddrLong')}>
                          {t('browse.thAddr')}
                        </TableHead>
                        <TableHead scope="col" title={t('browse.thPingLong')}>
                          {t('browse.thPing')}
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
                      <For each={pageSliceRows()}>
                        {(e) => {
                          const row = e.row;
                          const when = formatConnected(e.atUnix);
                          return (
                            <TableRow>
                              <TableCell class="max-w-56 whitespace-normal">
                                <div>{row.name}</div>
                                {when ? (
                                  <div class="mt-0.5 text-[0.7rem] text-muted-foreground" title={t('history.connectedAtTitle')}>
                                    {t('history.connectedAt', {when})}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell class={tablePasswordColClass}>
                                <ServerPasswordCell row={row} />
                              </TableCell>
                              <TableCell>{row.mapName}</TableCell>
                              <TableCell>{row.perspective}</TableCell>
                              <TableCell>{row.provider}</TableCell>
                              <TableCell>{row.modded ? t('common.yes') : t('common.no')}</TableCell>
                              <TableCell>{row.inGameTime}</TableCell>
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
                                  <Button variant="secondary" size="sm" title={t('favorites.connectTitle')} aria-label={t('favorites.connect')} onClick={() => setJoinModalRow(row)}>
                                    <Play size={14} strokeWidth={2} aria-hidden />
                                  </Button>
                                  <Button variant="secondary" size="sm" title={t('favorites.joinPanelModsTitle')} aria-label={t('favorites.joinPanelMods')} onClick={() => setJoinModalRow(row)}>
                                    <Package size={14} strokeWidth={2} aria-hidden />
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    title={t('browse.quickFavTitle')}
                                    aria-label={t('browse.quickFav')}
                                    onClick={() =>
                                      App.SetQuickFavorite(row, window.prompt(t('browse.quickFavPrompt'), row.name) || row.name).catch((e) =>
                                        setErr(mapQuickFavError(String(e), t)),
                                      )
                                    }
                                  >
                                    <BookmarkPlus size={14} strokeWidth={2} aria-hidden />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    title={t('history.deleteTitle')}
                                    aria-label={t('history.delete')}
                                    onClick={() => App.RemoveHistoryIndex(e.historyIndex).then(reload).catch((e) => setErr(String(e)))}
                                  >
                                    <Trash2 size={14} strokeWidth={2} aria-hidden />
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
              </>
            ) : null}
          </Card>
          <Show when={joinModalRow()}>
            <ServerJoinModal row={joinModalRow()} onClose={() => setJoinModalRow(null)} onRowPatched={noopPatch} />
          </Show>
        </div>
      </Show>
    </>
  );
}
