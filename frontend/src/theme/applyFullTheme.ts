import * as App from '../../wailsjs/go/main/App';
import {applyThemeToDocument} from './resolveTheme';
import {clearExternalTheme, setExternalThemeFromText} from './themeLoader';

export async function applyFullThemeFromSettings(
  uiTheme: string | undefined | null,
  uiExternalThemePath?: string | null,
) {
  applyThemeToDocument(uiTheme);
  clearExternalTheme();
  const p = (uiExternalThemePath || '').trim();
  if (!p) {
    return;
  }
  try {
    const css = await App.ReadUIThemeFile(p);
    if (css) {
      setExternalThemeFromText(css);
    }
  } catch {
    clearExternalTheme();
  }
}
