import {createSignal, onCleanup, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {ExternalLink, X} from 'lucide-solid';
import * as App from '../../wailsjs/go/main/App';
import {domain} from '../../wailsjs/go/models';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

const AUTO_DISMISS_MS = 30_000;

export function StartupUpdateToast() {
  const [t] = useTranslation();
  const [visible, setVisible] = createSignal(false);
  const [payload, setPayload] = createSignal<domain.UpdateCheckResult | null>(null);
  const hideRef: {fn?: () => void} = {};

  onMount(() => {
    let timer: number | undefined;
    const cancelAuto = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };
    const hide = () => {
      cancelAuto();
      setVisible(false);
    };
    hideRef.fn = hide;

    App.CheckForUpdate()
      .then((raw) => {
        const r = domain.UpdateCheckResult.createFrom(raw);
        if (!r.updateAvailable) {
          return;
        }
        setPayload(r);
        setVisible(true);
        timer = window.setTimeout(hide, AUTO_DISMISS_MS);
      })
      .catch(() => {});

    onCleanup(() => {
      cancelAuto();
      delete hideRef.fn;
    });
  });

  const openRelease = () => {
    const p = payload();
    if (p?.releasePageURL) {
      void App.OpenExternalURL(p.releasePageURL);
    }
  };

  return (
    <Show when={visible() && payload()}>
      <div
        class={cn(
          'pointer-events-auto fixed bottom-3 left-3 right-3 z-[200] flex max-w-md flex-col gap-3 rounded-md border border-border bg-card/95 p-3 shadow-ds backdrop-blur-[4px] sm:left-auto sm:right-4',
        )}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1 pt-0.5">
            <p class="m-0 text-sm font-semibold leading-snug text-foreground">{t('updateToast.title')}</p>
            <p class="mt-1.5 m-0 text-sm leading-snug text-muted-foreground">
              {t('updateToast.body', {current: payload()!.currentVersion, latest: payload()!.latestVersion})}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="min-h-9 min-w-9 shrink-0"
            onClick={() => hideRef.fn?.()}
            aria-label={t('updateToast.dismissAria')}
          >
            <X size={18} strokeWidth={1.75} aria-hidden />
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" class="inline-flex min-h-9 items-center gap-2" onClick={openRelease}>
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden />
            {t('updateToast.openRelease')}
          </Button>
          <Button type="button" variant="ghost" class="min-h-9 px-3" onClick={() => hideRef.fn?.()}>
            {t('updateToast.dismiss')}
          </Button>
        </div>
      </div>
    </Show>
  );
}
