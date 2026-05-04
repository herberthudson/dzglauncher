import {createEffect, createMemo, createSignal, For, onCleanup, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {Check, Download, ExternalLink, Loader2, LogIn, RefreshCw, X} from 'lucide-solid';
import * as App from '../../wailsjs/go/main/App';
import {domain} from '../../wailsjs/go/models';
import {AlertError, AlertInfo} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogOverlay} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableRow} from '@/components/ui/table';
import {formatBytes} from './formatBytes';

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

  const modSizeTotals = createMemo(() => {
    const rows = modRows();
    let totalLoadout = 0;
    let partialNoSize = 0;
    for (const r of rows) {
      const remote = Number(r.remoteSizeBytes) || 0;
      const local = Number(r.localSizeBytes) || 0;
      if (remote > 0) {
        totalLoadout += remote;
      } else if (local > 0) {
        totalLoadout += local;
      } else {
        partialNoSize++;
      }
    }
    let installedDisk = 0;
    for (const r of rows) {
      if (r.status === 'ok' || r.status === 'outdated') {
        installedDisk += Number(r.localSizeBytes) || 0;
      }
    }
    let missingDl = 0;
    for (const r of rows) {
      if (r.status === 'missing') {
        missingDl += Number(r.remoteSizeBytes) || 0;
      }
    }
    return {totalLoadout, installedDisk, missingDl, partialNoSize};
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
    <Dialog
      open={props.row != null}
      onOpenChange={(next) => {
        if (!next) {
          props.onClose();
        }
      }}
      modal
      id="join-server-dialog"
    >
      <Dialog.Portal>
        <DialogOverlay />
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const root = e.currentTarget as HTMLElement | null;
            if (!root) {
              return;
            }
            window.setTimeout(() => {
              root
                .querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
                ?.focus();
            }, 80);
          }}
        >
          <div class="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2">
            <Dialog.Title id="join-modal-title" class="m-0 text-base font-semibold">
              {t('joinModal.title')}
            </Dialog.Title>
            <Button variant="ghost" size="icon" class="shrink-0" title={t('joinModal.close')} onClick={() => props.onClose()}>
              <X size={18} strokeWidth={2} aria-hidden />
              <span class="sr-only">{t('joinModal.close')}</span>
            </Button>
          </div>
          <p class="shrink-0 border-b border-border px-3 py-2 text-sm">
            <span class="mr-1 font-semibold text-muted-foreground">{t('joinModal.server')}</span>
            {title()}
          </p>

          <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 py-2">
            <Show when={loading()}>
              <div class="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                <Loader2 class="size-[22px] shrink-0 animate-spin" strokeWidth={2} aria-hidden />
                {t('joinModal.loading')}
              </div>
            </Show>

            <Show when={!!enrichErr()}>
              <AlertError class="shrink-0">{enrichErr()}</AlertError>
            </Show>
            <Show when={!!launchErr()}>
              <AlertError class="shrink-0">{launchErr()}</AlertError>
            </Show>

            <Show when={!loading() && !enrichErr() && modRows().length === 0}>
              <AlertInfo class="shrink-0">{t('joinModal.emptyMods')}</AlertInfo>
            </Show>

            <Show when={!loading() && !enrichErr() && modRows().length > 0}>
              <div class="shrink-0 space-y-1">
                <Label for="join-modal-mod-filter">{t('joinModal.filterMods')}</Label>
                <Input
                  id="join-modal-mod-filter"
                  type="search"
                  value={modFilter()}
                  onInput={(e) => setModFilter(e.currentTarget.value)}
                  placeholder={t('joinModal.filterModsPlaceholder')}
                  autocomplete="off"
                  class="max-w-none"
                />
              </div>
              <p class="shrink-0 text-sm text-muted-foreground">
                {t('joinModal.totalLoadout')}{' '}
                <strong class="text-foreground">{formatBytes(modSizeTotals().totalLoadout)}</strong>
                {' · '}
                {t('joinModal.totalInstalledDisk')}{' '}
                <strong class="text-foreground">{formatBytes(modSizeTotals().installedDisk)}</strong>
                {' · '}
                {t('joinModal.totalMissingDownload')}{' '}
                <strong class="text-foreground">{formatBytes(modSizeTotals().missingDl)}</strong>
              </p>
              <Show when={modSizeTotals().partialNoSize > 0}>
                <p class="shrink-0 text-xs text-muted-foreground">{t('joinModal.sizesPartial', {count: modSizeTotals().partialNoSize})}</p>
              </Show>
              <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
                <Table>
                  <TableCaption class="sr-only">{t('joinModal.tableCaption')}</TableCaption>
                  <thead>
                    <tr>
                      <TableHead scope="col" class="normal-case" title={t('joinModal.colPreviewLong')}>
                        {t('joinModal.colPreview')}
                      </TableHead>
                      <TableHead scope="col">{t('joinModal.colMod')}</TableHead>
                      <TableHead scope="col" title={t('joinModal.colDescLong')}>
                        {t('joinModal.colDesc')}
                      </TableHead>
                      <TableHead scope="col" class="whitespace-nowrap" title={t('joinModal.colSizeLong')}>
                        {t('joinModal.colSize')}
                      </TableHead>
                      <TableHead scope="col">{t('joinModal.colStatus')}</TableHead>
                      <TableHead scope="col">{t('joinModal.colAction')}</TableHead>
                    </tr>
                  </thead>
                  <TableBody>
                    <Show
                      when={filteredModRows().length > 0}
                      fallback={
                        <TableRow>
                          <TableCell colspan={6} class="py-4 text-center text-sm text-muted-foreground whitespace-normal">
                            {t('joinModal.filterNoResults')}
                          </TableCell>
                        </TableRow>
                      }
                    >
                      <For each={filteredModRows()}>
                        {(r) => {
                          const descPlain = steamWorkshopDescPlain(r.description || '');
                          const descCompact = descPlain.replace(/\s+/g, ' ').trim();
                          const {text: descChunked} = formatDescChunked(descCompact, JOIN_MOD_DESC_CHUNK_CHARS, JOIN_MOD_DESC_MAX_LINES);
                          return (
                            <TableRow>
                              <TableCell class="w-20 max-w-[5.5rem] align-top">
                                {r.previewUrl ? (
                                  <img
                                    class="h-12 w-20 rounded border border-border object-cover"
                                    src={r.previewUrl}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span class="block h-12 w-20 rounded border border-dashed border-border bg-muted" aria-hidden />
                                )}
                              </TableCell>
                              <TableCell class="max-w-[12rem] whitespace-normal align-top">
                                <div class="text-sm font-medium leading-snug">{r.name}</div>
                              </TableCell>
                              <TableCell class="max-w-[14rem] whitespace-normal align-top">
                                {descCompact ? (
                                  <div class="line-clamp-3 max-h-[4.5rem] overflow-hidden text-xs leading-snug text-muted-foreground" title={descPlain}>
                                    {descChunked}
                                  </div>
                                ) : (
                                  <span class="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell class="align-top text-xs whitespace-nowrap">
                                {(() => {
                                  const local = Number(r.localSizeBytes) || 0;
                                  const remote = Number(r.remoteSizeBytes) || 0;
                                  if (local === 0 && remote === 0) {
                                    return <span class="text-muted-foreground">—</span>;
                                  }
                                  if (r.status === 'missing') {
                                    return remote > 0 ? formatBytes(remote) : <span class="text-muted-foreground">—</span>;
                                  }
                                  if (r.status === 'ok') {
                                    if (local > 0) {
                                      return formatBytes(local);
                                    }
                                    return remote > 0 ? formatBytes(remote) : <span class="text-muted-foreground">—</span>;
                                  }
                                  return (
                                    <div class="flex max-w-[11rem] flex-col gap-0.5 whitespace-normal">
                                      {local > 0 ? (
                                        <div>
                                          <span class="text-muted-foreground">{t('joinModal.sizeRowDisk')}</span> {formatBytes(local)}
                                        </div>
                                      ) : null}
                                      {remote > 0 ? (
                                        <div>
                                          <span class="text-muted-foreground">{t('joinModal.sizeRowWorkshop')}</span> {formatBytes(remote)}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell class="align-top">{r.status === 'ok' ? (
                                  <span class="text-xs font-medium text-success">{t('joinModal.installed')}</span>
                                ) : r.status === 'outdated' ? (
                                  <span class="text-xs font-medium text-destructive">{t('joinModal.outdated')}</span>
                                ) : (
                                  <span class="text-xs font-medium text-destructive">{t('joinModal.missing')}</span>
                                )}
                              </TableCell>
                              <TableCell class="align-top">
                                <div class="flex flex-wrap gap-1">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    class="min-h-7 gap-1 px-2 text-xs"
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
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    class="min-h-7 gap-1 px-2 text-xs"
                                    title={t('mods.steamPageTitle')}
                                    onClick={() => void App.WorkshopPage(r.id)}
                                  >
                                    <ExternalLink size={14} strokeWidth={2} aria-hidden />
                                    {t('mods.steam')}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }}
                      </For>
                    </Show>
                  </TableBody>
                </Table>
              </div>
            </Show>

            <Show when={!loading() && !enrichErr() && modRows().length > 0 && needsInstallOrUpdate()}>
              <p class="shrink-0 text-xs text-muted-foreground">{t('joinModal.joinBlocked')}</p>
            </Show>
          </div>

          <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-3 py-2">
            <Button variant="secondary" disabled={loading()} onClick={() => void load()}>
              <RefreshCw size={16} strokeWidth={2} aria-hidden />
              {t('joinModal.refresh')}
            </Button>
            <Button variant="secondary" onClick={() => props.onClose()}>
              {t('joinModal.close')}
            </Button>
            <Button disabled={joinDisabled()} title={t('joinModal.joinTitle')} onClick={() => void onJoin()}>
              {joinBusy() ? (
                <Loader2 class="size-[18px] shrink-0 animate-spin" strokeWidth={2} aria-hidden />
              ) : (
                <LogIn size={18} strokeWidth={2} aria-hidden />
              )}
              {t('joinModal.join')}
            </Button>
          </div>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  );
}
