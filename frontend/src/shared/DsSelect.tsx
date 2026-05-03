import {createRenderEffect, createMemo, createSignal, For, onCleanup, Show} from 'solid-js';
import {Portal} from 'solid-js/web';
import {ChevronDown} from 'lucide-solid';

export type DsSelectOption = {value: string; label: string};

export type DsSelectProps = {
  id?: string;
  value: string;
  options: DsSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  class?: string;
  className?: string;
  width?: 'full' | 'auto';
};

export function DsSelect(props: DsSelectProps) {
  const width = () => props.width ?? 'full';
  const extraClass = () => props.class ?? props.className ?? '';
  const [open, setOpen] = createSignal(false);
  const [highlight, setHighlight] = createSignal(0);
  const [panelRect, setPanelRect] = createSignal<{top: number; left: number; width: number; maxH: number} | null>(null);
  let rootRef: HTMLDivElement | undefined;
  let btnRef: HTMLButtonElement | undefined;
  let panelRef: HTMLDivElement | undefined;
  const uid = `ds-${Math.random().toString(36).slice(2, 10)}`;
  const listboxId = `${uid}-lb`;

  const selIndex = () =>
    Math.max(
      0,
      props.options.findIndex((o) => o.value === props.value),
    );
  const displayLabel = () => props.options[selIndex()]?.label ?? props.options[0]?.label ?? '';

  const updatePanelRect = () => {
    const el = btnRef;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const maxH = Math.min(280, Math.max(120, spaceBelow));
    setPanelRect({top: r.bottom + 2, left: r.left, width: r.width, maxH});
  };

  createRenderEffect(() => {
    if (!open()) {
      setPanelRect(null);
      return;
    }
    setHighlight(selIndex());
    updatePanelRect();
    const onScroll = () => updatePanelRect();
    const onResize = () => updatePanelRect();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    onCleanup(() => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    });
  });

  createRenderEffect(() => {
    if (!open()) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef?.contains(t) || panelRef?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    onCleanup(() => document.removeEventListener('mousedown', onDoc));
  });

  createRenderEffect(() => {
    if (!open()) {
      return;
    }
    const opts = props.options;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        btnRef?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (opts.length === 0) {
          return;
        }
        setHighlight((h) => Math.min(h + 1, opts.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (opts.length === 0) {
          return;
        }
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (opts.length === 0) {
          return;
        }
        const opt = opts[highlight()];
        if (opt) {
          props.onChange(opt.value);
        }
        setOpen(false);
        btnRef?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  const pick = (v: string) => {
    props.onChange(v);
    setOpen(false);
    btnRef?.focus();
  };

  const toggle = () => {
    if (props.disabled) {
      return;
    }
    setOpen((o) => !o);
  };

  const wrapClass = () =>
    `ds-select${width() === 'auto' ? ' ds-select-auto' : ''}${extraClass() ? ` ${extraClass()}` : ''}`;

  const portalData = createMemo(() => {
    if (!open()) {
      return null;
    }
    return panelRect();
  });

  return (
    <div ref={(el) => (rootRef = el)} class={wrapClass()}>
      <button
        ref={(el) => (btnRef = el)}
        type="button"
        id={props.id}
        class="ds-select-trigger"
        disabled={props.disabled}
        aria-label={props.ariaLabel}
        aria-expanded={open()}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={toggle}
        onKeyDown={(e) => {
          if (props.disabled) {
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!open()) {
              setOpen(true);
            }
          }
        }}
      >
        <span class="ds-select-value">{displayLabel()}</span>
        <ChevronDown size={16} strokeWidth={2} class="ds-select-chevron" aria-hidden />
      </button>
      <Portal mount={document.body}>
        <Show when={portalData()}>
          {(pr) => {
            const r = typeof pr === 'function' ? (pr as () => {top: number; left: number; width: number; maxH: number})() : pr;
            return (
            <div
              ref={(el) => (panelRef = el)}
              id={listboxId}
              role="listbox"
              class="ds-select-panel"
              style={{
                position: 'fixed',
                top: `${r.top}px`,
                left: `${r.left}px`,
                width: `${r.width}px`,
                'max-height': `${r.maxH}px`,
                'z-index': '10000',
              }}
            >
              <For each={props.options}>
                {(opt, i) => (
                  <div
                    role="option"
                    aria-selected={opt.value === props.value}
                    class={`ds-select-option${i() === highlight() ? ' ds-select-option-active' : ''}${opt.value === props.value ? ' ds-select-option-selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(opt.value);
                    }}
                    onMouseEnter={() => setHighlight(i())}
                  >
                    {opt.label}
                  </div>
                )}
              </For>
            </div>
            );
          }}
        </Show>
      </Portal>
    </div>
  );
}
