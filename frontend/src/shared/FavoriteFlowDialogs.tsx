import type {Accessor} from 'solid-js';
import {createEffect, createSignal, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {X} from 'lucide-solid';
import * as App from '../../wailsjs/go/main/App';
import {domain} from '../../wailsjs/go/models';
import {mapQuickFavError} from './favoriteRows';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogOverlay} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

export type FavoriteFlowState =
  | {kind: 'removeFavorite'; row: domain.ServerRow}
  | {kind: 'removeQuick'; row: domain.ServerRow}
  | {kind: 'quickFavLabel'; row: domain.ServerRow};

export type FavoriteFlowDialogsProps = {
  state: Accessor<FavoriteFlowState | null>;
  onClose: () => void;
  onAfterMutation: () => void;
  onErr: (msg: string) => void;
  dialogIdPrefix: string;
};

const compactDialogClass =
  'fixed left-1/2 top-1/2 z-[1001] box-border flex max-h-[min(80vh,24rem)] w-[min(100%,22rem)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-border bg-card p-0 text-card-foreground shadow-ds outline-none data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95';

export function FavoriteFlowDialogs(props: FavoriteFlowDialogsProps) {
  const [t] = useTranslation();
  const [busy, setBusy] = createSignal(false);
  const [labelDraft, setLabelDraft] = createSignal('');

  createEffect(() => {
    const st = props.state();
    if (st?.kind === 'quickFavLabel') {
      setLabelDraft(st.row.name || '');
    }
  });

  const close = () => {
    if (busy()) {
      return;
    }
    props.onClose();
  };

  const run = (fn: () => Promise<void>) => {
    setBusy(true);
    void fn()
      .then(() => {
        props.onAfterMutation();
        props.onClose();
      })
      .catch((e: unknown) => props.onErr(String(e)))
      .finally(() => setBusy(false));
  };

  const st = () => props.state();
  const open = () => st() != null;
  const row = () => st()?.row ?? null;

  const titleId = () => `${props.dialogIdPrefix}-fav-flow-title`;

  const onConfirmRemoveFavorite = () => {
    const r = row();
    if (!r) {
      return;
    }
    run(() => App.RemoveFavorite(r.queryHost, r.gamePort, r.queryPort));
  };

  const onConfirmRemoveQuick = () => {
    const r = row();
    if (!r) {
      return;
    }
    run(() => App.RemoveQuickFavoriteRow(r));
  };

  const onSaveQuickLabel = () => {
    const r = row();
    if (!r || st()?.kind !== 'quickFavLabel') {
      return;
    }
    const name = labelDraft().trim() || r.name || '';
    setBusy(true);
    void App.SetQuickFavorite(r, name)
      .then(() => {
        props.onAfterMutation();
        props.onClose();
      })
      .catch((e: unknown) => props.onErr(mapQuickFavError(String(e), t)))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      open={open()}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
      modal
      id={`${props.dialogIdPrefix}-fav-flow-dialog`}
    >
      <Dialog.Portal>
        <DialogOverlay />
        <DialogContent
          class={compactDialogClass}
          aria-labelledby={titleId()}
          onOpenAutoFocus={(e) => {
            const kind = st()?.kind;
            if (kind === 'quickFavLabel') {
              e.preventDefault();
              const root = e.currentTarget as HTMLElement | null;
              window.setTimeout(() => {
                root?.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
              }, 0);
            }
          }}
        >
          <div class="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2">
            <Dialog.Title id={titleId()} class="m-0 pr-2 text-base font-semibold leading-snug">
              {st()?.kind === 'removeFavorite'
                ? t('browse.confirmRemoveFavoriteTitle')
                : st()?.kind === 'removeQuick'
                  ? t('browse.confirmRemoveQuickTitle')
                  : st()?.kind === 'quickFavLabel'
                    ? t('browse.quickFavModalTitle')
                    : ''}
            </Dialog.Title>
            <Button variant="ghost" size="icon" class="shrink-0" title={t('joinModal.close')} disabled={busy()} onClick={close}>
              <X size={18} strokeWidth={2} aria-hidden />
              <span class="sr-only">{t('joinModal.close')}</span>
            </Button>
          </div>

          <div class="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3">
            <Show when={st()?.kind === 'removeFavorite'}>
              <p class="m-0 text-sm text-muted-foreground">{t('browse.confirmRemoveFavoriteBody', {name: row()?.name || row()?.address || '—'})}</p>
            </Show>
            <Show when={st()?.kind === 'removeQuick'}>
              <p class="m-0 text-sm text-muted-foreground">{t('browse.confirmRemoveQuickBody', {name: row()?.name || row()?.address || '—'})}</p>
            </Show>
            <Show when={st()?.kind === 'quickFavLabel'}>
              <p class="m-0 text-sm text-muted-foreground">{t('browse.quickFavModalDescription')}</p>
              <div class="space-y-1.5">
                <Label for={`${props.dialogIdPrefix}-quick-fav-label`}>{t('browse.quickFavModalLabel')}</Label>
                <Input
                  id={`${props.dialogIdPrefix}-quick-fav-label`}
                  type="text"
                  value={labelDraft()}
                  onInput={(e) => setLabelDraft(e.currentTarget.value)}
                  disabled={busy()}
                  autocomplete="off"
                  class="max-w-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !busy()) {
                      e.preventDefault();
                      onSaveQuickLabel();
                    }
                  }}
                />
              </div>
            </Show>
          </div>

          <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-3 py-2">
            <Button variant="secondary" disabled={busy()} onClick={close}>
              {t('common.cancel')}
            </Button>
            <Show when={st()?.kind === 'removeFavorite'}>
              <Button variant="destructive" disabled={busy()} onClick={onConfirmRemoveFavorite}>
                {t('common.remove')}
              </Button>
            </Show>
            <Show when={st()?.kind === 'removeQuick'}>
              <Button variant="destructive" disabled={busy()} onClick={onConfirmRemoveQuick}>
                {t('common.remove')}
              </Button>
            </Show>
            <Show when={st()?.kind === 'quickFavLabel'}>
              <Button disabled={busy()} onClick={onSaveQuickLabel}>
                {t('common.save')}
              </Button>
            </Show>
          </div>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  );
}
