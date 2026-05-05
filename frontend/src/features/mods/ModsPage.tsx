import {createEffect, createMemo, createSignal, For, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {ExternalLink, FolderOpen, Package, Rows3, Trash2, X} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {workshop} from '../../../wailsjs/go/models';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {formatBytes} from '../../shared/formatBytes';
import {workshopFolderDisplayPath} from '../../shared/workshopDisplayPath';
import {AlertError} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableRow, TableScroll} from '@/components/ui/table';
import {TableCheckbox} from '@/components/ui/checkbox';

type SortCol = 'id' | 'name' | 'path' | 'size';

function cmpStr(a: string, b: string) {
  return a.localeCompare(b, undefined, {sensitivity: 'base'});
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
  const [sel, setSel] = createSignal(new Set<string>());
  const [busy, setBusy] = createSignal(false);

  const reload = () =>
    App.ListWorkshopItems()
      .then((rows) => {
        setErr('');
        setItems(rows);
      })
      .catch((e) => setErr(String(e)));

  onMount(() => {
    void reload();
  });

  const filtered = createMemo(() => {
    const x = q().trim().toLowerCase();
    const it = items();
    if (!x) {
      return it;
    }
    return it.filter((m) => m.name.toLowerCase().includes(x) || String(m.id).toLowerCase().includes(x));
  });

  const totalBytesAll = createMemo(() => items().reduce((s, m) => s + (Number(m.sizeBytes) || 0), 0));

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

  const allFilteredSelected = () => sorted().length > 0 && sorted().every((m) => sel().has(m.path));

  const selectAllTriState = createMemo(() => {
    const sr = sorted();
    if (sr.length === 0) {
      return {checked: false, indeterminate: false};
    }
    const n = sel();
    const all = sr.every((m) => n.has(m.path));
    const some = sr.some((m) => n.has(m.path));
    return {checked: all, indeterminate: !all && some};
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

  const onSelectAllChange = (checked: boolean) => {
    const sr = sorted();
    setSel((prev) => {
      const n = new Set(prev);
      if (checked) {
        sr.forEach((m) => n.add(m.path));
      } else {
        sr.forEach((m) => n.delete(m.path));
      }
      return n;
    });
  };

  const onRowCheckChange = (path: string) => (checked: boolean) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const deletePaths = (paths: string[]) => {
    if (paths.length === 0) {
      return;
    }
    setBusy(true);
    App.DeleteWorkshopItems(paths)
      .then(() => reload())
      .then(() => {
        setSel((prev) => {
          const n = new Set(prev);
          paths.forEach((p) => n.delete(p));
          return n;
        });
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setBusy(false));
  };

  const deleteOne = (m: workshop.Item) => {
    if (!window.confirm(t('mods.confirmOne'))) {
      return;
    }
    deletePaths([m.path]);
  };

  const deleteSelected = () => {
    const paths = Array.from(sel());
    if (paths.length === 0) {
      return;
    }
    if (!window.confirm(t('mods.confirmMany', {count: paths.length}))) {
      return;
    }
    deletePaths(paths);
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
        <p class="mb-0 mt-0 text-[0.8125rem] text-muted-foreground">{t('mods.help')}</p>
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
            <Button variant="secondary" disabled={busy() || sorted().length === 0} onClick={() => onSelectAllChange(!allFilteredSelected())}>
              {allFilteredSelected() ? t('mods.deselectAll') : t('mods.selectAll')}
            </Button>
            <Button variant="destructive" disabled={busy() || sel().size === 0} onClick={deleteSelected}>
              {t('mods.deleteSel', {count: sel().size})}
            </Button>
            <span class="text-[0.8125rem] font-semibold text-muted-foreground">{t('browse.perPage')}</span>
            <PageSizeInput
              id="mods-page-size"
              value={pageSize()}
              disabled={busy()}
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
                <TableHead scope="col" class="w-10" title={t('mods.thSelectColumnLong')}>
                  <TableCheckbox
                    checked={selectAllTriState().checked}
                    indeterminate={selectAllTriState().indeterminate}
                    onChange={onSelectAllChange}
                    disabled={busy() || sorted().length === 0}
                    title={t('mods.selectFilteredTitle')}
                    ariaLabel={t('mods.selectFilteredTitle')}
                  />
                </TableHead>
                {thSort('id', t('mods.thId'), t('mods.thIdLong'))}
                {thSort('name', t('mods.thName'), t('mods.thNameLong'))}
                {thSort('size', t('mods.thSize'), t('mods.thSizeLong'), 'text-right')}
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
                    <TableCell>
                      <TableCheckbox
                        checked={sel().has(m.path)}
                        disabled={busy()}
                        onChange={onRowCheckChange(m.path)}
                        ariaLabel={t('mods.toggleRowAria', {name: m.name || String(m.id)})}
                      />
                    </TableCell>
                    <TableCell>{m.id}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell class="text-right">{formatBytes(Number(m.sizeBytes) || 0)}</TableCell>
                    <TableCell class="max-w-96 whitespace-normal">{workshopFolderDisplayPath(m.path)}</TableCell>
                    <TableCell>
                      <div class="flex flex-wrap gap-1">
                        <Button variant="secondary" size="sm" disabled={busy()} title={t('mods.steamPageTitle')} onClick={() => App.WorkshopPage(m.id)}>
                          <ExternalLink size={14} strokeWidth={2} aria-hidden />
                          {t('mods.steam')}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy()}
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
                        <Button variant="destructive" size="sm" disabled={busy()} title={t('mods.deleteTitle')} onClick={() => deleteOne(m)}>
                          <Trash2 size={14} strokeWidth={2} aria-hidden />
                          {t('mods.delete')}
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
              <Button variant="secondary" disabled={page() <= 1 || busy()} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                ««
              </Button>
              <Button variant="secondary" disabled={page() <= 1 || busy()} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                ‹
              </Button>
              <span class="min-w-[5.5rem] text-center text-[0.85rem] text-muted-foreground" aria-live="polite">
                {page()} / {totalPages()}
              </span>
              <Button variant="secondary" disabled={page() >= totalPages() || busy()} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                ›
              </Button>
              <Button variant="secondary" disabled={page() >= totalPages() || busy()} onClick={() => setPage(totalPages())} aria-label={t('browse.pageLast')}>
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
