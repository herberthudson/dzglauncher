import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Eye, EyeOff} from 'lucide-react';

function maskAddress(addr: string): string {
  if (!addr) {
    return '';
  }
  return addr.replace(/[^:]/g, '*');
}

export function ServerAddressCell({address}: {address: string}) {
  const {t} = useTranslation();
  const [visible, setVisible] = useState(false);
  const masked = maskAddress(address);
  const showText = visible ? address : masked;

  if (!address) {
    return <span className="server-address-empty">—</span>;
  }

  return (
    <div className="server-address-cell">
      <button
        type="button"
        className="server-address-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        title={visible ? t('browse.toggleAddrHide') : t('browse.toggleAddrShow')}
      >
        {visible ? <Eye size={14} strokeWidth={2} aria-hidden /> : <EyeOff size={14} strokeWidth={2} aria-hidden />}
        <span className="sr-only">{visible ? t('browse.toggleAddrHide') : t('browse.toggleAddrShow')}</span>
      </button>
      <span className="server-address-text" translate="no">
        {showText}
      </span>
    </div>
  );
}
