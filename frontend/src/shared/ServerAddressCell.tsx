import {createSignal} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {Eye, EyeOff} from 'lucide-solid';

function maskAddress(addr: string): string {
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
        <span class="server-address-empty">—</span>
      ) : (
        <div class="server-address-cell">
          <button
            type="button"
            class="server-address-toggle"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible()}
            title={visible() ? t('browse.toggleAddrHide') : t('browse.toggleAddrShow')}
          >
            {visible() ? <Eye size={14} strokeWidth={2} aria-hidden /> : <EyeOff size={14} strokeWidth={2} aria-hidden />}
            <span class="sr-only">{visible() ? t('browse.toggleAddrHide') : t('browse.toggleAddrShow')}</span>
          </button>
          <span class="server-address-text" translate="no">
            {showText()}
          </span>
        </div>
      )}
    </>
  );
}
