import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ExternalLink, Package, Rows3, Trash2} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {workshop} from '../../../wailsjs/go/models';
import {DsSelect} from '../../shared/DsSelect';
import {PageHeader} from '../../shared/PageHeader';
import {formatBytes} from '../../shared/formatBytes';
import {workshopFolderDisplayPath} from '../../shared/workshopDisplayPath';

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

type SortCol = 'id' | 'name' | 'path' | 'size';

function cmpStr(a: string, b: string) {
  return a.localeCompare(b, undefined, {sensitivity: 'base'});
}

export function ModsPage() {
  const {t} = useTranslation();
  const [items, setItems] = useState<workshop.Item[]>([]);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sel, setSel] = useState(() => new Set<string>());
  const [busy, setBusy] = useState(false);

  const reload = () =>
    App.ListWorkshopItems()
      .then((rows) => {
        setErr('');
        setItems(rows);
      })
      .catch((e) => setErr(String(e)));

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) {
      return items;
    }
    return items.filter((m) => m.name.toLowerCase().includes(x) || String(m.id).toLowerCase().includes(x));
  }, [items, q]);

  const totalBytesAll = useMemo(() => items.reduce((s, m) => s + (Number(m.sizeBytes) || 0), 0), [items]);

  const totalBytesFiltered = useMemo(() => filtered.reduce((s, m) => s + (Number(m.sizeBytes) || 0), 0), [filtered]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const dir = sortAsc ? 1 : -1;
    rows.sort((a, b) => {
      if (sortCol === 'id') {
        return dir * cmpStr(String(a.id), String(b.id));
      }
      if (sortCol === 'name') {
        return dir * cmpStr(a.name || '', b.name || '');
      }
      if (sortCol === 'size') {
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
  }, [filtered, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [sorted.length, pageSize, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const allFilteredSelected = sorted.length > 0 && sorted.every((m) => sel.has(m.path));

  const toggleSort = (col: SortCol) => () => {
    if (sortCol === col) {
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
      className={thClassName}
      aria-sort={sortCol === col ? (sortAsc ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        className="btn btn-secondary"
        style={{font: 'inherit', padding: '0.15rem 0.35rem'}}
        onClick={toggleSort(col)}
        title={`${longDesc} (${t('mods.sortTitle')})`}
        aria-label={`${label}: ${longDesc}. ${t('mods.sortAria')}`}
      >
        {label}
        {sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  const toggleSelectAllFiltered = () => {
    setSel((prev) => {
      const n = new Set(prev);
      if (sorted.length > 0 && sorted.every((m) => n.has(m.path))) {
        sorted.forEach((m) => n.delete(m.path));
      } else {
        sorted.forEach((m) => n.add(m.path));
      }
      return n;
    });
  };

  const toggleRow = (path: string) => {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(path)) {
        n.delete(path);
      } else {
        n.add(path);
      }
      return n;
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
    const paths = Array.from(sel);
    if (paths.length === 0) {
      return;
    }
    if (!window.confirm(t('mods.confirmMany', {count: paths.length}))) {
      return;
    }
    deletePaths(paths);
  };

  const presetValue = PAGE_PRESETS.includes(pageSize as (typeof PAGE_PRESETS)[number]) ? String(pageSize) : 'custom';

  const perPageSelectOptions = useMemo(
    () => [...PAGE_PRESETS.map((n) => ({value: String(n), label: String(n)})), {value: 'custom', label: t('mods.other')}],
    [t],
  );

  return (
    <div>
      <PageHeader icon={Package} title={t('mods.title')} description={t('mods.subtitle')} />
      {err ? <div className="msg msg-error">{err}</div> : null}

      <section className="ds-card" aria-labelledby="mods-overview-title">
        <h2 id="mods-overview-title" className="ds-section-title">
          <Package size={16} strokeWidth={1.75} aria-hidden />
          {t('mods.sectionOverview')}
        </h2>
        {items.length > 0 ? (
          <p style={{fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: 'var(--ds-space-md)'}}>
            {t('mods.totalAll')} <strong style={{color: 'var(--text)'}}>{formatBytes(totalBytesAll)}</strong>
            {q.trim() && sorted.length !== items.length ? (
              <>
                {' '}
                · {t('mods.filtered')} <strong style={{color: 'var(--text)'}}>{formatBytes(totalBytesFiltered)}</strong> ({t('mods.modsCount', {count: sorted.length})})
              </>
            ) : null}
          </p>
        ) : null}
        <p style={{color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 0, marginBottom: 0}}>{t('mods.help')}</p>
      </section>

      <section className="ds-card browse-table-card" aria-labelledby="mods-list-title">
        <h2 id="mods-list-title" className="ds-section-title">
          <Rows3 size={16} strokeWidth={1.75} aria-hidden />
          {t('mods.sectionList')}
        </h2>
        <div className="browse-table-toolbar browse-toolbar-split-search">
          <div className="field browse-search-field">
            <label htmlFor="mods-search">{t('mods.searchLabel')}</label>
            <input id="mods-search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t('mods.filterPh')} autoComplete="off" />
          </div>
          <div className="browse-table-toolbar-actions browse-toolbar-actions-trailing">
            <button type="button" className="btn btn-secondary" disabled={busy || sorted.length === 0} onClick={toggleSelectAllFiltered}>
              {allFilteredSelected ? t('mods.deselectAll') : t('mods.selectAll')}
            </button>
            <button type="button" className="btn btn-danger" disabled={busy || sel.size === 0} onClick={deleteSelected}>
              {t('mods.deleteSel', {count: sel.size})}
            </button>
            <span className="browse-toolbar-label">{t('browse.perPage')}</span>
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
            <label className="browse-page-size-num">
              <span>{t('browse.number')}</span>
              <input
                type="number"
                min={1}
                max={500}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(clampPageSize(parseInt(e.target.value, 10)));
                  setPage(1);
                }}
              />
            </label>
          </div>
        </div>
        <div className="table-wrap browse-table-scroll">
          <table className="data">
            <caption className="sr-only">{t('mods.tableCaption')}</caption>
            <thead>
              <tr>
                <th scope="col" title={t('mods.thSelectColumnLong')} style={{width: '2.5rem'}}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    disabled={busy || sorted.length === 0}
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
              {pageSlice.map((m) => (
                <tr key={m.path}>
                  <td>
                    <input
                      type="checkbox"
                      checked={sel.has(m.path)}
                      disabled={busy}
                      onChange={() => toggleRow(m.path)}
                      aria-label={t('mods.toggleRowAria', {name: m.name || String(m.id)})}
                    />
                  </td>
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td style={{textAlign: 'right'}}>{formatBytes(Number(m.sizeBytes) || 0)}</td>
                  <td style={{whiteSpace: 'normal', maxWidth: '24rem'}}>{workshopFolderDisplayPath(m.path)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn btn-secondary" disabled={busy} title={t('mods.steamPageTitle')} onClick={() => App.WorkshopPage(m.id)}>
                        <ExternalLink size={14} strokeWidth={2} aria-hidden />
                        {t('mods.steam')}
                      </button>
                      <button type="button" className="btn btn-danger" disabled={busy} title={t('mods.deleteTitle')} onClick={() => deleteOne(m)}>
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                        {t('mods.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length > 0 ? (
          <footer className="browse-mods-table-footer">
            <div className="browse-table-toolbar-actions browse-mods-footer-actions">
              <div className="browse-pagination-btns">
                <button type="button" className="btn btn-secondary" disabled={page <= 1 || busy} onClick={() => setPage(1)} aria-label={t('browse.pageFirst')}>
                  ««
                </button>
                <button type="button" className="btn btn-secondary" disabled={page <= 1 || busy} onClick={() => setPage((p) => p - 1)} aria-label={t('browse.pagePrev')}>
                  ‹
                </button>
                <span className="browse-page-indicator" aria-live="polite">
                  {page} / {totalPages}
                </span>
                <button type="button" className="btn btn-secondary" disabled={page >= totalPages || busy} onClick={() => setPage((p) => p + 1)} aria-label={t('browse.pageNext')}>
                  ›
                </button>
                <button type="button" className="btn btn-secondary" disabled={page >= totalPages || busy} onClick={() => setPage(totalPages)} aria-label={t('browse.pageLast')}>
                  »»
                </button>
              </div>
              <p className="browse-page-line browse-page-line-end">{t('mods.pageLine', {slice: pageSlice.length, filtered: sorted.length, total: items.length})}</p>
            </div>
          </footer>
        ) : null}
        {items.length === 0 && !err ? <p style={{marginBottom: 0}}>{t('mods.noneFound')}</p> : null}
        {items.length > 0 && sorted.length === 0 ? <p style={{marginBottom: 0}}>{t('mods.noMatch')}</p> : null}
      </section>
    </div>
  );
}
