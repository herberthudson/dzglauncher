import {useEffect, useState} from 'react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';

export function SettingsPage() {
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
    return <p>A carregar…</p>;
  }

  const bind =
    (field: keyof domain.Settings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setS(domain.Settings.createFrom({...s, [field]: v}));
    };

  const save = () =>
    App.SaveSettings(s)
      .then(() => {
        setOkMsg('Guardado.');
        setMsg('');
      })
      .catch((e: unknown) => {
        setMsg(String(e));
        setOkMsg('');
      });

  const testKey = () =>
    App.ValidateSteamAPIKey(keyTest || s.steamWebApiKey).then((r: domain.SteamKeyValidation) => {
      if (r.ok) {
        setOkMsg('Chave válida.');
        setMsg('');
      } else {
        setMsg(r.message || 'Inválida');
        setOkMsg('');
      }
    });

  return (
    <div>
      <h1 style={{marginTop: 0}}>Definições</h1>
      {msg ? <div className="msg msg-error">{msg}</div> : null}
      {okMsg ? <div className="msg">{okMsg}</div> : null}
      <div className="field">
        <label>Nome de jogador</label>
        <input value={s.playerName} onChange={bind('playerName')} />
      </div>
      <div className="field">
        <label>Steam Web API Key</label>
        <input type="password" value={s.steamWebApiKey} onChange={bind('steamWebApiKey')} autoComplete="off" />
      </div>
      <div className="field">
        <label>Testar chave (opcional, sobrepõe)</label>
        <input value={keyTest} onChange={(e) => setKeyTest(e.target.value)} placeholder="deixe vazio para usar a guardada" />
      </div>
      <button type="button" className="btn btn-secondary" onClick={testKey}>
        Validar chave Steam
      </button>
      <div className="field">
        <label>Token Battlemetrics (opcional)</label>
        <input type="password" value={s.battlemetricsToken} onChange={bind('battlemetricsToken')} autoComplete="off" />
      </div>
      <div className="field">
        <label>Comando Steam</label>
        <input value={s.steamLaunchCommand} onChange={bind('steamLaunchCommand')} placeholder="steam ou flatpak run …" />
      </div>
      <div className="field">
        <label>Pasta raiz Steam (workshop)</label>
        <input value={s.steamRootPath} onChange={bind('steamRootPath')} placeholder="ex.: ~/.local/share/Steam" />
      </div>
      <div className="field">
        <label>Ramo DayZ</label>
        <select value={s.dayZBranch} onChange={bind('dayZBranch')}>
          <option value="stable">Estável (221100)</option>
          <option value="experimental">Experimental (1024020)</option>
        </select>
      </div>
      <div className="field">
        <label>Caminho CSV geo (DB-IP CC BY)</label>
        <input value={s.geoIpDatabasePath} onChange={bind('geoIpDatabasePath')} placeholder="vazio = amostra embutida" />
      </div>
      <div className="field">
        <label>Latitude cliente (graus)</label>
        <input type="number" step="any" value={s.clientLat || ''} onChange={(e) => setS(domain.Settings.createFrom({...s, clientLat: parseFloat(e.target.value) || 0}))} />
      </div>
      <div className="field">
        <label>Longitude cliente (graus)</label>
        <input type="number" step="any" value={s.clientLon || ''} onChange={(e) => setS(domain.Settings.createFrom({...s, clientLon: parseFloat(e.target.value) || 0}))} />
      </div>
      <div className="field">
        <label>Porta query LAN</label>
        <input type="number" value={s.lanQueryPort} onChange={(e) => setS(domain.Settings.createFrom({...s, lanQueryPort: parseInt(e.target.value, 10) || 2305}))} />
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={s.fullscreen} onChange={bind('fullscreen')} /> Ecrã completo
        </label>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={s.debug} onChange={bind('debug')} /> Modo debug
        </label>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={s.modInstallAuto} onChange={bind('modInstallAuto')} /> Instalação automática de mods (preferência)
        </label>
      </div>
      <button type="button" className="btn" onClick={save}>
        Guardar
      </button>
    </div>
  );
}
