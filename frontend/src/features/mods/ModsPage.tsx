import {createEffect, createMemo, createSignal, For, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {ExternalLink, Package, Rows3, Trash2, X} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {workshop} from '../../../wailsjs/go/models';
import {PageSizeInput} from '../../shared/PageSizeInput';
import {PageHeader} from '../../shared/PageHeader';
import {clampPageSize} from '../../shared/pageSizeConstants';
import {formatBytes} from '../../shared/formatBytes';
import {workshopFolderDisplayPath} from '../../shared/workshopDisplayPath';

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

  const toggleSort = (col: SortCol) => () => {
    if (sortCol() === col) {
      setSortAsc((v) => !v);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
    setPage(1);
  };

  const thSort = (col: SortCol, label: string, longDesc: string, thClassName?: string) => (
    <th
      scope="col"
      title={longDesc}
      class={thClassName}
      aria-sort={sortCol() === col ? (sortAsc() ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        class="btn btn-secondary"
        style={{font: 'inherit', padding: '0.15rem 0.35rem'}}
        onClick={toggleSort(col)}
        title={`${longDesc} (${t('mods.sortTitle')})`}
        aria-label={`${label}: ${longDesc}. ${t('mods.sortAria')}`}
      >
        {label}
        {sortCol() === col ? (sortAsc() ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  const toggleSelectAllFiltered = () => {
    setSel((prev) => {
      const n = new Set(prev);
      const sr = sorted();
      if (sr.length > 0 && sr.every((m) => n.has(m.path))) {
        sr.forEach((m) => n.delete(m.path));
      } else {
        sr.forEach((m) => n.add(m.path));
      }
      return n;
    });
  };

  const toggleRow = (path: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
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
        <div class="msg msg-error">{err()}</div>
      </Show>

      <section class="ds-card" aria-labelledby="mods-overview-title">
        <h2 id="mods-overview-title" class="ds-section-title">
          <Package size={16} strokeWidth={1.75} aria-hidden />
          {t('mods.sectionOverview')}
        </h2>
        {items().length > 0 ? (
          <p style={{'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': 0, 'margin-bottom': 'var(--ds-space-md)'}}>
            {t('mods.totalAll')} <strong style={{color: 'var(--text)'}}>{formatBytes(totalBytesAll())}</strong>
            {q().trim() && sorted().length !== items().length ? (
              <>
                {' '}
                · {t('mods.filtered')} <strong style={{color: 'var(--text)'}}>{formatBytes(totalBytesFiltered())}</strong> ({t('mods.modsCount', {count: sorted().length})})
              </>
            ) : null}
          </p>
        ) : null}
        <p style={{color: 'var(--text-muted)', 'font-size': '0.8125rem', 'margin-top': 0, 'margin-bottom': 0}}>{t('mods.help')}</p>
      </section>

      <section class="ds-card browse-table-card" aria-labelledby="mods-list-title">
        <h2 id="mods-list-title" class="ds-section-title">
          <Rows3 size={16} strokeWidth={1.75} aria-hidden />
          {t('mods.sectionList')}
        </h2>
        <div class="browse-table-toolbar browse-toolbar-split-search">
          <div class="field browse-search-field">
            <label for="mods-search">{t('mods.searchLabel')}</label>
            <div class="browse-field-input-row">
              <input
                id="mods-search"
                value={q()}
                onInput={(e) => {
                  setQ(e.currentTarget.value);
                  setPage(1);
                }}
                placeholder={t('mods.filterPh')}
                autocomplete="off"
              />
              <button type="button" class="btn btn-secondary browse-input-clear" disabled={!q().trim()} aria-label={t('common.clearField')} onClick={() => { setQ(''); setPage(1); }}>
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
          <div class="browse-table-toolbar-actions browse-toolbar-actions-trailing">
            <button type="button" class="btn btn-secondary" disabled={busy() || sorted().length === 0} onClick={toggleSelectAllFiltered}>
              {allFilteredSelected() ? t('mods.deselectAll') : t('mods.selectAll')}
            </button>
            <button type="button" class="btn btn-danger" disabled={busy() || sel().size === 0} onClick={deleteSelected}>
              {t('mods.deleteSel', {count: sel().size})}
            </button>
            <span class="browse-toolbar-label">{t('browse.perPage')}</span>
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
        <div class="table-wrap browse-table-scroll">
          <table class="data">
            <caption class="sr-only">{t('mods.tableCaption')}</caption>
            <thead>
              <tr>
                <th scope="col" title={t('mods.thSelectColumnLong')} style={{width: '2.5rem'}}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected()}
                    disabled={busy() || sorted().length === 0}
                    onChange={toggleSelectAllFiltered}
                    title={t('mods.selectFilteredTitle')}
                    aria-label={t('mods.selectFilteredTitle')}
                  />
                </th>
                {thSort('id', t('mods.thId'), t('mods.thIdLong'))}
                {thSort('name', t('mods.thName'), t('mods.thNameLong'))}
                {thSort('size', t('mods.thSize'), t('mods.thSizeLong'), 'mods-th-size')}
                {thSort('path', t('mods.thPath'), t('mods.thPathLong'))}
                <th scope="col" title={t('mods.thActionsLong')}>
                  {t('mods.thActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={pageSlice()}>
                {(m) => (
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        checked={sel().has(m.path)}
                        disabled={busy()}
                        onChange={() => toggleRow(m.path)}
                        aria-label={t('mods.toggleRowAria', {name: m.name || String(m.id)})}
                      />
                    </td>
                    <td>{m.id}</td>
                    <td>{m.name}</td>
                    <td style={{'text-align': 'right'}}>{formatBytes(Number(m.sizeBytes) || 0)}</td>
                    <td style={{'white-space': 'normal', 'max-width': '24rem'}}>{workshopFolderDisplayPath(m.path)}</td>
                    <td>
                      <div class="row-actions">
                        <button type="button" class="btn btn-secondary" disabled={busy()} title={t('mods.steamPageTitle')} onClick={() => App.WorkshopPage(m.id)}>
                          <ExternalLink size={14} strokeWidth={2} aria-hidden />
                          {t('mods.steam')}
                        </button>
                        <button type="button" class="btn btn-danger" disabled={busy()} title={t('mods.deleteTitle')} onClick={() => deleteOne(m)}>
                          <Trash2 size={14} strokeWidth={2} aria-hidden />
                          {t('mods.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
        {items().length > 0 ? (
          <footer class="browse-mods-table-footer">
            <div class="browse-table-toolbar-actions browse-mods-footer-actions">
              <div class="browse-pagination-btns">
                <button type="button" class="btn btn-secondary" disabled={page() <= 1 || busy()} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                  ««
                </button>
                <button type="button" class="btn btn-secondary" disabled={page() <= 1 || busy()} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                  ‹
                </button>
                <span class="browse-page-indicator" aria-live="polite">
                  {page()} / {totalPages()}
                </span>
                <button type="button" class="btn btn-secondary" disabled={page() >= totalPages() || busy()} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                  ›
                </button>
                <button type="button" class="btn btn-secondary" disabled={page() >= totalPages() || busy()} onClick={() => setPage(totalPages())} aria-label={t('browse.pageLast')}>
                  »»
                </button>
              </div>
              <p class="browse-page-line browse-page-line-end">{t('mods.pageLine', {slice: pageSlice().length, filtered: sorted().length, total: items().length})}</p>
            </div>
          </footer>
        ) : null}
        {items().length === 0 && !err() ? <p style={{'margin-bottom': 0}}>{t('mods.noneFound')}</p> : null}
        {items().length > 0 && sorted().length === 0 ? <p style={{'margin-bottom': 0}}>{t('mods.noMatch')}</p> : null}
      </section>
    </div>
  );
}
