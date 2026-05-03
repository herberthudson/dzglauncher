# Design system (frontend)

UI stack: **React 18**, **TypeScript**, **Vite 3**, **react-router-dom** v6, **i18next** / **react-i18next**, and **lucide-react** icons. The Wails binary embeds the output of `npm run build` (`frontend/dist`).

The project uses **structural tokens** + **per-theme CSS files** with semantic variables. React components avoid raw hex; they use classes in `src/shared/layout.css` and variables from the active theme.

## Files

| File | Role |
|------|------|
| `frontend/src/theme/tokens.css` | Spacing, radii, shadows, base typography (no brand colors). |
| `frontend/src/theme/themes/flat-dark-theme.css` | Flat dark theme: dark surfaces, blue accent, light text. |
| `frontend/src/theme/themes/flat-light-theme.css` | Flat light theme (same semantic variables). |
| `frontend/src/theme/app.css` | Entry point: imports tokens and **all** themes. |
| `frontend/src/shared/layout.css` | UI primitives (`.btn`, `.ds-card`, `.shell-nav`, tables, messages). |

## Enabling a theme

1. In the app **Settings**, pick a theme (persisted as `uiTheme` in JSON) or edit `index.html`: `data-theme="flat-dark-theme"` or `data-theme="flat-light-theme"`.

2. Or import only one theme file in `app.css` (replacing current `@import`s) if you want a build **without** attribute switching.

The stored value (`flat-dark-theme` / `flat-light-theme`) is applied on `<html>` at startup and when saving.

**Limitation:** only those bundled themes are supported without changing source. **User-supplied themes loaded at runtime** (no edit to `app.css` / no app rebuild) are not implemented yet; see the root [README.md](../README.md) roadmap.

Each theme must declare the **same set** of variables consumed by `layout.css`, for example:

- `--bg`, `--bg-elevated`, `--bg-hover`, `--bg-input`
- `--border`, `--border-focus`
- `--text`, `--text-muted`, `--text-on-accent`
- `--accent`, `--accent-hover`, `--accent-muted`
- `--danger`, `--radius`, `--font`, `--table-row-hover`, `--nav-active-bg`, `--nav-active-text`, `--page-header-icon-bg`

## New themes

1. Create `frontend/src/theme/themes/<name>.css` with:

   ```css
   html[data-theme="name"] {
     --bg: ...;
     /* remaining variables */
   }
   ```

2. Add `@import "./themes/<name>.css";` in `app.css`.

3. Set `data-theme="name"` on `<html>` (or at runtime: `document.documentElement.dataset.theme = 'name'`).

## Components

- **`.ds-card`**: bordered elevated surface.
- **`.ds-section-title`**: section title (subtle caps); may pair with a `lucide-react` icon.
- **`PageHeader`**: page header with icon, title, optional description (`src/shared/PageHeader.tsx`).

## Icons

Library: **`lucide-react`**. Prefer consistent SVG icons instead of emoji in navigation and headers.
