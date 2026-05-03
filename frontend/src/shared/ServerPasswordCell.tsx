import {useTranslation} from 'solid-i18next';
import {CircleHelp, Lock, LockOpen} from 'lucide-solid';
import {domain} from '../../wailsjs/go/models';

export function ServerPasswordCell(props: {row: domain.ServerRow}) {
  const [t] = useTranslation();
  const pr = () => props.row.passwordRequired;
  return (
    <>
      {pr() === undefined || pr() === null ? (
        <span class="server-password-cell server-password-unknown" title={t('browse.passwordUnknownTitle')}>
          <CircleHelp size={16} strokeWidth={2} aria-hidden />
          <span class="sr-only">{t('browse.passwordUnknownTitle')}</span>
        </span>
      ) : pr() ? (
        <span class="server-password-cell server-password-locked" title={t('browse.passwordLockedTitle')}>
          <Lock size={16} strokeWidth={2} aria-hidden />
          <span class="sr-only">{t('browse.passwordLockedTitle')}</span>
        </span>
      ) : (
        <span class="server-password-cell server-password-open" title={t('browse.passwordOpenTitle')}>
          <LockOpen size={16} strokeWidth={2} aria-hidden />
          <span class="sr-only">{t('browse.passwordOpenTitle')}</span>
        </span>
      )}
    </>
  );
}
