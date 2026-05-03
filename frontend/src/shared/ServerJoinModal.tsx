import {createEffect, createMemo, createSignal, For, onCleanup, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {Check, Download, ExternalLink, Loader2, LogIn, RefreshCw, X} from 'lucide-solid';
import * as App from '../../wailsjs/go/main/App';
import {domain} from '../../wailsjs/go/models';

const JOIN_MOD_DESC_CHUNK_CHARS = 10;
const JOIN_MOD_DESC_MAX_LINES = 3;

function steamWorkshopDescPlain(raw: string): string {
  if (!raw) {
    return '';
  }
  let s = raw.replace(/\r\n/g, '\n');
  s = s.replace(/\[url=[^\]]*]([^\[]*)\[\/url]/gi, '$1');
  s = s.replace(/\[[^\]]*]/g, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function formatDescChunked(compact: string, chunkLen: number, maxLines: number): {text: string; truncated: boolean} {
  if (!compact) {
    return {text: '', truncated: false};
  }
  const lines: string[] = [];
  let i = 0;
  while (i < compact.length && lines.length < maxLines) {
    lines.push(compact.slice(i, i + chunkLen));
    i += chunkLen;
  }
  const truncated = i < compact.length;
  return {text: lines.join('\n') + (truncated ? '\n…' : ''), truncated};
}

export type ServerJoinModalProps = {
  row: domain.ServerRow | null;
  onClose: () => void;
  onRowPatched: (next: domain.ServerRow) => void;
};

export function ServerJoinModal(props: ServerJoinModalProps) {
  const [t] = useTranslation();
  let panelRef: HTMLDivElement | undefined;
  let fetchGen = 0;
  const [loading, setLoading] = createSignal(false);
  const [joinBusy, setJoinBusy] = createSignal(false);
  const [enrichErr, setEnrichErr] = createSignal('');
  const [launchErr, setLaunchErr] = createSignal('');
  const [modRows, setModRows] = createSignal<domain.WorkshopModRow[]>([]);
  const [modFilter, setModFilter] = createSignal('');

  const load = async () => {
    const row = props.row;
    if (!row) {
      return;
    }
    const g = ++fetchGen;
    setLoading(true);
    setEnrichErr('');
    setLaunchErr('');
    setModRows([]);
    setModFilter('');
    try {
      const list = await App.JoinModalWorkshopData(row.queryHost, row.queryPort, row.gamePort);
      if (g !== fetchGen) {
        return;
      }
      const rows = Array.isArray(list) ? list.map((x) => domain.WorkshopModRow.createFrom(x)) : [];
      setModRows(rows);
      const ids = rows.map((r) => r.id);
      const patched = domain.ServerRow.createFrom({...row, workshopModIds: ids});
      props.onRowPatched(patched);
    } catch (e) {
      if (g !== fetchGen) {
        return;
      }
      setEnrichErr(String(e));
    } finally {
      if (g === fetchGen) {
        setLoading(false);
      }
    }
  };

  createEffect(() => {
    const row = props.row;
    if (!row) {
      return;
    }
    void load();
    onCleanup(() => {
      fetchGen++;
    });
  });

  createEffect(() => {
    if (!props.row) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        props.onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  createEffect(() => {
    if (!props.row) {
      return;
    }
    const id = window.setTimeout(() => {
      const el = panelRef?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      el?.focus();
    }, 80);
    onCleanup(() => window.clearTimeout(id));
  });

  const filteredModRows = createMemo(() => {
    const q = modFilter().trim().toLowerCase();
    const rows = modRows();
    if (!q) {
      return rows;
    }
    return rows.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const id = String(r.id ?? '').toLowerCase();
      const statusCode = (r.status || '').toLowerCase();
      const statusLabel =
        r.status === 'ok'
          ? t('joinModal.installed').toLowerCase()
          : r.status === 'outdated'
            ? t('joinModal.outdated').toLowerCase()
            : r.status === 'missing'
              ? t('joinModal.missing').toLowerCase()
              : t('joinModal.statusUnknown').toLowerCase();
      const desc = steamWorkshopDescPlain(r.description || '').toLowerCase();
      return name.includes(q) || id.includes(q) || statusCode.includes(q) || statusLabel.includes(q) || desc.includes(q);
    });
  });

  const needsInstallOrUpdate = createMemo(() => modRows().some((r) => r.status === 'missing' || r.status === 'outdated'));

  const joinDisabled = () => joinBusy() || loading() || !!enrichErr() || (modRows().length > 0 && needsInstallOrUpdate());

  const title = () => {
    const row = props.row;
    return row ? row.name || row.address || t('joinModal.title') : t('joinModal.title');
  };

  const onJoin = () => {
    const row = props.row;
    if (!row) {
      return;
    }
    const ids = modRows().map((r) => r.id);
    const next = domain.ServerRow.createFrom({...row, workshopModIds: ids});
    setJoinBusy(true);
    setLaunchErr('');
    App.LaunchConnect(next)
      .then(() => {
        props.onRowPatched(next);
        props.onClose();
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
    <>
      {props.row ? (
        <div class="ds-modal-root" role="presentation">
          <button type="button" class="ds-modal-backdrop" aria-label={t('joinModal.close')} onClick={() => props.onClose()} />
          <div
            ref={(el) => (panelRef = el)}
            class="ds-modal-panel ds-modal-panel-join"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div class="ds-modal-header">
              <h2 id="join-modal-title" class="ds-modal-title">
                {t('joinModal.title')}
              </h2>
              <button type="button" class="btn btn-secondary ds-modal-iconbtn" title={t('joinModal.close')} onClick={() => props.onClose()}>
                <X size={18} strokeWidth={2} aria-hidden />
                <span class="sr-only">{t('joinModal.close')}</span>
              </button>
            </div>
            <p class="ds-modal-subtitle">
              <span class="ds-modal-subtitle-label">{t('joinModal.server')}</span> {title()}
            </p>

            <div class="ds-modal-body ds-modal-body-join">
              <Show when={loading()}>
                <div class="ds-modal-loading" role="status" aria-live="polite">
                  <Loader2 class="ds-modal-spinner" size={22} strokeWidth={2} aria-hidden />
                  {t('joinModal.loading')}
                </div>
              </Show>

              <Show when={!!enrichErr()}>
                <div class="msg msg-error ds-modal-msg">{enrichErr()}</div>
              </Show>
              <Show when={!!launchErr()}>
                <div class="msg msg-error ds-modal-msg">{launchErr()}</div>
              </Show>

              <Show when={!loading() && !enrichErr() && modRows().length === 0}>
                <div class="msg msg-info ds-modal-msg">{t('joinModal.emptyMods')}</div>
              </Show>

              <Show when={!loading() && !enrichErr() && modRows().length > 0}>
                <div class="ds-modal-filter">
                  <label for="join-modal-mod-filter">{t('joinModal.filterMods')}</label>
                  <input
                    id="join-modal-mod-filter"
                    type="search"
                    value={modFilter()}
                    onInput={(e) => setModFilter(e.currentTarget.value)}
                    placeholder={t('joinModal.filterModsPlaceholder')}
                    autocomplete="off"
                  />
                </div>
                <div class="ds-modal-tablewrap">
                  <table class="data ds-modal-table ds-modal-table-join">
                    <caption class="sr-only">{t('joinModal.tableCaption')}</caption>
                    <thead>
                      <tr>
                        <th scope="col" title={t('joinModal.colPreviewLong')}>
                          {t('joinModal.colPreview')}
                        </th>
                        <th scope="col">{t('joinModal.colMod')}</th>
                        <th scope="col" title={t('joinModal.colDescLong')}>
                          {t('joinModal.colDesc')}
                        </th>
                        <th scope="col">{t('joinModal.colStatus')}</th>
                        <th scope="col">{t('joinModal.colAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <Show
                        when={filteredModRows().length > 0}
                        fallback={
                          <tr>
                            <td colspan={5} class="ds-modal-filter-empty">
                              {t('joinModal.filterNoResults')}
                            </td>
                          </tr>
                        }
                      >
                        <For each={filteredModRows()}>
                          {(r) => {
                            const descPlain = steamWorkshopDescPlain(r.description || '');
                            const descCompact = descPlain.replace(/\s+/g, ' ').trim();
                            const {text: descChunked} = formatDescChunked(descCompact, JOIN_MOD_DESC_CHUNK_CHARS, JOIN_MOD_DESC_MAX_LINES);
                            return (
                              <tr>
                                <td class="ds-modal-mod-preview-cell">
                                  {r.previewUrl ? (
                                    <img
                                      class="ds-modal-mod-thumb"
                                      src={r.previewUrl}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span class="ds-modal-mod-thumb-ph" aria-hidden />
                                  )}
                                </td>
                                <td>
                                  <div class="ds-modal-modname">{r.name}</div>
                                </td>
                                <td class="ds-modal-mod-desc-cell">
                                  {descCompact ? (
                                    <div class="ds-modal-mod-desc" title={descPlain}>
                                      {descChunked}
                                    </div>
                                  ) : (
                                    <span class="ds-modal-mod-desc-empty">—</span>
                                  )}
                                </td>
                                <td>
                                  {r.status === 'ok' ? (
                                    <span class="ds-modal-status ds-modal-status-ok">{t('joinModal.installed')}</span>
                                  ) : r.status === 'outdated' ? (
                                    <span class="ds-modal-status ds-modal-status-miss">{t('joinModal.outdated')}</span>
                                  ) : (
                                    <span class="ds-modal-status ds-modal-status-miss">{t('joinModal.missing')}</span>
                                  )}
                                </td>
                                <td>
                                  <div class="ds-modal-mod-actions">
                                    <button
                                      type="button"
                                      class="btn btn-secondary ds-modal-mod-actionbtn"
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
                                      {r.status === 'ok' ? (
                                        <Check size={14} strokeWidth={2} aria-hidden />
                                      ) : (
                                        <Download size={14} strokeWidth={2} aria-hidden />
                                      )}
                                      {r.status === 'ok'
                                        ? t('joinModal.installed')
                                        : r.status === 'outdated'
                                          ? t('joinModal.update')
                                          : t('joinModal.install')}
                                    </button>
                                    <button
                                      type="button"
                                      class="btn btn-secondary ds-modal-mod-actionbtn"
                                      title={t('mods.steamPageTitle')}
                                      onClick={() => void App.WorkshopPage(r.id)}
                                    >
                                      <ExternalLink size={14} strokeWidth={2} aria-hidden />
                                      {t('mods.steam')}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }}
                        </For>
                      </Show>
                    </tbody>
                  </table>
                </div>
              </Show>

              <Show when={!loading() && !enrichErr() && modRows().length > 0 && needsInstallOrUpdate()}>
                <p class="ds-modal-footnote">{t('joinModal.joinBlocked')}</p>
              </Show>
            </div>

            <div class="ds-modal-footer">
              <button type="button" class="btn btn-secondary ds-modal-footerbtn" disabled={loading()} onClick={() => void load()}>
                <RefreshCw size={16} strokeWidth={2} aria-hidden />
                {t('joinModal.refresh')}
              </button>
              <button type="button" class="btn btn-secondary ds-modal-footerbtn" onClick={() => props.onClose()}>
                {t('joinModal.close')}
              </button>
              <button
                type="button"
                class="btn ds-modal-footerbtn ds-modal-primary"
                disabled={joinDisabled()}
                title={t('joinModal.joinTitle')}
                onClick={() => void onJoin()}
              >
                {joinBusy() ? (
                  <Loader2 class="ds-modal-spinner" size={18} strokeWidth={2} aria-hidden />
                ) : (
                  <LogIn size={18} strokeWidth={2} aria-hidden />
                )}
                {t('joinModal.join')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
