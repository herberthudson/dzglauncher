const EXTERNAL_STYLE_ID = 'dzg-external-theme';

export function clearExternalTheme() {
  document.getElementById(EXTERNAL_STYLE_ID)?.remove();
}

export function setExternalThemeFromText(css: string) {
  clearExternalTheme();
  if (!css.trim()) {
    return;
  }
  const el = document.createElement('style');
  el.id = EXTERNAL_STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

export function attachExternalTheme(href: string) {
  clearExternalTheme();
  if (!href.trim()) {
    return;
  }
  const el = document.createElement('link');
  el.id = EXTERNAL_STYLE_ID;
  el.rel = 'stylesheet';
  el.href = href;
  document.head.appendChild(el);
}
