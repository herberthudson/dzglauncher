import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Rows3, Server, Star} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {favoriteKey, favoriteKeyParts, favoritesToRows, rowKey} from '../../shared/favoriteRows';
import {DsSelect} from '../../shared/DsSelect';
import {PageHeader} from '../../shared/PageHeader';
import {useA2sModsHint} from '../../shared/useA2sModsHint';

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

export function FavoritesPage() {
  const {t} = useTranslation();
  const [s, setS] = useState<domain.Settings | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modsHint, setModsHint] = useA2sModsHint();
  const [modsBusyKey, setModsBusyKey] = useState<string | null>(null);

  const reload = () => App.LoadSettings().then(setS);

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const allRows = useMemo(() => (s ? favoritesToRows(s) : []), [s]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [allRows.length, pageSize, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [allRows, page, pageSize]);

  const perPageSelectOptions = useMemo(
    () => [...PAGE_PRESETS.map((n) => ({value: String(n), label: String(n)})), {value: 'custom', label: t('browse.other')}],
    [t],
  );

  if (!s) {
    return <p>{t('common.loading')}</p>;
  }

  const ping = () => {
    if (pageSlice.length === 0) {
      return;
    }
    setLoading(true);
    App.RefreshServersPing(pageSlice)
      .then((updated) => App.MergeFavoriteSnapshots(updated))
      .then(() => reload())
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
        const patched = domain.ServerRow.createFrom({...row, workshopModIds: list});
        return App.MergeFavoriteSnapshots([patched]).then(() => list);
      })
      .then((list) => {
        const label = row.name || row.address;
        if (!list.length) {
          setModsHint({
            level: 'warn',
            text: t('favorites.modsA2sNone', {name: label}),
          });
        } else {
          setModsHint({
            level: 'info',
            text: t('favorites.modsA2sOk', {count: list.length, name: label}),
          });
        }
        return reload();
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setModsBusyKey(null));
  };

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  return (
    <div>
      <PageHeader icon={Star} title={t('favorites.title')} description={t('favorites.subtitle')} />
      {err ? <div className="msg msg-error">{err}</div> : null}
      {modsHint ? <div className={modsHint.level === 'warn' ? 'msg msg-warn' : 'msg msg-info'}>{modsHint.text}</div> : null}

      <section className="ds-card" aria-labelledby="fav-tools-title">
        <h2 id="fav-tools-title" className="ds-section-title">
          <Rows3 size={16} strokeWidth={1.75} aria-hidden />
          {t('favorites.toolsTitle')}
        </h2>
        <div className="toolbar">
          <button type="button" className="btn btn-secondary" disabled={loading || !s.quickFavorite} onClick={() => App.ClearQuickFavorite().then(reload)}>
            {t('favorites.clearQuick')}
          </button>
          <button type="button" className="btn btn-secondary" disabled={loading || pageSlice.length === 0} onClick={ping} title={t('favorites.refreshPingTitle')}>
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
            {loading ? t('common.processing') : t('favorites.pageLine', {slice: pageSlice.length, total: allRows.length})}
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

      <section className="ds-card" aria-labelledby="fav-table-title">
        <h2 id="fav-table-title" className="ds-section-title">
          <Server size={16} strokeWidth={1.75} aria-hidden />
          {t('favorites.tableTitle')}
        </h2>
        {allRows.length === 0 ? <p style={{marginTop: 0}}>{t('favorites.empty')}</p> : null}
        {allRows.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">{t('favorites.tableCaption')}</caption>
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
                {pageSlice.map((row) => {
                  const qf = s.quickFavorite;
                  const isQuick =
                    !!qf &&
                    row.queryHost.trim().toLowerCase() === qf.ip.trim().toLowerCase() &&
                    row.gamePort === qf.gamePort &&
                    row.queryPort === qf.queryPort;
                  return (
                    <tr key={rowKey(row)}>
                      <td style={{maxWidth: '14rem', whiteSpace: 'normal'}}>
                        {row.name}
                        {isQuick ? <span style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.35rem'}}>{t('favorites.quickBadge')}</span> : null}
                      </td>
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
                          <button type="button" className="btn btn-secondary" title={t('favorites.connectTitle')} onClick={() => App.LaunchConnect(row).catch((e) => setErr(String(e)))}>
                            {t('favorites.connect')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={modsBusyKey === rowKey(row)}
                            title={t('favorites.modsA2STitle')}
                            onClick={() => enrichMods(row)}
                          >
                            {modsBusyKey === rowKey(row) ? t('favorites.modsA2SBusy') : t('favorites.modsA2S')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            title={t('favorites.removeTitle')}
                            onClick={() => {
                              const k = favoriteKeyParts(row.queryHost, row.gamePort, row.queryPort);
                              const matchesQuick = s.quickFavorite != null && favoriteKey(s.quickFavorite) === k;
                              App.RemoveFavorite(row.queryHost, row.gamePort, row.queryPort)
                                .then(() => (matchesQuick ? App.ClearQuickFavorite() : Promise.resolve()))
                                .then(reload)
                                .catch((e) => setErr(String(e)));
                            }}
                          >
                            {t('favorites.remove')}
                          </button>
                        </div>
                        {row.workshopModIds && row.workshopModIds.length > 0 ? (
                          <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '14rem'}}>{row.workshopModIds.join(', ')}</div>
                        ) : row.workshopModIds && row.workshopModIds.length === 0 ? (
                          <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '14rem'}}>{t('favorites.rulesNoWorkshop')}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
