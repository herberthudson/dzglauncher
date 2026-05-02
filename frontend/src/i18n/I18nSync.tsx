import {useEffect} from 'react';
import * as App from '../../wailsjs/go/main/App';
import {i18n} from './i18n';
import {resolveLocale} from './resolveLocale';

export function I18nSync({children}: {children: React.ReactNode}) {
  useEffect(() => {
    let ok = true;
    App.LoadSettings()
      .then((s) => {
        if (!ok) {
          return;
        }
        const lng = resolveLocale(s.locale || '', navigator.language);
        void i18n.changeLanguage(lng);
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, []);
  return <>{children}</>;
}
