import {useEffect, useState} from 'react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';

export function HistoryPage() {
  const [s, setS] = useState<domain.Settings | null>(null);

  const reload = () => App.LoadSettings().then(setS);

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  if (!s) {
    return <p>A carregar…</p>;
  }

  return (
    <div>
      <h1 style={{marginTop: 0}}>Histórico de ligações</h1>
      <ol style={{paddingLeft: '1.2rem'}}>
        {s.history.map((h, i) => (
          <li key={i} style={{marginBottom: '0.35rem'}}>
            {h.name} — {h.ip}:{h.gamePort} (q {h.queryPort})
            <button type="button" className="btn btn-secondary" style={{marginLeft: '0.5rem', fontSize: '0.75rem'}} onClick={() => App.RemoveHistoryIndex(i).then(reload)}>
              Apagar
            </button>
          </li>
        ))}
      </ol>
      {s.history.length === 0 ? <p>Sem entradas.</p> : null}
    </div>
  );
}
