import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Download, Loader2, LogIn, RefreshCw, X} from 'lucide-react';
import * as App from '../../wailsjs/go/main/App';
import {domain, workshop} from '../../wailsjs/go/models';

function normId(s: string) {
  return String(s).trim();
}

function buildInstalledById(items: workshop.Item[]) {
  const m = new Map<string, workshop.Item>();
  for (const it of items) {
    const k = normId(it.id);
    if (k && !m.has(k)) {
      m.set(k, it);
    }
  }
  return m;
}

export type ServerJoinModalProps = {
  row: domain.ServerRow | null;
  onClose: () => void;
  onRowPatched: (next: domain.ServerRow) => void;
};

export function ServerJoinModal({row, onClose, onRowPatched}: ServerJoinModalProps) {
  const {t} = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [enrichErr, setEnrichErr] = useState('');
  const [launchErr, setLaunchErr] = useState('');
  const [listErr, setListErr] = useState('');
  const [serverIds, setServerIds] = useState<string[]>([]);
  const [installedById, setInstalledById] = useState<Map<string, workshop.Item>>(new Map());

  const load = useCallback(async () => {
    if (!row) {
      return;
    }
    setLoading(true);
    setEnrichErr('');
    setLaunchErr('');
    setListErr('');
    setServerIds([]);
    setInstalledById(new Map());
    const enrichP = App.EnrichServerMods(row.queryHost, row.queryPort, row.gamePort);
    const listP = App.ListWorkshopItems();
    try {
      const ids = await enrichP;
      const list = Array.isArray(ids) ? ids.map((x) => normId(String(x))).filter(Boolean) : [];
      setServerIds(list);
      const patched = domain.ServerRow.createFrom({...row, workshopModIds: list});
      onRowPatched(patched);
    } catch (e) {
      setEnrichErr(String(e));
    }
    try {
      const items = await listP;
      const arr = Array.isArray(items) ? items.map((x) => workshop.Item.createFrom(x)) : [];
      setInstalledById(buildInstalledById(arr));
    } catch (e) {
      setListErr(String(e));
      setInstalledById(new Map());
    } finally {
      setLoading(false);
    }
  }, [row, onRowPatched]);

  useEffect(() => {
    if (!row) {
      return;
    }
    void load();
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

  const rows = useMemo(() => {
    return serverIds.map((id) => {
      const it = listErr ? undefined : installedById.get(normId(id));
      const installed = !listErr && !!it;
      return {id, installed, name: it?.name?.trim() || id};
    });
  }, [serverIds, installedById, listErr]);

  const canVerifyLocal = !listErr;
  const allKnownInstalled = serverIds.length === 0 || rows.every((r) => r.installed);
  const joinDisabled =
    joinBusy ||
    loading ||
    !!enrichErr ||
    (serverIds.length > 0 && canVerifyLocal && !allKnownInstalled) ||
    (serverIds.length > 0 && !canVerifyLocal);

  const title = row ? row.name || row.address || t('joinModal.title') : t('joinModal.title');

  if (!row) {
    return null;
  }

  const onJoin = () => {
    const next = domain.ServerRow.createFrom({...row, workshopModIds: serverIds});
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
        {listErr && serverIds.length > 0 ? <div className="msg msg-warn ds-modal-msg">{t('joinModal.listError', {detail: listErr})}</div> : null}

        {!loading && !enrichErr && serverIds.length === 0 ? <div className="msg msg-info ds-modal-msg">{t('joinModal.emptyMods')}</div> : null}

        {!loading && !enrichErr && serverIds.length > 0 ? (
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
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="ds-modal-modname">{r.name}</div>
                      <div className="ds-modal-modid">{r.id}</div>
                    </td>
                    <td>
                      {listErr ? (
                        <span className="ds-modal-status ds-modal-status-unknown">{t('joinModal.statusUnknown')}</span>
                      ) : r.installed ? (
                        <span className="ds-modal-status ds-modal-status-ok">{t('joinModal.installed')}</span>
                      ) : (
                        <span className="ds-modal-status ds-modal-status-miss">{t('joinModal.missing')}</span>
                      )}
                    </td>
                    <td>
                      {r.installed && !listErr ? (
                        <span className="ds-modal-dash">—</span>
                      ) : (
                        <button type="button" className="btn btn-secondary ds-modal-actionbtn" title={t('joinModal.installTitle')} onClick={() => void App.WorkshopPage(r.id)}>
                          <Download size={16} strokeWidth={2} aria-hidden />
                          {t('joinModal.install')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !enrichErr && serverIds.length > 0 && canVerifyLocal && !allKnownInstalled ? (
          <p className="ds-modal-footnote">{t('joinModal.joinBlocked')}</p>
        ) : null}
        {!loading && !enrichErr && serverIds.length > 0 && listErr ? <p className="ds-modal-footnote">{t('joinModal.joinBlockedVerify')}</p> : null}

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
