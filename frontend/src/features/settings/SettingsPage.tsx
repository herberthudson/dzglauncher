import {createSignal, onMount, Show} from 'solid-js';
import {useTranslation} from 'solid-i18next';
import {Gamepad2, Globe, MapPin, SlidersHorizontal} from 'lucide-solid';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {i18n} from '../../i18n/i18n';
import {resolveLocale} from '../../i18n/resolveLocale';
import {applyThemeToDocument, resolveTheme} from '../../theme/resolveTheme';
import {DsSelect} from '../../shared/DsSelect';
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
        applyThemeToDocument(st.uiTheme);
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
    applyThemeToDocument(theme);
  };

  const save = () => {
    const cur = s();
    if (!cur) {
      return;
    }
    App.SaveSettings(cur)
      .then(() => {
        void i18n.changeLanguage(resolveLocale(cur.locale || '', navigator.language));
        applyThemeToDocument(cur.uiTheme);
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
        <p>{t('common.loading')}</p>
      </Show>
      <Show when={s()}>
        <div>
          <PageHeader icon={SlidersHorizontal} title={t('settings.title')} description={t('settings.subtitle')} />
          <Show when={!!msg()}>
            <div class="msg msg-error">{msg()}</div>
          </Show>
          <Show when={!!okMsg()}>
            <div class="msg msg-success">{okMsg()}</div>
          </Show>

          <section class="ds-card" aria-labelledby="settings-section-app">
            <h2 id="settings-section-app" class="ds-section-title">
              <Globe size={16} strokeWidth={1.75} aria-hidden />
              {t('settings.sectionApp')}
            </h2>
            <div class="field">
              <label for="settings-locale">{t('settings.language')}</label>
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
            <div class="field">
              <label for="settings-ui-theme">{t('settings.theme')}</label>
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
            <div class="field">
              <label for="settings-player">{t('settings.playerName')}</label>
              <input id="settings-player" value={s()!.playerName} onInput={bind('playerName')} autocomplete="username" />
            </div>
          </section>

          <section class="ds-card" aria-labelledby="settings-section-steam">
            <h2 id="settings-section-steam" class="ds-section-title">
              <Gamepad2 size={16} strokeWidth={1.75} aria-hidden />
              {t('settings.sectionSteam')}
            </h2>
            <div class="field">
              <label for="settings-steam-key">{t('settings.steamApiKey')}</label>
              <input id="settings-steam-key" type="password" value={s()!.steamWebApiKey} onInput={bind('steamWebApiKey')} autocomplete="off" />
            </div>
            <div class="field">
              <label for="settings-key-test">{t('settings.testKey')}</label>
              <input
                id="settings-key-test"
                value={keyTest()}
                onInput={(e) => setKeyTest(e.currentTarget.value)}
                placeholder={t('settings.testKeyPlaceholder')}
                autocomplete="off"
              />
            </div>
            <div class="toolbar toolbar-tight">
              <button type="button" class="btn btn-secondary" onClick={testKey}>
                {t('settings.validateKey')}
              </button>
            </div>
            <div class="field">
              <label for="settings-bm">{t('settings.bmToken')}</label>
              <input id="settings-bm" type="password" value={s()!.battlemetricsToken} onInput={bind('battlemetricsToken')} autocomplete="off" />
            </div>
            <div class="field">
              <label for="settings-steam-cmd">{t('settings.steamCmd')}</label>
              <input id="settings-steam-cmd" value={s()!.steamLaunchCommand} onInput={bind('steamLaunchCommand')} placeholder={t('settings.steamCmdPlaceholder')} />
            </div>
            <div class="field">
              <label for="settings-steam-root">{t('settings.steamRoot')}</label>
              <input id="settings-steam-root" value={s()!.steamRootPath} onInput={bind('steamRootPath')} placeholder={t('settings.steamRootPlaceholder')} />
            </div>
            <div class="field">
              <label for="settings-dayz-install">{t('settings.dayZInstallPath')}</label>
              <input
                id="settings-dayz-install"
                value={s()!.dayZInstallPath || ''}
                onInput={bind('dayZInstallPath')}
                placeholder={t('settings.dayZInstallPathPlaceholder')}
              />
            </div>
            <div class="field">
              <label for="settings-dayz-branch">{t('settings.dayzBranch')}</label>
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
          </section>

          <section class="ds-card" aria-labelledby="settings-section-network">
            <h2 id="settings-section-network" class="ds-section-title">
              <MapPin size={16} strokeWidth={1.75} aria-hidden />
              {t('settings.sectionNetwork')}
            </h2>
            <div class="field">
              <label for="settings-geo">{t('settings.geoCsv')}</label>
              <input id="settings-geo" value={s()!.geoIpDatabasePath} onInput={bind('geoIpDatabasePath')} placeholder={t('settings.geoCsvPlaceholder')} />
            </div>
            <div class="field">
              <label for="settings-lat">{t('settings.clientLat')}</label>
              <input
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
            <div class="field">
              <label for="settings-lon">{t('settings.clientLon')}</label>
              <input
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
            <div class="field">
              <label for="settings-lan-port">{t('settings.lanQuery')}</label>
              <input
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
          </section>

          <div class="toolbar" style={{'margin-top': 'var(--ds-space-lg)'}}>
            <button type="button" class="btn" onClick={save}>
              {t('settings.save')}
            </button>
          </div>
        </div>
      </Show>
    </>
  );
}
