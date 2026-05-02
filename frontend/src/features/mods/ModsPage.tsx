import {useEffect, useState} from 'react';
import * as App from '../../../wailsjs/go/main/App';
import {workshop} from '../../../wailsjs/go/models';

export function ModsPage() {
  const [items, setItems] = useState<workshop.Item[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    App.ListWorkshopItems()
      .then(setItems)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div>
      <h1 style={{marginTop: 0}}>Mods Workshop instalados</h1>
      {err ? <div className="msg msg-error">{err}</div> : null}
      <p style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Lê meta.cpp em steamapps/workshop/content/&lt;appid&gt;. Configure a pasta raiz Steam nas definições.</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Pasta</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.path}>
                <td>{m.id}</td>
                <td>{m.name}</td>
                <td style={{whiteSpace: 'normal', maxWidth: '24rem'}}>{m.path}</td>
                <td>
                  <button type="button" className="btn btn-secondary" onClick={() => App.WorkshopPage(m.id)}>
                    Steam
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !err ? <p>Nenhum mod encontrado.</p> : null}
    </div>
  );
}
