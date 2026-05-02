import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import * as App from '../../../wailsjs/go/main/App';
import {workshop} from '../../../wailsjs/go/models';
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
        return 0;
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

  const thSort = (col: SortCol, label: string) => (
    <th>
      <button type="button" className="btn btn-secondary" style={{font: 'inherit', padding: '0.15rem 0.35rem'}} onClick={toggleSort(col)} title={t('mods.sortTitle')}>
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

  return (
    <div>
      <h1 style={{marginTop: 0}}>{t('mods.title')}</h1>
      {err ? <div className="msg msg-error">{err}</div> : null}
      {items.length > 0 ? (
        <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem'}}>
          {t('mods.totalAll')} <strong style={{color: 'var(--text)'}}>{formatBytes(totalBytesAll)}</strong>
          {q.trim() && sorted.length !== items.length ? (
            <>
              {' '}
              · {t('mods.filtered')} <strong style={{color: 'var(--text)'}}>{formatBytes(totalBytesFiltered)}</strong> ({t('mods.modsCount', {count: sorted.length})})
            </>
          ) : null}
        </p>
      ) : null}
      <p style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{t('mods.help')}</p>
      <div className="field">
        <label>{t('mods.searchLabel')}</label>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t('mods.filterPh')} />
      </div>
      <div className="toolbar" style={{flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center'}}>
        <button type="button" className="btn btn-secondary" disabled={busy || sorted.length === 0} onClick={toggleSelectAllFiltered}>
          {allFilteredSelected ? t('mods.deselectAll') : t('mods.selectAll')}
        </button>
        <button type="button" className="btn btn-danger" disabled={busy || sel.size === 0} onClick={deleteSelected}>
          {t('mods.deleteSel', {count: sel.size})}
        </button>
      </div>
      <div className="toolbar" style={{alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'}}>
        <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{t('mods.perPage')}</span>
        <select
          value={presetValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') {
              return;
            }
            setPageSize(parseInt(v, 10));
            setPage(1);
          }}
          style={{width: '5.5rem'}}
        >
          {PAGE_PRESETS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="custom">{t('mods.other')}</option>
        </select>
        <label style={{display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
          {t('mods.number')}
          <input
            type="number"
            min={1}
            max={500}
            value={pageSize}
            onChange={(e) => {
              setPageSize(clampPageSize(parseInt(e.target.value, 10)));
              setPage(1);
            }}
            style={{width: '4.5rem'}}
          />
        </label>
      </div>
      <div className="toolbar" style={{justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'}}>
        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0}}>
          {t('mods.pageLine', {slice: pageSlice.length, filtered: sorted.length, total: items.length})}
        </p>
        <div style={{display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <button type="button" className="btn btn-secondary" disabled={page <= 1 || busy} onClick={() => setPage(1)}>
            ««
          </button>
          <button type="button" className="btn btn-secondary" disabled={page <= 1 || busy} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '8rem', textAlign: 'center'}}>
            {page} / {totalPages}
          </span>
          <button type="button" className="btn btn-secondary" disabled={page >= totalPages || busy} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
          <button type="button" className="btn btn-secondary" disabled={page >= totalPages || busy} onClick={() => setPage(totalPages)}>
            »»
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th style={{width: '2.5rem'}}>
                <input type="checkbox" checked={allFilteredSelected} disabled={busy || sorted.length === 0} onChange={toggleSelectAllFiltered} title={t('mods.selectFilteredTitle')} />
              </th>
              {thSort('id', t('mods.thId'))}
              {thSort('name', t('mods.thName'))}
              {thSort('size', t('mods.thSize'))}
              {thSort('path', t('mods.thPath'))}
              <th>{t('mods.thActions')}</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((m) => (
              <tr key={m.path}>
                <td>
                  <input type="checkbox" checked={sel.has(m.path)} disabled={busy} onChange={() => toggleRow(m.path)} />
                </td>
                <td>{m.id}</td>
                <td>{m.name}</td>
                <td>{formatBytes(Number(m.sizeBytes) || 0)}</td>
                <td style={{whiteSpace: 'normal', maxWidth: '24rem'}}>{workshopFolderDisplayPath(m.path)}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => App.WorkshopPage(m.id)}>
                      {t('mods.steam')}
                    </button>
                    <button type="button" className="btn btn-danger" disabled={busy} onClick={() => deleteOne(m)}>
                      {t('mods.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !err ? <p>{t('mods.noneFound')}</p> : null}
      {items.length > 0 && sorted.length === 0 ? <p>{t('mods.noMatch')}</p> : null}
    </div>
  );
}
