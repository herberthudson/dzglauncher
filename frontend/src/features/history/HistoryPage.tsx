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
import {ServerJoinModal} from '../../shared/ServerJoinModal';
import {ServerPasswordCell} from '../../shared/ServerPasswordCell';

export default function HistoryPage() {
  const [t, i18n] = useTranslation();
  const [s, setS] = createSignal<domain.Settings | null>(null);
  const [err, setErr] = createSignal('');
  const [loading, setLoading] = createSignal(false);
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
    setLoading(true);
    App.RefreshServersPing(rows)
      .then((updated) => {
        setRowMergedByKey((prev) => {
          const next = {...prev};
          for (const u of updated) {
            next[rowKey(u)] = u;
          }
          return next;
        });
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <Show when={!s()}>
        <p>{t('common.loading')}</p>
      </Show>
      <Show when={s()}>
        <div>
          <PageHeader icon={Clock} title={t('history.title')} description={t('history.subtitle')} />
          <Show when={!!err()}>
            <div class="msg msg-error">{err()}</div>
          </Show>

          <section class="ds-card browse-table-card" aria-labelledby="hist-table-title">
            <h2 id="hist-table-title" class="ds-section-title">
              <Server size={16} strokeWidth={1.75} aria-hidden />
              {t('history.tableTitle')}
            </h2>
            {allEntries().length === 0 ? <p style={{'margin-top': 0}}>{t('history.empty')}</p> : null}
            {allEntries().length > 0 ? (
              <>
                <div class="browse-table-toolbar">
                  <p class="browse-page-line">
                    {loading() ? t('common.processing') : t('history.pageLine', {slice: pageSlice().length, total: allEntries().length})}
                  </p>
                  <div class="browse-table-toolbar-actions">
                    <span class="browse-toolbar-label">{t('browse.perPage')}</span>
                    <PageSizeInput
                      id="history-page-size"
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
                    <button type="button" class="btn btn-secondary" disabled={loading() || pageSlice().length === 0} onClick={ping} title={t('favorites.refreshPingTitle')}>
                      {t('favorites.refreshPing')}
                    </button>
                  </div>
                </div>
                <div class="table-wrap browse-table-scroll">
                  <table class="data">
                    <caption class="sr-only">{t('history.tableCaption')}</caption>
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
                      <For each={pageSliceRows()}>
                        {(e) => {
                          const row = e.row;
                          const when = formatConnected(e.atUnix);
                          return (
                            <tr>
                              <td style={{'max-width': '14rem', 'white-space': 'normal'}}>
                                <div>{row.name}</div>
                                {when ? (
                                  <div style={{'font-size': '0.7rem', color: 'var(--text-muted)', 'margin-top': '0.15rem'}} title={t('history.connectedAtTitle')}>
                                    {t('history.connectedAt', {when})}
                                  </div>
                                ) : null}
                              </td>
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
                                  <button type="button" class="btn btn-secondary" title={t('favorites.connectTitle')} aria-label={t('favorites.connect')} onClick={() => setJoinModalRow(row)}>
                                    <Play size={14} strokeWidth={2} aria-hidden />
                                  </button>
                                  <button type="button" class="btn btn-secondary" title={t('favorites.joinPanelModsTitle')} aria-label={t('favorites.joinPanelMods')} onClick={() => setJoinModalRow(row)}>
                                    <Package size={14} strokeWidth={2} aria-hidden />
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
                                  <button
                                    type="button"
                                    class="btn btn-danger"
                                    title={t('history.deleteTitle')}
                                    aria-label={t('history.delete')}
                                    onClick={() => App.RemoveHistoryIndex(e.historyIndex).then(reload).catch((e) => setErr(String(e)))}
                                  >
                                    <Trash2 size={14} strokeWidth={2} aria-hidden />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </section>
          <Show when={joinModalRow()}>
            <ServerJoinModal row={joinModalRow()} onClose={() => setJoinModalRow(null)} onRowPatched={noopPatch} />
          </Show>
        </div>
      </Show>
    </>
  );
}
