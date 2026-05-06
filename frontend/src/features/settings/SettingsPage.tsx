import {createSignal, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {ExternalLink, Gamepad2, Globe, MapPin, SlidersHorizontal} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {AlertError, AlertSuccess} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {i18n} from '../../i18n/i18n';
import {resolveLocale} from '../../i18n/resolveLocale';
import {applyFullThemeFromSettings} from '../../theme/applyFullTheme';
import {resolveTheme} from '../../theme/resolveTheme';
import {DsSelect} from '@/components/ui/select';
import {PageHeader} from '../../shared/PageHeader';

export default function SettingsPage() {
  const [t] = useTranslation();
  const [s, setS] = createSignal<domain.Settings | null>(null);
  const [msg, setMsg] = createSignal('');
  const [okMsg, setOkMsg] = createSignal('');
  const [keyTest, setKeyTest] = createSignal('');

  onMount(() => {
    App.LoadSettings()
      .then((st) => {
        setS(st);
        void applyFullThemeFromSettings(st.uiTheme, st.uiExternalThemePath);
      })
      .catch((e: unknown) => setMsg(String(e)));
  });

  const bind =
    (field: keyof domain.Settings) =>
    (e: Event & {currentTarget: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement}) => {
      const cur = s();
      if (!cur) {
        return;
      }
      const el = e.currentTarget;
      const v = el.type === 'checkbox' ? (el as HTMLInputElement).checked : el.value;
      setS(domain.Settings.createFrom({...cur, [field]: v}));
    };

  const applyLocale = (localeRaw: string) => {
    const cur = s();
    if (!cur) {
      return;
    }
    const locale = localeRaw === 'auto' ? '' : localeRaw;
    setS(domain.Settings.createFrom({...cur, locale}));
    void i18n.changeLanguage(resolveLocale(locale, navigator.language));
  };

  const applyTheme = (themeRaw: string) => {
    const cur = s();
    if (!cur) {
      return;
    }
    const theme = resolveTheme(themeRaw);
    setS(domain.Settings.createFrom({...cur, uiTheme: theme}));
    void applyFullThemeFromSettings(theme, cur.uiExternalThemePath);
  };

  const applyExternalPath = (path: string) => {
    const cur = s();
    if (!cur) {
      return;
    }
    setS(domain.Settings.createFrom({...cur, uiExternalThemePath: path}));
    void applyFullThemeFromSettings(cur.uiTheme, path);
  };

  const save = () => {
    const cur = s();
    if (!cur) {
      return;
    }
    App.SaveSettings(cur)
      .then(() => {
        void i18n.changeLanguage(resolveLocale(cur.locale || '', navigator.language));
        void applyFullThemeFromSettings(cur.uiTheme, cur.uiExternalThemePath);
        setOkMsg(t('settings.saved'));
        setMsg('');
      })
      .catch((e: unknown) => {
        setMsg(String(e));
        setOkMsg('');
      });
  };

  const testKey = () => {
    const cur = s();
    if (!cur) {
      return;
    }
    App.ValidateSteamAPIKey(keyTest() || cur.steamWebApiKey).then((r: domain.SteamKeyValidation) => {
      if (r.ok) {
        setOkMsg(t('settings.keyValid'));
        setMsg('');
      } else {
        setMsg(r.message || t('settings.invalid'));
        setOkMsg('');
      }
    });
  };

  return (
    <>
      <Show when={!s()}>
        <p class="text-muted-foreground">{t('common.loading')}</p>
      </Show>
      <Show when={s()}>
        <div>
          <PageHeader icon={SlidersHorizontal} title={t('settings.title')} description={t('settings.subtitle')} />
          <Show when={!!msg()}>
            <AlertError>{msg()}</AlertError>
          </Show>
          <Show when={!!okMsg()}>
            <AlertSuccess>{okMsg()}</AlertSuccess>
          </Show>

          <Card aria-labelledby="settings-section-app">
            <CardTitle id="settings-section-app">
              <Globe size={16} strokeWidth={1.75} aria-hidden />
              {t('settings.sectionApp')}
            </CardTitle>
            <div class="mb-2">
              <Label for="settings-locale">{t('settings.language')}</Label>
              <DsSelect
                id="settings-locale"
                value={s()!.locale || 'auto'}
                options={[
                  {value: 'auto', label: t('settings.langAuto')},
                  {value: 'en', label: t('settings.langEn')},
                  {value: 'pt-BR', label: t('settings.langPtBR')},
                  {value: 'es', label: t('settings.langEs')},
                ]}
                onChange={applyLocale}
              />
            </div>
            <div class="mb-2">
              <Label for="settings-ui-theme">{t('settings.theme')}</Label>
              <DsSelect
                id="settings-ui-theme"
                value={resolveTheme(s()!.uiTheme)}
                options={[
                  {value: 'flat-dark-theme', label: t('settings.themeFlatDark')},
                  {value: 'flat-light-theme', label: t('settings.themeFlatLight')},
                ]}
                onChange={applyTheme}
              />
            </div>
            <div class="mb-2">
              <Label for="settings-external-theme">{t('settings.externalThemePath')}</Label>
              <Input
                id="settings-external-theme"
                value={s()!.uiExternalThemePath || ''}
                placeholder={t('settings.externalThemePlaceholder')}
                onInput={(e) => applyExternalPath(e.currentTarget.value)}
                autocomplete="off"
              />
            </div>
            <div class="mb-0">
              <Label for="settings-player">{t('settings.playerName')}</Label>
              <Input id="settings-player" value={s()!.playerName} onInput={bind('playerName')} autocomplete="username" />
            </div>
          </Card>

          <Card aria-labelledby="settings-section-steam">
            <CardTitle id="settings-section-steam">
              <Gamepad2 size={16} strokeWidth={1.75} aria-hidden />
              {t('settings.sectionSteam')}
            </CardTitle>
            <div class="mb-2">
              <div class="mb-1 flex flex-wrap items-center gap-1">
                <Label for="settings-steam-key" class="mb-0">
                  {t('settings.steamApiKey')}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="size-7 min-h-7 shrink-0 text-blue-600 hover:bg-blue-500/15 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-400/10 dark:hover:text-blue-300"
                  aria-label={t('settings.steamApiKeyLinkTitle')}
                  title={t('settings.steamApiKeyLinkTitle')}
                  onClick={() => void App.OpenExternalURL('https://steamcommunity.com/dev/apikey')}
                >
                  <ExternalLink size={14} strokeWidth={2} aria-hidden />
                </Button>
              </div>
              <Input id="settings-steam-key" type="password" value={s()!.steamWebApiKey} onInput={bind('steamWebApiKey')} autocomplete="off" />
            </div>
            <div class="mb-2">
              <Label for="settings-key-test">{t('settings.testKey')}</Label>
              <Input
                id="settings-key-test"
                value={keyTest()}
                onInput={(e) => setKeyTest(e.currentTarget.value)}
                placeholder={t('settings.testKeyPlaceholder')}
                autocomplete="off"
              />
            </div>
            <div class="mb-2 flex flex-wrap gap-1">
              <Button variant="secondary" onClick={testKey}>
                {t('settings.validateKey')}
              </Button>
            </div>
            <div class="mb-2">
              <Label for="settings-bm">{t('settings.bmToken')}</Label>
              <Input id="settings-bm" type="password" value={s()!.battlemetricsToken} onInput={bind('battlemetricsToken')} autocomplete="off" />
            </div>
            <div class="mb-2">
              <Label for="settings-steam-cmd">{t('settings.steamCmd')}</Label>
              <Input
                id="settings-steam-cmd"
                value={s()!.steamLaunchCommand}
                onInput={bind('steamLaunchCommand')}
                placeholder={t('settings.steamCmdPlaceholder')}
              />
            </div>
            <div class="mb-2">
              <Label for="settings-steam-root">{t('settings.steamRoot')}</Label>
              <Input
                id="settings-steam-root"
                value={s()!.steamRootPath}
                onInput={bind('steamRootPath')}
                placeholder={t('settings.steamRootPlaceholder')}
              />
            </div>
            <div class="mb-2">
              <Label for="settings-dayz-install">{t('settings.dayZInstallPath')}</Label>
              <Input
                id="settings-dayz-install"
                value={s()!.dayZInstallPath || ''}
                onInput={bind('dayZInstallPath')}
                placeholder={t('settings.dayZInstallPathPlaceholder')}
              />
            </div>
            <div class="mb-0">
              <Label for="settings-dayz-branch">{t('settings.dayzBranch')}</Label>
              <DsSelect
                id="settings-dayz-branch"
                value={s()!.dayZBranch}
                options={[
                  {value: 'stable', label: t('settings.stable')},
                  {value: 'experimental', label: t('settings.experimental')},
                ]}
                onChange={(v) => {
                  const c = s();
                  if (c) {
                    setS(domain.Settings.createFrom({...c, dayZBranch: v}));
                  }
                }}
              />
            </div>
          </Card>

          <Card aria-labelledby="settings-section-network">
            <CardTitle id="settings-section-network">
              <MapPin size={16} strokeWidth={1.75} aria-hidden />
              {t('settings.sectionNetwork')}
            </CardTitle>
            <div class="mb-2">
              <Label for="settings-geo">{t('settings.geoCsv')}</Label>
              <Input id="settings-geo" value={s()!.geoIpDatabasePath} onInput={bind('geoIpDatabasePath')} placeholder={t('settings.geoCsvPlaceholder')} />
            </div>
            <div class="mb-2">
              <Label for="settings-lat">{t('settings.clientLat')}</Label>
              <Input
                id="settings-lat"
                type="number"
                step="any"
                value={s()!.clientLat || ''}
                onInput={(e) => {
                  const c = s();
                  if (c) {
                    setS(domain.Settings.createFrom({...c, clientLat: parseFloat(e.currentTarget.value) || 0}));
                  }
                }}
              />
            </div>
            <div class="mb-2">
              <Label for="settings-lon">{t('settings.clientLon')}</Label>
              <Input
                id="settings-lon"
                type="number"
                step="any"
                value={s()!.clientLon || ''}
                onInput={(e) => {
                  const c = s();
                  if (c) {
                    setS(domain.Settings.createFrom({...c, clientLon: parseFloat(e.currentTarget.value) || 0}));
                  }
                }}
              />
            </div>
            <div class="mb-0">
              <Label for="settings-lan-port">{t('settings.lanQuery')}</Label>
              <Input
                id="settings-lan-port"
                type="number"
                value={s()!.lanQueryPort}
                onInput={(e) => {
                  const c = s();
                  if (c) {
                    setS(domain.Settings.createFrom({...c, lanQueryPort: parseInt(e.currentTarget.value, 10) || 2305}));
                  }
                }}
              />
            </div>
          </Card>

          <div class="mt-4 flex flex-wrap gap-2">
            <Button onClick={save}>{t('settings.save')}</Button>
          </div>
        </div>
      </Show>
    </>
  );
}
