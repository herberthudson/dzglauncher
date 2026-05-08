import {createEffect, createMemo, createSignal, For, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {Bookmark, Package, Play, Server, Star, Trash2} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {favoriteKey, favoriteKeyParts, favoritesKeySet, favoritesOnlyRows, favRowKey, quickFavoriteEntries, quickFavoritesList} from '../../shared/favoriteRows';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {PlayersCapacityCell} from '../../shared/PlayersCapacityCell';
import {ServerAddressCell} from '../../shared/ServerAddressCell';
import {parallelServerPing} from '../../shared/parallelServerPing';
import {ServerJoinModal} from '../../shared/ServerJoinModal';
import {pingLooksUnavailable} from '../../shared/pingReachability';
import {PingMsCell} from '../../shared/PingMsCell';
import {ServerPasswordCell} from '../../shared/ServerPasswordCell';
import {InGameTimeCell} from '../../shared/InGameTimeCell';
import {AlertError} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableRow, TableScroll, tablePasswordColClass} from '@/components/ui/table';
import {cn} from '@/lib/utils';

function FavoritesTableHead() {
  const [t] = useTranslation();
  return (
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
  );
}

type FavoriteTableRowProps = {
  row: domain.ServerRow;
  settings: domain.Settings;
  mode: 'favorite' | 'quick';
  quickSlotIndex?: number;
  favoriteKeys: Set<string>;
  pingUnreachable?: boolean;
  onOpenJoin: (row: domain.ServerRow) => void;
  onRemoveFavorite: (row: domain.ServerRow, settings: domain.Settings) => void;
  onRemoveQuickSlot?: (index: number) => void;
  onAddFavorite?: (row: domain.ServerRow) => void;
};

