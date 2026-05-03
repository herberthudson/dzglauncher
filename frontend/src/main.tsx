import {render} from 'solid-js/web';
import {I18nextProvider} from 'solid-i18next';
import './i18n/i18n';
import './style.css';
import {i18n} from './i18n/i18n';
import App from './App';

const root = document.getElementById('root');
if (root) {
  render(
    () => (
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    ),
    root,
  );
}
