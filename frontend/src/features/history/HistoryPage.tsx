import {useEffect, useState} from 'react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';

export function HistoryPage() {
  const [s, setS] = useState<domain.Settings | null>(null);
  const [err, setErr] = useState('');

  const reload = () =>
    App.LoadSettings()
      .then((v) => {
        setErr('');
        setS(v);
      })
      .catch((e: unknown) => {
        setErr(String(e));
        setS(null);
      });

  useEffect(() => {
    reload();
  }, []);

  if (!s) {
    return (
      <div>
        <h1 style={{marginTop: 0}}>Histórico de ligações</h1>
        {err ? <div className="msg msg-error">{err}</div> : <p>A carregar…</p>}
      </div>
    );
  }

  const hist = Array.isArray(s.history) ? s.history : [];

  return (
    <div>
      <h1 style={{marginTop: 0}}>Histórico de ligações</h1>
      {err ? <div className="msg msg-error">{err}</div> : null}
      <ol style={{paddingLeft: '1.2rem'}}>
        {hist.map((h, i) => (
          <li key={i} style={{marginBottom: '0.35rem'}}>
            {h.name} — {h.ip}:{h.gamePort} (q {h.queryPort})
            <button type="button" className="btn btn-secondary" style={{marginLeft: '0.5rem', fontSize: '0.75rem'}} onClick={() => App.RemoveHistoryIndex(i).then(reload)}>
              Apagar
            </button>
          </li>
        ))}
      </ol>
      {hist.length === 0 ? <p>Sem entradas.</p> : null}
    </div>
  );
}
