import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Bookmark, Package, Play, Rows3, Server, Star, Trash2} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {favoriteKeyParts, favoritesKeySet, favoritesOnlyRows, quickFavoriteEntries, quickFavoritesToRows, rowKey} from '../../shared/favoriteRows';
import {DsSelect} from '../../shared/DsSelect';
import {PageHeader} from '../../shared/PageHeader';
import {ServerAddressCell} from '../../shared/ServerAddressCell';
import {ServerJoinModal} from '../../shared/ServerJoinModal';

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

function FavoritesTableHead() {
  const {t} = useTranslation();
  return (
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

function FavoriteTableRow({row, settings, mode, quickSlotIndex, favoriteKeys, onOpenJoin, onRemoveFavorite, onRemoveQuickSlot, onAddFavorite}: FavoriteTableRowProps) {
  const {t} = useTranslation();
  const rk = favoriteKeyParts(row.queryHost, row.gamePort, row.queryPort);
  const inFavorites = favoriteKeys.has(rk);
  return (
    <tr>
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
          <button type="button" className="btn btn-secondary" title={t('favorites.connectTitle')} aria-label={t('favorites.connect')} onClick={() => onOpenJoin(row)}>
            <Play size={14} strokeWidth={2} aria-hidden />
          </button>
          <button type="button" className="btn btn-secondary" title={t('favorites.joinPanelModsTitle')} aria-label={t('favorites.joinPanelMods')} onClick={() => onOpenJoin(row)}>
            <Package size={14} strokeWidth={2} aria-hidden />
          </button>
          {mode === 'quick' ? (
            <>
              <button type="button" className="btn btn-secondary" disabled={inFavorites} title={inFavorites ? t('favorites.addToFavoritesAlreadyTitle') : t('favorites.addToFavoritesTitle')} aria-label={t('favorites.addToFavorites')} onClick={() => onAddFavorite?.(row)}>
                <Star size={14} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn-danger"
                title={t('favorites.removeQuickTitle')}
                aria-label={t('favorites.removeQuick')}
                onClick={() => {
                  if (quickSlotIndex != null && onRemoveQuickSlot) {
                    onRemoveQuickSlot(quickSlotIndex);
                  }
                }}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden />
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-danger" title={t('favorites.removeTitle')} aria-label={t('favorites.remove')} onClick={() => onRemoveFavorite(row, settings)}>
              <Trash2 size={14} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function FavoritesPage() {
  const {t} = useTranslation();
  const [s, setS] = useState<domain.Settings | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [joinModalRow, setJoinModalRow] = useState<domain.ServerRow | null>(null);

  const reload = () => App.LoadSettings().then(setS);

  const patchFavoriteRow = useCallback((next: domain.ServerRow) => {
    void App.MergeFavoriteSnapshots([next]).then(() => App.LoadSettings().then(setS));
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const quickEntries = useMemo(() => (s ? quickFavoriteEntries(s) : []), [s]);
  const quickRows = useMemo(() => quickEntries.map((e) => e.row), [quickEntries]);

  const otherRows = useMemo(() => (s ? favoritesOnlyRows(s) : []), [s]);

  const favoriteKeys = useMemo(() => (s ? favoritesKeySet(s) : new Set<string>()), [s]);

  const totalPages = Math.max(1, Math.ceil(otherRows.length / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [otherRows.length, pageSize, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return otherRows.slice(start, start + pageSize);
  }, [otherRows, page, pageSize]);

  const perPageSelectOptions = useMemo(
    () => [...PAGE_PRESETS.map((n) => ({value: String(n), label: String(n)})), {value: 'custom', label: t('browse.other')}],
    [t],
  );

  const handleRemoveFavorite = useCallback((row: domain.ServerRow, _settings: domain.Settings) => {
    App.RemoveFavorite(row.queryHost, row.gamePort, row.queryPort)
      .then(reload)
      .catch((e) => setErr(String(e)));
  }, []);

  const handleRemoveQuickSlot = useCallback((index: number) => {
    App.RemoveQuickFavoriteIndex(index)
      .then(reload)
      .catch((e) => setErr(String(e)));
  }, []);

  const handleAddFavoriteFromQuick = useCallback((row: domain.ServerRow) => {
    App.AddFavoriteRow(row)
      .then(reload)
      .catch((e) => setErr(String(e)));
  }, []);

  if (!s) {
    return <p>{t('common.loading')}</p>;
  }

  const pingTargets = [...quickRows, ...pageSlice];
  const ping = () => {
    if (pingTargets.length === 0) {
      return;
    }
    setLoading(true);
    App.RefreshServersPing(pingTargets)
      .then((updated) => App.MergeFavoriteSnapshots(updated))
      .then(() => reload())
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  const hasQuick = quickEntries.length > 0;
  const hasAnyFavorite = hasQuick || otherRows.length > 0;

  return (
    <div>
      <PageHeader icon={Star} title={t('favorites.title')} description={t('favorites.subtitle')} />
      {err ? <div className="msg msg-error">{err}</div> : null}

      <section className="ds-card" aria-labelledby="fav-tools-title">
        <h2 id="fav-tools-title" className="ds-section-title">
          <Rows3 size={16} strokeWidth={1.75} aria-hidden />
          {t('favorites.toolsTitle')}
        </h2>
        <div className="toolbar">
          <button type="button" className="btn btn-secondary" disabled={loading || !hasQuick} onClick={() => App.ClearQuickFavorite().then(reload)}>
            {t('favorites.clearQuick')}
          </button>
          <button type="button" className="btn btn-secondary" disabled={loading || pingTargets.length === 0} onClick={ping} title={t('favorites.refreshPingTitle')}>
            {t('favorites.refreshPing')}
          </button>
        </div>
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
        <div className="toolbar" style={{justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 0}}>
          <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0}}>
            {loading ? t('common.processing') : t('favorites.pageLine', {slice: pageSlice.length, total: otherRows.length})}
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
      </section>

      {hasQuick ? (
        <section className="ds-card" aria-labelledby="fav-quick-table-title">
          <h2 id="fav-quick-table-title" className="ds-section-title">
            <Bookmark size={16} strokeWidth={1.75} aria-hidden />
            {t('favorites.quickTableTitle')}
          </h2>
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">{t('favorites.quickTableCaption')}</caption>
              <FavoritesTableHead />
              <tbody>
                {quickEntries.map(({index, row}) => (
                  <FavoriteTableRow
                    key={rowKey(row) + ':q' + index}
                    row={row}
                    settings={s}
                    mode="quick"
                    quickSlotIndex={index}
                    favoriteKeys={favoriteKeys}
                    onOpenJoin={setJoinModalRow}
                    onRemoveFavorite={handleRemoveFavorite}
                    onRemoveQuickSlot={handleRemoveQuickSlot}
                    onAddFavorite={handleAddFavoriteFromQuick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="ds-card" aria-labelledby="fav-table-title">
        <h2 id="fav-table-title" className="ds-section-title">
          <Server size={16} strokeWidth={1.75} aria-hidden />
          {t('favorites.tableTitle')}
        </h2>
        {!hasAnyFavorite ? <p style={{marginTop: 0}}>{t('favorites.empty')}</p> : null}
        {hasAnyFavorite && otherRows.length === 0 ? <p style={{marginTop: 0}}>{t('favorites.emptyOtherFavorites')}</p> : null}
        {otherRows.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">{t('favorites.tableCaption')}</caption>
              <FavoritesTableHead />
              <tbody>
                {pageSlice.map((row) => (
                  <FavoriteTableRow
                    key={rowKey(row)}
                    row={row}
                    settings={s}
                    mode="favorite"
                    favoriteKeys={favoriteKeys}
                    onOpenJoin={setJoinModalRow}
                    onRemoveFavorite={handleRemoveFavorite}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      {joinModalRow ? <ServerJoinModal row={joinModalRow} onClose={() => setJoinModalRow(null)} onRowPatched={patchFavoriteRow} /> : null}
    </div>
  );
}
