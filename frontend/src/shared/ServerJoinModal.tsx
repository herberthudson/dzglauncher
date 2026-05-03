import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Check, Download, ExternalLink, Loader2, LogIn, RefreshCw, X} from 'lucide-react';
import * as App from '../../wailsjs/go/main/App';
import {domain} from '../../wailsjs/go/models';

export type ServerJoinModalProps = {
  row: domain.ServerRow | null;
  onClose: () => void;
  onRowPatched: (next: domain.ServerRow) => void;
};

export function ServerJoinModal({row, onClose, onRowPatched}: ServerJoinModalProps) {
  const {t} = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const fetchGenRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [enrichErr, setEnrichErr] = useState('');
  const [launchErr, setLaunchErr] = useState('');
  const [modRows, setModRows] = useState<domain.WorkshopModRow[]>([]);

  const load = useCallback(async () => {
    if (!row) {
      return;
    }
    const g = ++fetchGenRef.current;
    setLoading(true);
    setEnrichErr('');
    setLaunchErr('');
    setModRows([]);
    try {
      const list = await App.JoinModalWorkshopData(row.queryHost, row.queryPort, row.gamePort);
      if (g !== fetchGenRef.current) {
        return;
      }
      const rows = Array.isArray(list) ? list.map((x) => domain.WorkshopModRow.createFrom(x)) : [];
      setModRows(rows);
      const ids = rows.map((r) => r.id);
      const patched = domain.ServerRow.createFrom({...row, workshopModIds: ids});
      onRowPatched(patched);
    } catch (e) {
      if (g !== fetchGenRef.current) {
        return;
      }
      setEnrichErr(String(e));
    } finally {
      if (g === fetchGenRef.current) {
        setLoading(false);
      }
    }
  }, [row, onRowPatched]);

  useEffect(() => {
    if (!row) {
      return;
    }
    void load();
    return () => {
      fetchGenRef.current++;
    };
  }, [row, load]);

  useEffect(() => {
    if (!row) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  useEffect(() => {
    if (!row) {
      return;
    }
    const id = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      el?.focus();
    }, 80);
    return () => window.clearTimeout(id);
  }, [row]);

  const needsInstallOrUpdate = useMemo(
    () => modRows.some((r) => r.status === 'missing' || r.status === 'outdated'),
    [modRows],
  );

  const joinDisabled = joinBusy || loading || !!enrichErr || (modRows.length > 0 && needsInstallOrUpdate);

  const title = row ? row.name || row.address || t('joinModal.title') : t('joinModal.title');

  if (!row) {
    return null;
  }

  const onJoin = () => {
    const ids = modRows.map((r) => r.id);
    const next = domain.ServerRow.createFrom({...row, workshopModIds: ids});
    setJoinBusy(true);
    setLaunchErr('');
    App.LaunchConnect(next)
      .then(() => {
        onRowPatched(next);
        onClose();
      })
      .catch((e) => {
        setLaunchErr(String(e));
      })
      .finally(() => setJoinBusy(false));
  };

  const installOrUpdate = (id: string) => {
    void App.WorkshopDownloadItem(id).catch((e: unknown) => setEnrichErr(String(e)));
  };

  return (
    <div className="ds-modal-root" role="presentation">
      <button type="button" className="ds-modal-backdrop" aria-label={t('joinModal.close')} onClick={onClose} />
      <div
        ref={panelRef}
        className="ds-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ds-modal-header">
          <h2 id="join-modal-title" className="ds-modal-title">
            {t('joinModal.title')}
          </h2>
          <button type="button" className="btn btn-secondary ds-modal-iconbtn" title={t('joinModal.close')} onClick={onClose}>
            <X size={18} strokeWidth={2} aria-hidden />
            <span className="sr-only">{t('joinModal.close')}</span>
          </button>
        </div>
        <p className="ds-modal-subtitle">
          <span className="ds-modal-subtitle-label">{t('joinModal.server')}</span> {title}
        </p>

        {loading ? (
          <div className="ds-modal-loading" role="status" aria-live="polite">
            <Loader2 className="ds-modal-spinner" size={22} strokeWidth={2} aria-hidden />
            {t('joinModal.loading')}
          </div>
        ) : null}

        {enrichErr ? <div className="msg msg-error ds-modal-msg">{enrichErr}</div> : null}
        {launchErr ? <div className="msg msg-error ds-modal-msg">{launchErr}</div> : null}

        {!loading && !enrichErr && modRows.length === 0 ? <div className="msg msg-info ds-modal-msg">{t('joinModal.emptyMods')}</div> : null}

        {!loading && !enrichErr && modRows.length > 0 ? (
          <div className="ds-modal-tablewrap">
            <table className="data ds-modal-table">
              <caption className="sr-only">{t('joinModal.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('joinModal.colMod')}</th>
                  <th scope="col">{t('joinModal.colStatus')}</th>
                  <th scope="col">{t('joinModal.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {modRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="ds-modal-modname">{r.name}</div>
                    </td>
                    <td>
                      {r.status === 'ok' ? (
                        <span className="ds-modal-status ds-modal-status-ok">{t('joinModal.installed')}</span>
                      ) : r.status === 'outdated' ? (
                        <span className="ds-modal-status ds-modal-status-miss">{t('joinModal.outdated')}</span>
                      ) : (
                        <span className="ds-modal-status ds-modal-status-miss">{t('joinModal.missing')}</span>
                      )}
                    </td>
                    <td>
                      <div className="ds-modal-mod-actions">
                        <button
                          type="button"
                          className="btn btn-secondary ds-modal-mod-actionbtn"
                          disabled={r.status === 'ok'}
                          title={
                            r.status === 'ok'
                              ? t('joinModal.installInstalledTitle')
                              : r.status === 'outdated'
                                ? t('joinModal.updateTitle')
                                : t('joinModal.installTitle')
                          }
                          onClick={() => installOrUpdate(r.id)}
                        >
                          {r.status === 'ok' ? <Check size={14} strokeWidth={2} aria-hidden /> : <Download size={14} strokeWidth={2} aria-hidden />}
                          {r.status === 'ok' ? t('joinModal.installed') : r.status === 'outdated' ? t('joinModal.update') : t('joinModal.install')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary ds-modal-mod-actionbtn"
                          title={t('mods.steamPageTitle')}
                          onClick={() => void App.WorkshopPage(r.id)}
                        >
                          <ExternalLink size={14} strokeWidth={2} aria-hidden />
                          {t('mods.steam')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !enrichErr && modRows.length > 0 && needsInstallOrUpdate ? (
          <p className="ds-modal-footnote">{t('joinModal.joinBlocked')}</p>
        ) : null}

        <div className="ds-modal-footer">
          <button type="button" className="btn btn-secondary ds-modal-footerbtn" disabled={loading} onClick={() => void load()}>
            <RefreshCw size={16} strokeWidth={2} aria-hidden />
            {t('joinModal.refresh')}
          </button>
          <button type="button" className="btn btn-secondary ds-modal-footerbtn" onClick={onClose}>
            {t('joinModal.close')}
          </button>
          <button type="button" className="btn ds-modal-footerbtn ds-modal-primary" disabled={joinDisabled} title={t('joinModal.joinTitle')} onClick={() => void onJoin()}>
            {joinBusy ? <Loader2 className="ds-modal-spinner" size={18} strokeWidth={2} aria-hidden /> : <LogIn size={18} strokeWidth={2} aria-hidden />}
            {t('joinModal.join')}
          </button>
        </div>
      </div>
    </div>
  );
}
