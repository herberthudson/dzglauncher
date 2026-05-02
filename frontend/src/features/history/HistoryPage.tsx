import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Clock} from 'lucide-react';
import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {PageHeader} from '../../shared/PageHeader';

export function HistoryPage() {
  const {t} = useTranslation();
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
        <PageHeader icon={Clock} title={t('history.title')} description={t('history.subtitle')} />
        {err ? <div className="msg msg-error">{err}</div> : <p>{t('common.loading')}</p>}
      </div>
    );
  }

  const hist = Array.isArray(s.history) ? s.history : [];

  return (
    <div>
      <PageHeader icon={Clock} title={t('history.title')} description={t('history.subtitle')} />
      {err ? <div className="msg msg-error">{err}</div> : null}
      <section className="ds-card" aria-label={t('history.title')}>
        {hist.length === 0 ? (
          <p style={{margin: 0}}>{t('history.empty')}</p>
        ) : (
          <ul className="history-list">
            {hist.map((h, i) => (
              <li key={i} className="history-item">
                <span>
                  {h.name} — {h.ip}:{h.gamePort} (q {h.queryPort})
                </span>
                <button type="button" className="btn btn-secondary" onClick={() => App.RemoveHistoryIndex(i).then(reload)}>
                  {t('history.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
