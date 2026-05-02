import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown} from 'lucide-react';

export type DsSelectOption = {value: string; label: string};

type DsSelectProps = {
  id?: string;
  value: string;
  options: DsSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  width?: 'full' | 'auto';
};

export function DsSelect({id, value, options, onChange, disabled, ariaLabel, className, width = 'full'}: DsSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [panelRect, setPanelRect] = useState<{top: number; left: number; width: number; maxH: number} | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const listboxId = `${uid}-lb`;

  const selIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const displayLabel = options[selIndex]?.label ?? options[0]?.label ?? '';

  const updatePanelRect = useCallback(() => {
    const el = btnRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const maxH = Math.min(280, Math.max(120, spaceBelow));
    setPanelRect({top: r.bottom + 2, left: r.left, width: r.width, maxH});
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null);
      return;
    }
    setHighlight(selIndex);
    updatePanelRect();
    const onScroll = () => updatePanelRect();
    const onResize = () => updatePanelRect();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, selIndex, updatePanelRect]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (options.length === 0) {
          return;
        }
        setHighlight((h) => Math.min(h + 1, options.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (options.length === 0) {
          return;
        }
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (options.length === 0) {
          return;
        }
        const opt = options[highlight];
        if (opt) {
          onChange(opt.value);
        }
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, highlight, options, onChange]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    btnRef.current?.focus();
  };

  const toggle = () => {
    if (disabled) {
      return;
    }
    setOpen((o) => !o);
  };

  const wrapClass = `ds-select${width === 'auto' ? ' ds-select-auto' : ''}${className ? ` ${className}` : ''}`;

  const panel =
    open && panelRect
      ? createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            className="ds-select-panel"
            style={{
              position: 'fixed',
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
              maxHeight: panelRect.maxH,
              zIndex: 10000,
            }}
          >
            {options.map((opt, i) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`ds-select-option${i === highlight ? ' ds-select-option-active' : ''}${opt.value === value ? ' ds-select-option-selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt.value);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {opt.label}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={wrapClass}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        className="ds-select-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={toggle}
        onKeyDown={(e) => {
          if (disabled) {
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!open) {
              setOpen(true);
            }
          }
        }}
      >
        <span className="ds-select-value">{displayLabel}</span>
        <ChevronDown size={16} strokeWidth={2} className="ds-select-chevron" aria-hidden />
      </button>
      {panel}
    </div>
  );
}
