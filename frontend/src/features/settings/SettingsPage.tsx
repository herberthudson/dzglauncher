import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {i18n} from '../../i18n/i18n';
import {resolveLocale} from '../../i18n/resolveLocale';

export function SettingsPage() {
  const {t} = useTranslation();
  const [s, setS] = useState<domain.Settings | null>(null);
  const [msg, setMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [keyTest, setKeyTest] = useState('');

  useEffect(() => {
    App.LoadSettings()
      .then(setS)
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

  const save = () =>
    App.SaveSettings(s)
      .then(() => {
        void i18n.changeLanguage(resolveLocale(s.locale || '', navigator.language));
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
      <h1 style={{marginTop: 0}}>{t('settings.title')}</h1>
      {msg ? <div className="msg msg-error">{msg}</div> : null}
      {okMsg ? <div className="msg">{okMsg}</div> : null}
      <div className="field">
        <label>{t('settings.language')}</label>
        <select value={s.locale || 'auto'} onChange={(e) => applyLocale(e.target.value)}>
          <option value="auto">{t('settings.langAuto')}</option>
          <option value="en">{t('settings.langEn')}</option>
          <option value="pt-BR">{t('settings.langPtBR')}</option>
          <option value="es">{t('settings.langEs')}</option>
        </select>
      </div>
      <div className="field">
        <label>{t('settings.playerName')}</label>
        <input value={s.playerName} onChange={bind('playerName')} />
      </div>
      <div className="field">
        <label>{t('settings.steamApiKey')}</label>
        <input type="password" value={s.steamWebApiKey} onChange={bind('steamWebApiKey')} autoComplete="off" />
      </div>
      <div className="field">
        <label>{t('settings.testKey')}</label>
        <input value={keyTest} onChange={(e) => setKeyTest(e.target.value)} placeholder={t('settings.testKeyPlaceholder')} />
      </div>
      <button type="button" className="btn btn-secondary" onClick={testKey}>
        {t('settings.validateKey')}
      </button>
      <div className="field">
        <label>{t('settings.bmToken')}</label>
        <input type="password" value={s.battlemetricsToken} onChange={bind('battlemetricsToken')} autoComplete="off" />
      </div>
      <div className="field">
        <label>{t('settings.steamCmd')}</label>
        <input value={s.steamLaunchCommand} onChange={bind('steamLaunchCommand')} placeholder="steam ou flatpak run …" />
      </div>
      <div className="field">
        <label>{t('settings.steamRoot')}</label>
        <input value={s.steamRootPath} onChange={bind('steamRootPath')} placeholder={t('settings.steamRootPlaceholder')} />
      </div>
      <div className="field">
        <label>{t('settings.dayzBranch')}</label>
        <select value={s.dayZBranch} onChange={bind('dayZBranch')}>
          <option value="stable">{t('settings.stable')}</option>
          <option value="experimental">{t('settings.experimental')}</option>
        </select>
      </div>
      <div className="field">
        <label>{t('settings.geoCsv')}</label>
        <input value={s.geoIpDatabasePath} onChange={bind('geoIpDatabasePath')} placeholder={t('settings.geoCsvPlaceholder')} />
      </div>
      <div className="field">
        <label>{t('settings.clientLat')}</label>
        <input type="number" step="any" value={s.clientLat || ''} onChange={(e) => setS(domain.Settings.createFrom({...s, clientLat: parseFloat(e.target.value) || 0}))} />
      </div>
      <div className="field">
        <label>{t('settings.clientLon')}</label>
        <input type="number" step="any" value={s.clientLon || ''} onChange={(e) => setS(domain.Settings.createFrom({...s, clientLon: parseFloat(e.target.value) || 0}))} />
      </div>
      <div className="field">
        <label>{t('settings.lanQuery')}</label>
        <input type="number" value={s.lanQueryPort} onChange={(e) => setS(domain.Settings.createFrom({...s, lanQueryPort: parseInt(e.target.value, 10) || 2305}))} />
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={s.fullscreen} onChange={bind('fullscreen')} /> {t('settings.fullscreen')}
        </label>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={s.debug} onChange={bind('debug')} /> {t('settings.debug')}
        </label>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={s.modInstallAuto} onChange={bind('modInstallAuto')} /> {t('settings.modInstallAuto')}
        </label>
      </div>
      <button type="button" className="btn" onClick={save}>
        {t('settings.save')}
      </button>
    </div>
  );
}
