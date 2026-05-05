import {createSignal, For, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {ExternalLink, Info} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {AlertError} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
import {PageHeader} from '../../shared/PageHeader';

const techKeys = [
  'about.techGo',
  'about.techWails',
  'about.techSolid',
  'about.techTs',
  'about.techVite',
  'about.techTailwind',
  'about.techI18n',
] as const;

export default function AboutPage() {
  const [t] = useTranslation();
  const [info, setInfo] = createSignal<domain.AboutInfo | null>(null);
  const [fail, setFail] = createSignal(false);

  onMount(() => {
    App.AboutInfo()
      .then((x) => {
        setFail(false);
        setInfo(domain.AboutInfo.createFrom(x));
      })
      .catch(() => {
        setFail(true);
        setInfo(null);
      });
  });

  const openRepo = () => {
    const i = info();
    if (i?.repositoryURL) {
      void App.OpenExternalURL(i.repositoryURL);
    }
  };

  const openLicense = () => {
    const i = info();
    if (i?.licenseURL) {
      void App.OpenExternalURL(i.licenseURL);
    }
  };

  return (
    <>
      <Show when={!info() && !fail()}>
        <p class="text-muted-foreground">{t('common.loading')}</p>
      </Show>
      <Show when={fail()}>
        <AlertError>{t('about.loadError')}</AlertError>
      </Show>
      <Show when={info()}>
        <div>
          <PageHeader icon={Info} title={t('about.title')} description={t('about.subtitle')} />
          <Card aria-labelledby="about-project">
            <CardTitle id="about-project">{t('about.sectionProject')}</CardTitle>
            <dl class="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[8.5rem_1fr] sm:gap-y-2">
              <dt class="text-xs font-medium text-muted-foreground">{t('about.nameLabel')}</dt>
              <dd class="m-0 min-w-0 break-words text-sm">{info()!.appName}</dd>
              <dt class="text-xs font-medium text-muted-foreground">{t('about.versionLabel')}</dt>
              <dd class="m-0 min-w-0 break-words font-mono text-sm">{info()!.version}</dd>
              <dt class="text-xs font-medium text-muted-foreground">{t('about.authorLabel')}</dt>
              <dd class="m-0 min-w-0 break-words text-sm">{info()!.author}</dd>
              <dt class="text-xs font-medium text-muted-foreground">{t('about.licenseLabel')}</dt>
              <dd class="m-0 min-w-0">
                <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span class="break-words text-sm">{info()!.licenseName}</span>
                  <Button type="button" variant="ghost" class="inline-flex w-fit min-h-9 shrink-0 items-center gap-2" onClick={openLicense}>
                    <ExternalLink size={16} strokeWidth={1.75} aria-hidden />
                    {t('about.openLicense')}
                  </Button>
                </div>
                <p class="mb-0 mt-2 text-xs text-muted-foreground">{t('about.licenseHint')}</p>
              </dd>
            </dl>
          </Card>
          <Card aria-labelledby="about-repo">
            <CardTitle id="about-repo">{t('about.sectionRepo')}</CardTitle>
            <p class="mb-3 mt-0 text-sm text-muted-foreground">{t('about.repoHint')}</p>
            <div class="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" class="inline-flex min-h-9 items-center gap-2" onClick={openRepo}>
                <ExternalLink size={16} strokeWidth={1.75} aria-hidden />
                {t('about.openRepo')}
              </Button>
              <span class="min-w-0 break-all text-xs text-muted-foreground">{info()!.repositoryURL}</span>
            </div>
          </Card>
          <Card aria-labelledby="about-tech">
            <CardTitle id="about-tech">{t('about.sectionTech')}</CardTitle>
            <p class="mb-2 mt-0 text-sm text-muted-foreground">{t('about.techIntro')}</p>
            <ul class="m-0 list-none space-y-2 p-0">
              <For each={[...techKeys]}>
                {(key) => (
                  <li class="relative pl-5 text-sm leading-snug text-foreground before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-primary">
                    {t(key)}
                  </li>
                )}
              </For>
            </ul>
          </Card>
        </div>
      </Show>
    </>
  );
}
