import {useTranslation} from 'react-i18next';
import {CircleHelp, Lock, LockOpen} from 'lucide-react';
import {domain} from '../../wailsjs/go/models';

export function ServerPasswordCell({row}: {row: domain.ServerRow}) {
  const {t} = useTranslation();
  const pr = row.passwordRequired;
  if (pr === undefined || pr === null) {
    return (
      <span className="server-password-cell server-password-unknown" title={t('browse.passwordUnknownTitle')}>
        <CircleHelp size={16} strokeWidth={2} aria-hidden />
        <span className="sr-only">{t('browse.passwordUnknownTitle')}</span>
      </span>
    );
  }
  if (pr) {
    return (
      <span className="server-password-cell server-password-locked" title={t('browse.passwordLockedTitle')}>
        <Lock size={16} strokeWidth={2} aria-hidden />
        <span className="sr-only">{t('browse.passwordLockedTitle')}</span>
      </span>
    );
  }
  return (
    <span className="server-password-cell server-password-open" title={t('browse.passwordOpenTitle')}>
      <LockOpen size={16} strokeWidth={2} aria-hidden />
      <span className="sr-only">{t('browse.passwordOpenTitle')}</span>
    </span>
  );
}
