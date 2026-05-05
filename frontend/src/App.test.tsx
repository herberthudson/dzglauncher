import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render} from '@solidjs/testing-library';
import {I18nextProvider} from 'solid-i18next';
import {i18n} from './i18n/i18n';
import App from './App';

beforeEach(() => {
  window.scrollTo = vi.fn() as typeof window.scrollTo;
  (window as unknown as {go: unknown}).go = {
    main: {
      App: {
        LoadSettings: vi.fn(() =>
          Promise.resolve({
            locale: '',
            uiTheme: 'flat-dark-theme',
            uiExternalThemePath: '',
          }),
        ),
        ReadUIThemeFile: vi.fn(() => Promise.resolve('')),
        CheckForUpdate: vi.fn(() =>
          Promise.resolve({
            updateAvailable: false,
            currentVersion: 'dev',
            latestVersion: '',
            releasePageURL: '',
          }),
        ),
        OpenExternalURL: vi.fn(),
      },
    },
  };
});

describe('App', () => {
  it('renderiza marca e navegação', () => {
    const {getByRole} = render(() => (
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    ));
    expect(getByRole('img', {name: 'dzglauncher'})).toBeDefined();
  });
});
