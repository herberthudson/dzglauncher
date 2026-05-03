import {createEffect, createMemo, createSignal, For, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {Bookmark, Package, Play, Server, Star, Trash2} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {favoriteKey, favoriteKeyParts, favoritesKeySet, favoritesOnlyRows, favRowKey, quickFavoriteEntries, quickFavoritesList} from '../../shared/favoriteRows';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {formatPlayersWithQueue} from '../../shared/formatPlayersWithQueue';
import {ServerAddressCell} from '../../shared/ServerAddressCell';
import {ServerJoinModal} from '../../shared/ServerJoinModal';
import {ServerPasswordCell} from '../../shared/ServerPasswordCell';

function FavoritesTableHead() {
  const [t] = useTranslation();
  return (
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
  );
}

type FavoriteTableRowProps = {
  row: domain.ServerRow;
  settings: domain.Settings;
  mode: 'favorite' | 'quick';
  quickSlotIndex?: number;
  favoriteKeys: Set<string>;
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
    <tr>
      <td style={{'max-width': '14rem', 'white-space': 'normal'}}>{props.row.name}</td>
      <td class="server-password-td">
        <ServerPasswordCell row={props.row} />
      </td>
      <td>{props.row.mapName}</td>
      <td>{props.row.perspective}</td>
      <td>{props.row.provider}</td>
      <td>{props.row.modded ? t('common.yes') : t('common.no')}</td>
      <td>{props.row.inGameTime}</td>
      <td>{formatPlayersWithQueue(props.row.players, props.row.maxPlayers, props.row.queueSize)}</td>
      <td style={{'max-width': '18rem', 'white-space': 'normal'}}>
        <ServerAddressCell address={props.row.address} />
      </td>
      <td>{props.row.ping}</td>
      <td>{props.row.distanceLabel}</td>
      <td>
        <div class="row-actions row-actions-icon-only">
          <button type="button" class="btn btn-secondary" title={t('favorites.connectTitle')} aria-label={t('favorites.connect')} onClick={() => props.onOpenJoin(props.row)}>
            <Play size={14} strokeWidth={2} aria-hidden />
          </button>
          <button type="button" class="btn btn-secondary" title={t('favorites.joinPanelModsTitle')} aria-label={t('favorites.joinPanelMods')} onClick={() => props.onOpenJoin(props.row)}>
            <Package size={14} strokeWidth={2} aria-hidden />
          </button>
          {props.mode === 'quick' ? (
            <>
              <button
                type="button"
                class="btn btn-secondary"
                disabled={inFavorites()}
                title={inFavorites() ? t('favorites.addToFavoritesAlreadyTitle') : t('favorites.addToFavoritesTitle')}
                aria-label={t('favorites.addToFavorites')}
                onClick={() => props.onAddFavorite?.(props.row)}
              >
                <Star size={14} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                class="btn btn-danger"
                title={t('favorites.removeQuickTitle')}
                aria-label={t('favorites.removeQuick')}
                onClick={() => {
                  if (props.quickSlotIndex != null && props.onRemoveQuickSlot) {
                    props.onRemoveQuickSlot(props.quickSlotIndex);
                  }
                }}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden />
              </button>
            </>
          ) : (
            <button type="button" class="btn btn-danger" title={t('favorites.removeTitle')} aria-label={t('favorites.remove')} onClick={() => props.onRemoveFavorite(props.row, props.settings)}>
              <Trash2 size={14} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </td>
    </tr>
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

  const favoritesFingerprint = createMemo(() => {
    const st = s();
    if (!st) {
      return '';
    }
    const fk = (st.favorites || []).map((f) => favoriteKey(f)).sort();
    const qk = quickFavoritesList(st).map((f) => favoriteKey(f));
    return [...fk, ...qk].join('|');
  });

  createEffect(() => {
    favoritesFingerprint();
    setPingMsByFavKey({});
  });

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
    App.RefreshServersPing(targets)
      .then((updated) => {
        applyPingMsFromUpdated(updated);
        return App.MergeFavoriteSnapshots(updated);
      })
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
    App.RefreshServersPing(qr)
      .then((updated) => {
        applyPingMsFromUpdated(updated);
        return App.MergeFavoriteSnapshots(updated);
      })
      .then(() => reload())
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const hasQuick = () => quickEntries().length > 0;
  const hasAnyFavorite = () => hasQuick() || otherRows().length > 0;

  return (
    <>
      <Show when={!s()}>
        <p>{t('common.loading')}</p>
      </Show>
      <Show when={s()}>
        <div>
          <PageHeader icon={Star} title={t('favorites.title')} description={t('favorites.subtitle')} />
          <Show when={!!err()}>
            <div class="msg msg-error">{err()}</div>
          </Show>

          <Show when={hasQuick()}>
            <section class="ds-card" aria-labelledby="fav-quick-table-title">
              <div class="browse-filters-header">
                <h2 id="fav-quick-table-title" class="ds-section-title">
                  <Bookmark size={16} strokeWidth={1.75} aria-hidden />
                  {t('favorites.quickTableTitle')}
                </h2>
                <div style={{display: 'flex', gap: '0.5rem', 'align-items': 'center', 'flex-wrap': 'wrap'}}>
                  <p class="browse-page-line" style={{margin: 0, flex: '1 1 auto', 'min-width': '8rem'}}>
                    {loading() ? t('common.processing') : '\u00a0'}
                  </p>
                  <button type="button" class="btn btn-secondary" disabled={loading() || quickRows().length === 0} onClick={pingQuick} title={t('favorites.refreshPingTitle')}>
                    {t('favorites.refreshPing')}
                  </button>
                  <button type="button" class="btn btn-secondary" disabled={loading() || !hasQuick()} onClick={() => App.ClearQuickFavorite().then(reload)}>
                    {t('favorites.clearQuick')}
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table class="data">
                  <caption class="sr-only">{t('favorites.quickTableCaption')}</caption>
                  <FavoritesTableHead />
                  <tbody>
                    <For each={quickEntriesForList()}>
                      {(e) => (
                        <FavoriteTableRow
                          row={e.row}
                          settings={s()!}
                          mode="quick"
                          quickSlotIndex={e.index}
                          favoriteKeys={favoriteKeys()}
                          onOpenJoin={setJoinModalRow}
                          onRemoveFavorite={handleRemoveFavorite}
                          onRemoveQuickSlot={handleRemoveQuickSlot}
                          onAddFavorite={handleAddFavoriteFromQuick}
                        />
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </section>
          </Show>

          <section class="ds-card browse-table-card" aria-labelledby="fav-table-title">
            <h2 id="fav-table-title" class="ds-section-title">
              <Server size={16} strokeWidth={1.75} aria-hidden />
              {t('favorites.tableTitle')}
            </h2>
            {!hasAnyFavorite() ? <p style={{'margin-top': 0}}>{t('favorites.empty')}</p> : null}
            {hasAnyFavorite() && otherRows().length === 0 ? <p style={{'margin-top': 0}}>{t('favorites.emptyOtherFavorites')}</p> : null}
            {otherRows().length > 0 ? (
              <>
                <div class="browse-table-toolbar">
                  <p class="browse-page-line">{loading() ? t('common.processing') : t('favorites.pageLine', {slice: pageSlice().length, total: otherRows().length})}</p>
                  <div class="browse-table-toolbar-actions">
                    <span class="browse-toolbar-label">{t('browse.perPage')}</span>
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
                      <button type="button" class="btn btn-secondary" disabled={page() >= totalPages() || loading()} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                        ›
                      </button>
                      <button type="button" class="btn btn-secondary" disabled={page() >= totalPages() || loading()} onClick={() => setPage(totalPages())} aria-label={t('browse.pageLast')}>
                        »»
                      </button>
                    </div>
                    <button type="button" class="btn btn-secondary" disabled={loading() || pingTargets().length === 0} onClick={ping} title={t('favorites.refreshPingTitle')}>
                      {t('favorites.refreshPing')}
                    </button>
                  </div>
                </div>
                <div class="table-wrap browse-table-scroll">
                  <table class="data">
                    <caption class="sr-only">{t('favorites.tableCaption')}</caption>
                    <FavoritesTableHead />
                    <tbody>
                      <For each={pageSliceForList()}>
                        {(row) => (
                          <FavoriteTableRow
                            row={row}
                            settings={s()!}
                            mode="favorite"
                            favoriteKeys={favoriteKeys()}
                            onOpenJoin={setJoinModalRow}
                            onRemoveFavorite={handleRemoveFavorite}
                          />
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </section>
          <Show when={joinModalRow()}>
            <ServerJoinModal row={joinModalRow()} onClose={() => setJoinModalRow(null)} onRowPatched={patchFavoriteRow} />
          </Show>
        </div>
      </Show>
    </>
  );
}
