import {createEffect, createMemo, createSignal, For, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {ExternalLink, FolderOpen, Package, RefreshCw, Rows3, X} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {workshop} from '../../../wailsjs/go/models';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {formatBytes} from '../../shared/formatBytes';
import {workshopFolderDisplayPath} from '../../shared/workshopDisplayPath';
import {i18n} from '../../i18n/i18n';
import {AlertError, AlertInfo} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableRow, TableScroll} from '@/components/ui/table';

type SortCol = 'id' | 'name' | 'path' | 'size' | 'acfSize' | 'acfUpdated';

function cmpStr(a: string, b: string) {
  return a.localeCompare(b, undefined, {sensitivity: 'base'});
}

function acfSizeVal(m: workshop.Item): number | null {
  const v = m.acfSizeBytes;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function acfTimeVal(m: workshop.Item): number | null {
  const v = m.acfTimeUpdated;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

export default function ModsPage() {
  const [t] = useTranslation();
  const [items, setItems] = createSignal<workshop.Item[]>([]);
  const [err, setErr] = createSignal('');
  const [q, setQ] = createSignal('');
  const [sortCol, setSortCol] = createSignal<SortCol>('name');
  const [sortAsc, setSortAsc] = createSignal(true);
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(clampPageSize(10));
  const [reloadBusy, setReloadBusy] = createSignal(false);

  const reload = () => {
    setReloadBusy(true);
    return App.ListWorkshopItems()
      .then((rows) => {
        setErr('');
        setItems(rows ?? []);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setReloadBusy(false));
  };

  onMount(() => {
    void reload();
  });

  const filtered = createMemo(() => {
    const x = q().trim().toLowerCase();
    const it = items() ?? [];
    if (!x) {
      return it;
    }
    return it.filter((m) => m.name.toLowerCase().includes(x) || String(m.id).toLowerCase().includes(x));
  });

  const totalBytesAll = createMemo(() => (items() ?? []).reduce((s, m) => s + (Number(m.sizeBytes) || 0), 0));

  const totalBytesFiltered = createMemo(() => filtered().reduce((s, m) => s + (Number(m.sizeBytes) || 0), 0));

  const sorted = createMemo(() => {
    const rows = [...filtered()];
    const dir = sortAsc() ? 1 : -1;
    const col = sortCol();
    rows.sort((a, b) => {
      if (col === 'id') {
        return dir * cmpStr(String(a.id), String(b.id));
      }
      if (col === 'name') {
        return dir * cmpStr(a.name || '', b.name || '');
      }
      if (col === 'size') {
        const sa = Number(a.sizeBytes) || 0;
        const sb = Number(b.sizeBytes) || 0;
        if (sa < sb) {
          return -1 * dir;
        }
        if (sa > sb) {
          return 1 * dir;
        }
        return dir * cmpStr(a.name || '', b.name || '');
      }
      if (col === 'acfSize') {
        const va = acfSizeVal(a);
        const vb = acfSizeVal(b);
        if (va == null && vb == null) {
          return dir * cmpStr(a.name || '', b.name || '');
        }
        if (va == null) {
          return 1 * dir;
        }
        if (vb == null) {
          return -1 * dir;
        }
        if (va < vb) {
          return -1 * dir;
        }
        if (va > vb) {
          return 1 * dir;
        }
        return dir * cmpStr(a.name || '', b.name || '');
      }
      if (col === 'acfUpdated') {
        const va = acfTimeVal(a);
        const vb = acfTimeVal(b);
        if (va == null && vb == null) {
          return dir * cmpStr(a.name || '', b.name || '');
        }
        if (va == null) {
          return 1 * dir;
        }
        if (vb == null) {
          return -1 * dir;
        }
        if (va < vb) {
          return -1 * dir;
        }
        if (va > vb) {
          return 1 * dir;
        }
        return dir * cmpStr(a.name || '', b.name || '');
      }
      const pa = workshopFolderDisplayPath(a.path);
      const pb = workshopFolderDisplayPath(b.path);
      return dir * cmpStr(pa, pb);
    });
    return rows;
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize()) || 1));

  createEffect(() => {
    const tp = totalPages();
    setPage((p) => Math.min(Math.max(1, p), tp));
  });

  const pageSlice = createMemo(() => {
    const start = (page() - 1) * pageSize();
    return sorted().slice(start, start + pageSize());
  });

  const toggleSort = (col: SortCol) => () => {
    if (sortCol() === col) {
      setSortAsc((v) => !v);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
    setPage(1);
  };

  const thSort = (col: SortCol, label: string, longDesc: string, extraThClass?: string) => (
    <TableHead
      scope="col"
      title={longDesc}
      class={extraThClass}
      aria-sort={sortCol() === col ? (sortAsc() ? 'ascending' : 'descending') : undefined}
    >
      <Button
        variant="secondary"
        size="sm"
        class="min-h-6 px-1 py-0.5 text-[inherit] font-[inherit]"
        onClick={toggleSort(col)}
        title={`${longDesc} (${t('mods.sortTitle')})`}
        aria-label={`${label}: ${longDesc}. ${t('mods.sortAria')}`}
      >
        {label}
        {sortCol() === col ? (sortAsc() ? ' ▲' : ' ▼') : ''}
      </Button>
    </TableHead>
  );

  const formatAcfTime = (m: workshop.Item) => {
    const ts = acfTimeVal(m);
    if (ts == null) {
      return t('mods.acfMissing');
    }
    try {
      return new Date(ts * 1000).toLocaleString(i18n.language);
    } catch {
      return t('mods.acfMissing');
    }
  };

  const acfSizeCell = (m: workshop.Item) => {
    const v = acfSizeVal(m);
    const title = m.acfManifest ? `${t('mods.acfManifestHint')}: ${m.acfManifest}` : undefined;
    return (
      <span class="tabular-nums" title={title}>
        {v == null ? t('mods.acfMissing') : formatBytes(v)}
      </span>
    );
  };

  return (
    <div>
      <PageHeader icon={Package} title={t('mods.title')} description={t('mods.subtitle')} />
      <Show when={!!err()}>
        <AlertError>{err()}</AlertError>
      </Show>

      <Card aria-labelledby="mods-overview-title">
        <CardTitle id="mods-overview-title">
          <Package size={16} strokeWidth={1.75} aria-hidden />
          {t('mods.sectionOverview')}
        </CardTitle>
        {items().length > 0 ? (
          <p class="mb-3 mt-0 text-sm text-muted-foreground">
            {t('mods.totalAll')} <strong class="text-foreground">{formatBytes(totalBytesAll())}</strong>
            {q().trim() && sorted().length !== items().length ? (
              <>
                {' '}
                · {t('mods.filtered')} <strong class="text-foreground">{formatBytes(totalBytesFiltered())}</strong> ({t('mods.modsCount', {count: sorted().length})})
              </>
            ) : null}
          </p>
        ) : null}
        <AlertInfo class="mb-3">
          <p class="m-0 text-sm font-semibold leading-snug text-foreground">{t('mods.overviewImportantTitle')}</p>
          <p class="mb-0 mt-2 text-sm leading-relaxed">{t('mods.overviewImportantP1')}</p>
          <p class="mb-0 mt-2 text-sm leading-relaxed">{t('mods.overviewImportantP2')}</p>
        </AlertInfo>
        <p class="mb-1.5 mt-0 text-[0.8125rem] font-medium text-muted-foreground">{t('mods.overviewListIntro')}</p>
        <ul class="mb-0 list-outside list-disc space-y-1.5 pl-5 text-[0.8125rem] leading-snug text-muted-foreground">
          <li>{t('mods.overviewBulletMeta')}</li>
          <li>{t('mods.overviewBulletAcf')}</li>
        </ul>
      </Card>

      <Card class="mb-0 flex min-h-0 flex-col" aria-labelledby="mods-list-title">
        <CardTitle id="mods-list-title">
          <Rows3 size={16} strokeWidth={1.75} aria-hidden />
          {t('mods.sectionList')}
        </CardTitle>
        <div class="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div class="mb-0 min-w-0 flex-1 basis-64">
            <Label for="mods-search">{t('mods.searchLabel')}</Label>
            <div class="flex max-w-xl items-stretch gap-1.5">
              <Input
                id="mods-search"
                class="min-w-0 flex-1"
                value={q()}
                onInput={(e) => {
                  setQ(e.currentTarget.value);
                  setPage(1);
                }}
                placeholder={t('mods.filterPh')}
                autocomplete="off"
              />
              <Button variant="secondary" class="min-w-[2.375rem] shrink-0 px-2" disabled={!q().trim()} aria-label={t('common.clearField')} onClick={() => { setQ(''); setPage(1); }}>
                <X size={16} strokeWidth={2} aria-hidden />
              </Button>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              disabled={reloadBusy()}
              aria-busy={reloadBusy()}
              aria-label={t('mods.reloadListAria')}
              title={t('mods.reloadListAria')}
              onClick={() => void reload()}
            >
              <RefreshCw size={16} strokeWidth={2} class={reloadBusy() ? 'animate-spin' : ''} aria-hidden />
              {t('mods.reloadList')}
            </Button>
            <span class="text-[0.8125rem] font-semibold text-muted-foreground">{t('browse.perPage')}</span>
            <PageSizeInput
              id="mods-page-size"
              value={pageSize()}
              ariaLabel={t('browse.perPage')}
              onChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        </div>
        <TableScroll>
          <Table>
            <TableCaption class="sr-only">{t('mods.tableCaption')}</TableCaption>
            <thead>
              <tr>
                {thSort('id', t('mods.thId'), t('mods.thIdLong'))}
                {thSort('name', t('mods.thName'), t('mods.thNameLong'))}
                {thSort('size', t('mods.thSize'), t('mods.thSizeLong'), 'text-right')}
                {thSort('acfSize', t('mods.thAcfSize'), t('mods.thAcfSizeLong'), 'text-right')}
                {thSort('acfUpdated', t('mods.thAcfUpdated'), t('mods.thAcfUpdatedLong'))}
                {thSort('path', t('mods.thPath'), t('mods.thPathLong'))}
                <TableHead scope="col" title={t('mods.thActionsLong')}>
                  {t('mods.thActions')}
                </TableHead>
              </tr>
            </thead>
            <TableBody>
              <For each={pageSlice()}>
                {(m) => (
                  <TableRow>
                    <TableCell>{m.id}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell class="text-right">{formatBytes(Number(m.sizeBytes) || 0)}</TableCell>
                    <TableCell class="text-right">{acfSizeCell(m)}</TableCell>
                    <TableCell>{formatAcfTime(m)}</TableCell>
                    <TableCell class="max-w-96 whitespace-normal">{workshopFolderDisplayPath(m.path)}</TableCell>
                    <TableCell>
                      <div class="flex flex-wrap gap-1">
                        <Button variant="secondary" size="sm" title={t('mods.steamPageTitle')} onClick={() => App.WorkshopPage(m.id)}>
                          <ExternalLink size={14} strokeWidth={2} aria-hidden />
                          {t('mods.steam')}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          title={t('mods.localTitle')}
                          aria-label={t('mods.localTitle')}
                          onClick={() =>
                            App.OpenWorkshopItemFolder(m.path)
                              .then(() => setErr(''))
                              .catch((e) => setErr(String(e)))
                          }
                        >
                          <FolderOpen size={14} strokeWidth={2} aria-hidden />
                          {t('mods.local')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </TableScroll>
        {items().length > 0 ? (
          <footer class="mt-2 flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div class="flex flex-wrap items-center gap-1.5">
              <Button variant="secondary" disabled={page() <= 1} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                ««
              </Button>
              <Button variant="secondary" disabled={page() <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                ‹
              </Button>
              <span class="min-w-[5.5rem] text-center text-[0.85rem] text-muted-foreground" aria-live="polite">
                {page()} / {totalPages()}
              </span>
              <Button variant="secondary" disabled={page() >= totalPages()} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                ›
              </Button>
              <Button variant="secondary" disabled={page() >= totalPages()} onClick={() => setPage(totalPages())} aria-label={t('browse.pageLast')}>
                »»
              </Button>
            </div>
            <p class="m-0 max-w-md text-right text-[0.8rem] text-muted-foreground sm:text-left">
              {t('mods.pageLine', {slice: pageSlice().length, filtered: sorted().length, total: items().length})}
            </p>
          </footer>
        ) : null}
        {items().length === 0 && !err() ? <p class="mb-0 text-muted-foreground">{t('mods.noneFound')}</p> : null}
        {items().length > 0 && sorted().length === 0 ? <p class="mb-0 text-muted-foreground">{t('mods.noMatch')}</p> : null}
      </Card>
    </div>
  );
}
