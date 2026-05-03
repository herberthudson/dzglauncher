import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {BookmarkPlus, Clock, Package, Play, Rows3, Server, Trash2} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {mapQuickFavError, rowKey} from '../../shared/favoriteRows';
import {DsSelect} from '../../shared/DsSelect';
import {historyEntries} from '../../shared/historyRows';
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

function rowWithPing(row: domain.ServerRow, ping: number): domain.ServerRow {
  return domain.ServerRow.createFrom({
    name: row.name,
    mapName: row.mapName ?? '',
    perspective: row.perspective ?? '',
    provider: row.provider ?? '',
    modded: !!row.modded,
    inGameTime: row.inGameTime ?? '',
    queueSize: row.queueSize ?? 0,
    players: row.players ?? 0,
    maxPlayers: row.maxPlayers ?? 0,
    address: row.address,
    queryPort: row.queryPort,
    gamePort: row.gamePort,
    queryHost: row.queryHost,
    ping,
    distanceLabel: row.distanceLabel ?? '',
    workshopModIds: row.workshopModIds ? [...row.workshopModIds] : [],
    steamId: row.steamId,
    modNames: row.modNames ? [...row.modNames] : [],
  });
}

export function HistoryPage() {
  const {t, i18n} = useTranslation();
  const [s, setS] = useState<domain.Settings | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [joinModalRow, setJoinModalRow] = useState<domain.ServerRow | null>(null);
  const [pingByKey, setPingByKey] = useState<Record<string, number>>({});

  const reload = useCallback(() => {
    return App.LoadSettings()
      .then((v) => {
        setErr('');
        setS(v);
      })
      .catch((e: unknown) => {
        setErr(String(e));
        setS(null);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const hist = s && Array.isArray(s.history) ? s.history : [];

  useEffect(() => {
    setPingByKey({});
  }, [s]);

  const allEntries = useMemo(() => historyEntries(hist), [hist]);

  const totalPages = Math.max(1, Math.ceil(allEntries.length / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [allEntries.length, pageSize, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allEntries.slice(start, start + pageSize);
  }, [allEntries, page, pageSize]);

  const perPageSelectOptions = useMemo(
    () => [...PAGE_PRESETS.map((n) => ({value: String(n), label: String(n)})), {value: 'custom', label: t('browse.other')}],
    [t],
  );

  const formatConnected = useCallback(
    (atUnix: number) => {
      if (!atUnix) {
        return '';
      }
      const d = new Date(atUnix * 1000);
      return d.toLocaleString(i18n.language, {dateStyle: 'short', timeStyle: 'short'});
    },
    [i18n.language],
  );

  const noopPatch = useCallback((_next: domain.ServerRow) => {}, []);

  if (!s) {
    return <p>{t('common.loading')}</p>;
  }

  const ping = () => {
    if (pageSlice.length === 0) {
      return;
    }
    const rows = pageSlice.map((e) => e.row);
    setLoading(true);
    App.RefreshServersPing(rows)
      .then((updated) => {
        setPingByKey((prev) => {
          const next = {...prev};
          for (const u of updated) {
            next[rowKey(u)] = u.ping;
          }
          return next;
        });
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  return (
    <div>
      <PageHeader icon={Clock} title={t('history.title')} description={t('history.subtitle')} />
      {err ? <div className="msg msg-error">{err}</div> : null}

      <section className="ds-card" aria-labelledby="hist-tools-title">
        <h2 id="hist-tools-title" className="ds-section-title">
          <Rows3 size={16} strokeWidth={1.75} aria-hidden />
          {t('history.toolsTitle')}
        </h2>
        <div className="toolbar">
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
            {loading ? t('common.processing') : t('history.pageLine', {slice: pageSlice.length, total: allEntries.length})}
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

      <section className="ds-card" aria-labelledby="hist-table-title">
        <h2 id="hist-table-title" className="ds-section-title">
          <Server size={16} strokeWidth={1.75} aria-hidden />
          {t('history.tableTitle')}
        </h2>
        {allEntries.length === 0 ? <p style={{marginTop: 0}}>{t('history.empty')}</p> : null}
        {allEntries.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">{t('history.tableCaption')}</caption>
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
                {pageSlice.map(({row: baseRow, historyIndex, atUnix}) => {
                  const k = rowKey(baseRow);
                  const p = pingByKey[k];
                  const row = p != null ? rowWithPing(baseRow, p) : baseRow;
                  const when = formatConnected(atUnix);
                  return (
                    <tr key={k + ':' + historyIndex}>
                      <td style={{maxWidth: '14rem', whiteSpace: 'normal'}}>
                        <div>{row.name}</div>
                        {when ? (
                          <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem'}} title={t('history.connectedAtTitle')}>
                            {t('history.connectedAt', {when})}
                          </div>
                        ) : null}
                      </td>
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
                          <button type="button" className="btn btn-secondary" title={t('favorites.connectTitle')} aria-label={t('favorites.connect')} onClick={() => setJoinModalRow(row)}>
                            <Play size={14} strokeWidth={2} aria-hidden />
                          </button>
                          <button type="button" className="btn btn-secondary" title={t('favorites.joinPanelModsTitle')} aria-label={t('favorites.joinPanelMods')} onClick={() => setJoinModalRow(row)}>
                            <Package size={14} strokeWidth={2} aria-hidden />
                          </button>
                          <button type="button" className="btn btn-secondary" title={t('browse.quickFavTitle')} aria-label={t('browse.quickFav')} onClick={() => App.SetQuickFavorite(row, window.prompt(t('browse.quickFavPrompt'), row.name) || row.name).catch((e) => setErr(mapQuickFavError(String(e), t)))}>
                            <BookmarkPlus size={14} strokeWidth={2} aria-hidden />
                          </button>
                          <button type="button" className="btn btn-danger" title={t('history.deleteTitle')} aria-label={t('history.delete')} onClick={() => App.RemoveHistoryIndex(historyIndex).then(reload).catch((e) => setErr(String(e)))}>
                            <Trash2 size={14} strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      {joinModalRow ? <ServerJoinModal row={joinModalRow} onClose={() => setJoinModalRow(null)} onRowPatched={noopPatch} /> : null}
    </div>
  );
}
