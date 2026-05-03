import {onCleanup, onMount} from 'solid-js';
import * as App from '../../wailsjs/go/main/App';
import {i18n} from './i18n';
import {resolveLocale} from './resolveLocale';
import {applyThemeToDocument} from '../theme/resolveTheme';

export function I18nSync(props: {children: any}) {
  onMount(() => {
    let ok = true;
    App.LoadSettings()
      .then((s) => {
        if (!ok) {
          return;
        }
        const lng = resolveLocale(s.locale || '', navigator.language);
        void i18n.changeLanguage(lng);
        applyThemeToDocument(s.uiTheme);
      })
      .catch(() => {});
    onCleanup(() => {
      ok = false;
    });
  });
  return <>{props.children}</>;
}
