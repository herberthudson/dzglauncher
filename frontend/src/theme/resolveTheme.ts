export const THEME_IDS = ['flat-dark-theme', 'flat-light-theme'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export function resolveTheme(saved: string | undefined | null): ThemeId {
  const t = (saved || '').trim();
  if (t === 'flat-light-theme') {
    return 'flat-light-theme';
  }
  return 'flat-dark-theme';
}

export function applyThemeToDocument(theme: string | undefined | null) {
  document.documentElement.dataset.theme = resolveTheme(theme);
}