function FavoriteTableRow(props: FavoriteTableRowProps) {
  const [t] = useTranslation();
  const rk = () => favoriteKeyParts(props.row.queryHost, props.row.gamePort, props.row.queryPort);
  const inFavorites = () => props.favoriteKeys.has(rk());
  return (
    <TableRow
      class={cn(props.pingUnreachable && '[&_td]:bg-muted/25 [&_td]:text-foreground/65')}
    >
      <TableCell class="max-w-56 whitespace-normal">{props.row.name}</TableCell>
      <TableCell class={tablePasswordColClass}>
        <ServerPasswordCell row={props.row} />
      </TableCell>
      <TableCell>{props.row.mapName}</TableCell>
      <TableCell>{props.row.perspective}</TableCell>
      <TableCell>{props.row.provider}</TableCell>
      <TableCell>{props.row.modded ? t('common.yes') : t('common.no')}</TableCell>
      <TableCell>
        <InGameTimeCell inGameTime={props.row.inGameTime} />
      </TableCell>
      <TableCell>
        <PlayersCapacityCell players={props.row.players} maxPlayers={props.row.maxPlayers} queueSize={props.row.queueSize} />
      </TableCell>
      <TableCell class="max-w-72 whitespace-normal">
        <ServerAddressCell address={props.row.address} />
      </TableCell>
      <TableCell>
        <PingMsCell
          value={props.row.ping ?? 9999}
          unreachable={props.pingUnreachable}
          unreachableLabel={t('browse.pingUnreachable')}
        />
      </TableCell>
      <TableCell>{props.row.distanceLabel}</TableCell>
      <TableCell>
        <div class="flex flex-wrap gap-1 [&_button]:min-h-7 [&_button]:min-w-7 [&_button]:justify-center [&_button]:p-1 [&_button]:text-xs">
          <Button variant="secondary" size="sm" title={t('favorites.connectTitle')} aria-label={t('favorites.connect')} onClick={() => props.onOpenJoin(props.row)}>
            <Play size={14} strokeWidth={2} aria-hidden />
          </Button>
          <Button variant="secondary" size="sm" title={t('favorites.joinPanelModsTitle')} aria-label={t('favorites.joinPanelMods')} onClick={() => props.onOpenJoin(props.row)}>
            <Package size={14} strokeWidth={2} aria-hidden />
          </Button>
          {props.mode === 'quick' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={inFavorites()}
                title={inFavorites() ? t('favorites.addToFavoritesAlreadyTitle') : t('favorites.addToFavoritesTitle')}
                aria-label={t('favorites.addToFavorites')}
                onClick={() => props.onAddFavorite?.(props.row)}
              >
                <Star size={14} strokeWidth={2} aria-hidden />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                title={t('favorites.removeQuickTitle')}
                aria-label={t('favorites.removeQuick')}
                onClick={() => {
                  if (props.quickSlotIndex != null && props.onRemoveQuickSlot) {
                    props.onRemoveQuickSlot(props.quickSlotIndex);
                  }
                }}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden />
              </Button>
            </>
          ) : (
            <Button variant="destructive" size="sm" title={t('favorites.removeTitle')} aria-label={t('favorites.remove')} onClick={() => props.onRemoveFavorite(props.row, props.settings)}>
              <Trash2 size={14} strokeWidth={2} aria-hidden />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function FavoritesPage() {
  const [t] = useTranslation();
  const [s, setS] = createSignal<domain.Settings | null>(null);
  const [err, setErr] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(clampPageSize(10));
  const [joinModalRow, setJoinModalRow] = createSignal<domain.ServerRow | null>(null);
  const [pingMsByFavKey, setPingMsByFavKey] = createSignal<Record<string, number>>({});
  const [pingUnreachableKeys, setPingUnreachableKeys] = createSignal<Set<string>>(new Set<string>());

  const reload = () =>
    App.LoadSettings().then((v) => {
      setS(domain.Settings.createFrom(v as object));
    });

  const patchFavoriteRow = (next: domain.ServerRow) => {
    void App.MergeFavoriteSnapshots([next]).then(() =>
      App.LoadSettings().then((v) => setS(domain.Settings.createFrom(v as object))),
    );
  };

  onMount(() => {
    reload().catch(() => {});
  });

  const favoritesListIdentity = createMemo(() => {
    const st = s();
    if (!st) {
      return '';
    }
    const keys = new Set<string>();
    for (const f of st.favorites || []) {
      keys.add(favoriteKey(f));
    }
    for (const f of quickFavoritesList(st)) {
      keys.add(favoriteKey(f));
    }
    return [...keys].sort().join('|');
  });

  createEffect(() => {
    favoritesListIdentity();
    setPingMsByFavKey({});
    setPingUnreachableKeys(new Set<string>());
  });

  const applyPingReachability = (updated: domain.ServerRow) => {
    const k = favRowKey(updated);
    const bad = pingLooksUnavailable(updated.ping);
    setPingUnreachableKeys((prev) => {
      const next = new Set(prev);
      if (bad) {
        next.add(k);
      } else {
        next.delete(k);
      }
      return next;
    });
  };

  const quickEntries = createMemo(() => (s() ? quickFavoriteEntries(s()!) : []));
  const quickEntriesForList = createMemo(() => {
    const ms = pingMsByFavKey();
    return quickEntries().map((e) => {
      const k = favRowKey(e.row);
      const p = ms[k];
      const row =
        p != null && Number.isFinite(p)
          ? domain.ServerRow.createFrom({...(e.row as object), ping: p} as object)
          : domain.ServerRow.createFrom(e.row as object);
      return {index: e.index, row};
    });
  });
  const quickRows = createMemo(() => quickEntries().map((e) => e.row));
  const otherRows = createMemo(() => (s() ? favoritesOnlyRows(s()!) : []));
  const favoriteKeys = createMemo(() => (s() ? favoritesKeySet(s()!) : new Set<string>()));

  const totalPages = createMemo(() => Math.max(1, Math.ceil(otherRows().length / pageSize()) || 1));

  createEffect(() => {
    const tp = totalPages();
    setPage((p) => Math.min(Math.max(1, p), tp));
  });

  const pageSlice = createMemo(() => {
    const start = (page() - 1) * pageSize();
    return otherRows().slice(start, start + pageSize());
  });

  const pageSliceForList = createMemo(() => {
    const ms = pingMsByFavKey();
    return pageSlice().map((r) => {
      const k = favRowKey(r);
      const p = ms[k];
      return p != null && Number.isFinite(p)
        ? domain.ServerRow.createFrom({...(r as object), ping: p} as object)
        : domain.ServerRow.createFrom(r as object);
    });
  });

  const handleRemoveFavorite = (row: domain.ServerRow, _settings: domain.Settings) => {
    App.RemoveFavorite(row.queryHost, row.gamePort, row.queryPort)
      .then(reload)
      .catch((e) => setErr(String(e)));
  };

  const handleRemoveQuickSlot = (index: number) => {
    App.RemoveQuickFavoriteIndex(index)
      .then(reload)
      .catch((e) => setErr(String(e)));
  };

  const handleAddFavoriteFromQuick = (row: domain.ServerRow) => {
    App.AddFavoriteRow(row)
      .then(reload)
      .catch((e) => setErr(String(e)));
  };

  const pingTargets = () => [...quickRows(), ...pageSlice()];

  const applyPingMsFromUpdated = (updated: domain.ServerRow[]) => {
    setPingMsByFavKey((prev) => {
      const next = {...prev};
      for (const u of updated) {
        next[favRowKey(u)] = u.ping;
      }
      return next;
    });
  };

  const ping = () => {
    const targets = pingTargets();
    if (targets.length === 0) {
      return;
    }
    setLoading(true);
    setErr('');
    void parallelServerPing(targets, (r) => App.RefreshServerPing(r), 12, (u) => {
      applyPingMsFromUpdated([u]);
      applyPingReachability(u);
    })
      .then((updated) => App.MergeFavoriteSnapshots(updated))
      .then(() => reload())
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const pingQuick = () => {
    const qr = quickRows();
    if (qr.length === 0) {
      return;
    }
    setLoading(true);
    setErr('');
    void parallelServerPing(qr, (r) => App.RefreshServerPing(r), 12, (u) => {
      applyPingMsFromUpdated([u]);
      applyPingReachability(u);
    })
      .then((updated) => App.MergeFavoriteSnapshots(updated))
      .then(() => reload())
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const hasQuick = () => quickEntries().length > 0;
  const hasAnyFavorite = () => hasQuick() || otherRows().length > 0;

  return (
    <>
      <Show when={!s()}>
        <p class="text-muted-foreground">{t('common.loading')}</p>
      </Show>
      <Show when={s()}>
        <div>
          <PageHeader icon={Star} title={t('favorites.title')} description={t('favorites.subtitle')} />
          <Show when={!!err()}>
            <AlertError>{err()}</AlertError>
          </Show>

          <Show when={hasQuick()}>
            <Card class="mb-3" aria-labelledby="fav-quick-table-title">
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <CardTitle id="fav-quick-table-title" class="mb-0">
                  <Bookmark size={16} strokeWidth={1.75} aria-hidden />
                  {t('favorites.quickTableTitle')}
                </CardTitle>
                <div class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                  <p class="m-0 min-w-[8rem] flex-1 text-[0.8rem] text-muted-foreground">{loading() ? t('common.processing') : '\u00a0'}</p>
                  <Button variant="secondary" disabled={loading() || quickRows().length === 0} onClick={pingQuick} title={t('favorites.refreshPingTitle')}>
                    {t('favorites.refreshPing')}
                  </Button>
                  <Button variant="secondary" disabled={loading() || !hasQuick()} onClick={() => App.ClearQuickFavorite().then(reload)}>
                    {t('favorites.clearQuick')}
                  </Button>
                </div>
              </div>
              <TableScroll>
                <Table>
                  <TableCaption class="sr-only">{t('favorites.quickTableCaption')}</TableCaption>
                  <FavoritesTableHead />
                  <TableBody>
                    <For each={quickEntriesForList()}>
                      {(e) => (
                        <FavoriteTableRow
                          row={e.row}
                          settings={s()!}
                          mode="quick"
                          quickSlotIndex={e.index}
                          favoriteKeys={favoriteKeys()}
                          pingUnreachable={pingUnreachableKeys().has(favRowKey(e.row))}
                          onOpenJoin={setJoinModalRow}
                          onRemoveFavorite={handleRemoveFavorite}
                          onRemoveQuickSlot={handleRemoveQuickSlot}
                          onAddFavorite={handleAddFavoriteFromQuick}
                        />
                      )}
                    </For>
                  </TableBody>
                </Table>
              </TableScroll>
            </Card>
          </Show>

          <Card class="mb-0 flex min-h-0 flex-col" aria-labelledby="fav-table-title">
            <CardTitle id="fav-table-title">
              <Server size={16} strokeWidth={1.75} aria-hidden />
              {t('favorites.tableTitle')}
            </CardTitle>
            {!hasAnyFavorite() ? <p class="mt-0 text-muted-foreground">{t('favorites.empty')}</p> : null}
            {hasAnyFavorite() && otherRows().length === 0 ? <p class="mt-0 text-muted-foreground">{t('favorites.emptyOtherFavorites')}</p> : null}
            {otherRows().length > 0 ? (
              <>
                <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p class="m-0 min-w-[10rem] flex-1 text-[0.8rem] text-muted-foreground">
                    {loading() ? t('common.processing') : t('favorites.pageLine', {slice: pageSlice().length, total: otherRows().length})}
                  </p>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[0.8125rem] font-semibold text-muted-foreground">{t('browse.perPage')}</span>
                    <PageSizeInput
                      id="favorites-page-size"
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
                      <Button variant="secondary" disabled={page() >= totalPages() || loading()} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                        ›
                      </Button>
                      <Button variant="secondary" disabled={page() >= totalPages() || loading()} onClick={() => setPage(totalPages())} aria-label={t('browse.pageLast')}>
                        »»
                      </Button>
                    </div>
                    <Button variant="secondary" disabled={loading() || pingTargets().length === 0} onClick={ping} title={t('favorites.refreshPingTitle')}>
                      {t('favorites.refreshPing')}
                    </Button>
                  </div>
                </div>
                <TableScroll>
                  <Table>
                    <TableCaption class="sr-only">{t('favorites.tableCaption')}</TableCaption>
                    <FavoritesTableHead />
                    <TableBody>
                      <For each={pageSliceForList()}>
                        {(row) => (
                          <FavoriteTableRow
                            row={row}
                            settings={s()!}
                            mode="favorite"
                            favoriteKeys={favoriteKeys()}
                            pingUnreachable={pingUnreachableKeys().has(favRowKey(row))}
                            onOpenJoin={setJoinModalRow}
                            onRemoveFavorite={handleRemoveFavorite}
                          />
                        )}
                      </For>
                    </TableBody>
                  </Table>
                </TableScroll>
              </>
            ) : null}
          </Card>
          <Show when={joinModalRow()}>
            <ServerJoinModal row={joinModalRow()} onClose={() => setJoinModalRow(null)} onRowPatched={patchFavoriteRow} />
          </Show>
        </div>
      </Show>
    </>
  );
}
