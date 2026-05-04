import {useTranslation} from 'solid-i18next';
import {CircleHelp, Lock, LockOpen} from 'lucide-solid';
import {cn} from '@/lib/utils';
import {domain} from '../../wailsjs/go/models';

export function ServerPasswordCell(props: {row: domain.ServerRow}) {
  const [t] = useTranslation();
  const pr = () => props.row.passwordRequired;
  const base = 'inline-flex items-center justify-center text-muted-foreground align-middle';
  return (
    <>
      {pr() === undefined || pr() === null ? (
        <span class={cn(base, 'cursor-default opacity-60')} title={t('browse.passwordUnknownTitle')}>
          <CircleHelp size={16} strokeWidth={2} aria-hidden />
          <span class="sr-only">{t('browse.passwordUnknownTitle')}</span>
        </span>
      ) : pr() ? (
        <span class={cn(base, 'cursor-default text-destructive hover:brightness-110')} title={t('browse.passwordLockedTitle')}>
          <Lock size={16} strokeWidth={2} aria-hidden />
          <span class="sr-only">{t('browse.passwordLockedTitle')}</span>
        </span>
      ) : (
        <span class={cn(base, 'cursor-default opacity-90')} title={t('browse.passwordOpenTitle')}>
          <LockOpen size={16} strokeWidth={2} aria-hidden />
          <span class="sr-only">{t('browse.passwordOpenTitle')}</span>
        </span>
      )}
    </>
  );
}
