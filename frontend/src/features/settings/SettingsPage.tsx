import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Gamepad2, Globe, MapPin, SlidersHorizontal, ToggleLeft} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {i18n} from '../../i18n/i18n';
import {resolveLocale} from '../../i18n/resolveLocale';
import {applyThemeToDocument, resolveTheme} from '../../theme/resolveTheme';
import {DsSelect} from '../../shared/DsSelect';
import {PageHeader} from '../../shared/PageHeader';

export function SettingsPage() {
  const {t} = useTranslation();
  const [s, setS] = useState<domain.Settings | null>(null);
  const [msg, setMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [keyTest, setKeyTest] = useState('');

  useEffect(() => {
    App.LoadSettings()
      .then((st) => {
        setS(st);
        applyThemeToDocument(st.uiTheme);
      })
      .catch((e: unknown) => setMsg(String(e)));
  }, []);

  if (!s) {
    return <p>{t('common.loading')}</p>;
  }

  const bind =
    (field: keyof domain.Settings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setS(domain.Settings.createFrom({...s, [field]: v}));
    };

  const applyLocale = (localeRaw: string) => {
    const locale = localeRaw === 'auto' ? '' : localeRaw;
    setS(domain.Settings.createFrom({...s, locale}));
    void i18n.changeLanguage(resolveLocale(locale, navigator.language));
  };

  const applyTheme = (themeRaw: string) => {
    const theme = resolveTheme(themeRaw);
    setS(domain.Settings.createFrom({...s, uiTheme: theme}));
    applyThemeToDocument(theme);
  };

  const save = () =>
    App.SaveSettings(s)
      .then(() => {
        void i18n.changeLanguage(resolveLocale(s.locale || '', navigator.language));
        applyThemeToDocument(s.uiTheme);
        setOkMsg(t('settings.saved'));
        setMsg('');
      })
      .catch((e: unknown) => {
        setMsg(String(e));
        setOkMsg('');
      });

  const testKey = () =>
    App.ValidateSteamAPIKey(keyTest || s.steamWebApiKey).then((r: domain.SteamKeyValidation) => {
      if (r.ok) {
        setOkMsg(t('settings.keyValid'));
        setMsg('');
      } else {
        setMsg(r.message || t('settings.invalid'));
        setOkMsg('');
      }
    });

  return (
    <div>
      <PageHeader icon={SlidersHorizontal} title={t('settings.title')} description={t('settings.subtitle')} />
      {msg ? <div className="msg msg-error">{msg}</div> : null}
      {okMsg ? <div className="msg msg-success">{okMsg}</div> : null}

      <section className="ds-card" aria-labelledby="settings-section-app">
        <h2 id="settings-section-app" className="ds-section-title">
          <Globe size={16} strokeWidth={1.75} aria-hidden />
          {t('settings.sectionApp')}
        </h2>
        <div className="field">
          <label htmlFor="settings-locale">{t('settings.language')}</label>
          <DsSelect
            id="settings-locale"
            value={s.locale || 'auto'}
            options={[
              {value: 'auto', label: t('settings.langAuto')},
              {value: 'en', label: t('settings.langEn')},
              {value: 'pt-BR', label: t('settings.langPtBR')},
              {value: 'es', label: t('settings.langEs')},
            ]}
            onChange={applyLocale}
          />
        </div>
        <div className="field">
          <label htmlFor="settings-ui-theme">{t('settings.theme')}</label>
          <DsSelect
            id="settings-ui-theme"
            value={resolveTheme(s.uiTheme)}
            options={[
              {value: 'flat-dark-theme', label: t('settings.themeFlatDark')},
              {value: 'flat-light-theme', label: t('settings.themeFlatLight')},
            ]}
            onChange={applyTheme}
          />
        </div>
        <div className="field">
          <label htmlFor="settings-player">{t('settings.playerName')}</label>
          <input id="settings-player" value={s.playerName} onChange={bind('playerName')} autoComplete="username" />
        </div>
      </section>

      <section className="ds-card" aria-labelledby="settings-section-steam">
        <h2 id="settings-section-steam" className="ds-section-title">
          <Gamepad2 size={16} strokeWidth={1.75} aria-hidden />
          {t('settings.sectionSteam')}
        </h2>
        <div className="field">
          <label htmlFor="settings-steam-key">{t('settings.steamApiKey')}</label>
          <input id="settings-steam-key" type="password" value={s.steamWebApiKey} onChange={bind('steamWebApiKey')} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="settings-key-test">{t('settings.testKey')}</label>
          <input id="settings-key-test" value={keyTest} onChange={(e) => setKeyTest(e.target.value)} placeholder={t('settings.testKeyPlaceholder')} autoComplete="off" />
        </div>
        <div className="toolbar toolbar-tight">
          <button type="button" className="btn btn-secondary" onClick={testKey}>
            {t('settings.validateKey')}
          </button>
        </div>
        <div className="field">
          <label htmlFor="settings-bm">{t('settings.bmToken')}</label>
          <input id="settings-bm" type="password" value={s.battlemetricsToken} onChange={bind('battlemetricsToken')} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="settings-steam-cmd">{t('settings.steamCmd')}</label>
          <input id="settings-steam-cmd" value={s.steamLaunchCommand} onChange={bind('steamLaunchCommand')} placeholder={t('settings.steamCmdPlaceholder')} />
        </div>
        <div className="field">
          <label htmlFor="settings-steam-root">{t('settings.steamRoot')}</label>
          <input id="settings-steam-root" value={s.steamRootPath} onChange={bind('steamRootPath')} placeholder={t('settings.steamRootPlaceholder')} />
        </div>
        <div className="field">
          <label htmlFor="settings-dayz-branch">{t('settings.dayzBranch')}</label>
          <DsSelect
            id="settings-dayz-branch"
            value={s.dayZBranch}
            options={[
              {value: 'stable', label: t('settings.stable')},
              {value: 'experimental', label: t('settings.experimental')},
            ]}
            onChange={(v) => setS(domain.Settings.createFrom({...s, dayZBranch: v}))}
          />
        </div>
      </section>

      <section className="ds-card" aria-labelledby="settings-section-network">
        <h2 id="settings-section-network" className="ds-section-title">
          <MapPin size={16} strokeWidth={1.75} aria-hidden />
          {t('settings.sectionNetwork')}
        </h2>
        <div className="field">
          <label htmlFor="settings-geo">{t('settings.geoCsv')}</label>
          <input id="settings-geo" value={s.geoIpDatabasePath} onChange={bind('geoIpDatabasePath')} placeholder={t('settings.geoCsvPlaceholder')} />
        </div>
        <div className="field">
          <label htmlFor="settings-lat">{t('settings.clientLat')}</label>
          <input id="settings-lat" type="number" step="any" value={s.clientLat || ''} onChange={(e) => setS(domain.Settings.createFrom({...s, clientLat: parseFloat(e.target.value) || 0}))} />
        </div>
        <div className="field">
          <label htmlFor="settings-lon">{t('settings.clientLon')}</label>
          <input id="settings-lon" type="number" step="any" value={s.clientLon || ''} onChange={(e) => setS(domain.Settings.createFrom({...s, clientLon: parseFloat(e.target.value) || 0}))} />
        </div>
        <div className="field">
          <label htmlFor="settings-lan-port">{t('settings.lanQuery')}</label>
          <input id="settings-lan-port" type="number" value={s.lanQueryPort} onChange={(e) => setS(domain.Settings.createFrom({...s, lanQueryPort: parseInt(e.target.value, 10) || 2305}))} />
        </div>
      </section>

      <section className="ds-card" aria-labelledby="settings-section-options">
        <h2 id="settings-section-options" className="ds-section-title">
          <ToggleLeft size={16} strokeWidth={1.75} aria-hidden />
          {t('settings.sectionOptions')}
        </h2>
        <div className="checkbox-stack">
          <label className="checkbox-row">
            <input type="checkbox" checked={s.fullscreen} onChange={bind('fullscreen')} />
            <span>{t('settings.fullscreen')}</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={s.debug} onChange={bind('debug')} />
            <span>{t('settings.debug')}</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={s.modInstallAuto} onChange={bind('modInstallAuto')} />
            <span>{t('settings.modInstallAuto')}</span>
          </label>
        </div>
        <div className="toolbar" style={{marginTop: 'var(--ds-space-lg)'}}>
          <button type="button" className="btn" onClick={save}>
            {t('settings.save')}
          </button>
        </div>
      </section>
    </div>
  );
}
