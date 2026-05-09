import {createSignal} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {Eye, EyeOff} from 'lucide-solid';
import {cn} from '@/lib/utils';

export function maskAddress(addr: string): string {
  if (!addr) {
    return '';
  }
  const sensitive = (addr.match(/[^:]/g) || []).length;
  const n = Math.min(5, Math.max(sensitive, 1));
  return '*'.repeat(n);
}

export function ServerAddressCell(props: {address: string}) {
  const [t] = useTranslation();
  const [visible, setVisible] = createSignal(false);
  const masked = () => maskAddress(props.address);
  const showText = () => (visible() ? props.address : masked());

  return (
    <>
      {!props.address ? (
        <span class="text-muted-foreground">—</span>
      ) : (
        <div class="inline-flex max-w-full items-center gap-1.5">
          <button
            type="button"
            class="inline-flex min-h-7 min-w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card/85 p-0.5 text-muted-foreground backdrop-blur-[2px] hover:border-primary hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible()}
            title={visible() ? t('browse.toggleAddrHide') : t('browse.toggleAddrShow')}
          >
            {visible() ? <Eye size={14} strokeWidth={2} aria-hidden /> : <EyeOff size={14} strokeWidth={2} aria-hidden />}
            <span class="sr-only">{visible() ? t('browse.toggleAddrHide') : t('browse.toggleAddrShow')}</span>
          </button>
          <span class="min-w-0 break-all font-[inherit] tabular-nums" translate="no">
            {showText()}
          </span>
        </div>
      )}
    </>
  );
}
