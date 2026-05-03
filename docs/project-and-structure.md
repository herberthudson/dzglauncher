# Project, structure, and stack (dzglauncher)

This document describes **what exists in this repository**: languages, main libraries, and folder layout. For business requirements and external integrations, see [architecture-and-product.md](./architecture-and-product.md).

## Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | [Wails v2](https://wails.io/) (`github.com/wailsapp/wails/v2`) — Go 1.23+, native webview, generated bindings to the frontend. |
| Backend / domain | Go, module `dzglauncher`, packages under `internal/`. |
| UI | React 18, TypeScript, [Vite 3](https://vitejs.dev/), [react-router-dom](https://reactrouter.com/) v6. |
| i18n | [i18next](https://www.i18next.com/) + `react-i18next` (locales under `frontend/src/locales/`). |
| Icons | [lucide-react](https://lucide.dev/). |
| Styling | CSS theme variables (`frontend/src/theme/`, `frontend/src/shared/layout.css`). |

### Platform scope

Maintainers develop and validate on **Linux** only. **Windows** and **macOS** builds may be technically possible via Wails, but they are **not** part of the project’s tested matrix unless separately documented.

Wails-generated TypeScript bindings live in `frontend/wailsjs/` (do not hand-edit; run `wails generate module` when the Go API surface changes).

## Relevant Go modules

| Module | Role |
|--------|------|
| `github.com/wailsapp/wails/v2` | Desktop app, runtime, dialogs and URL opening. |
| `github.com/woozymasta/a2s` | A2S queries (info, DayZ rules / mods). |
| `github.com/woozymasta/steam` | Indirect dependency (transitive; Steam-related stack alongside `a2s`). |

HTTP to Steam Web API, Battlemetrics, Workshop filesystem access, and JSON persistence are implemented under `internal/adapters/`. Steam **browser** orchestration (merging filter queries) lives in `internal/services/steambrowser/`.

## Code layout

### Repository root

- **`main.go`** — `wails.Run`, embed `frontend/dist`, `App` registered in `Bind`.
- **`app.go`** — `App` struct and dependencies; exported methods are the React-facing API (settings, Steam browser, ping, favorites, launch, etc.).
- **`wails.json`** — binary name, npm frontend commands, author, Linux build tag `webkit2_41`.

### `internal/domain/`

Business types and constants: `Settings`, `Favorite`, `ServerRow`, quick-favorite limits, defaults. No I/O.

### `internal/services/`

Orchestration:

- `steambrowser` — Steam Web API listing and merged filter requests.
- `filters` — UI filter application over server rows.
- `geo` — IP range parsing and haversine distance.
- `steamlaunch` / `applaunch` — Steam launch URI/command construction.
- `favhistory` — favorites, history, quick-favorite normalization and cap (`MaxQuickFavorites`).
- `gametype` — keyword parsing, in-game time, perspective.

### `internal/adapters/`

Concrete integrations:

- `configfile` — JSON in the user config directory (`dzglauncher/config.json` under the OS config dir).
- `a2s` — A2S client + DayZ-specific rules (mods).
- `steam` — HTTP client for Steam Web API (server list, published file details).
- `battlemetrics` — optional HTTP API client.
- `workshop` — Steam paths, scans, symlinks, mod comparison and install helpers.
- `lan` — LAN subnet scan.

### `internal/ports/`

Small interfaces (e.g. `ConfigStore`) for tests and dependency inversion.

### `frontend/src/`

- **`App.tsx`** — routes: `/browse`, `/settings`, `/favorites`, `/history`, `/mods`.
- **`features/*`** — one folder per screen (`server-browser`, `settings`, `favorites`, `history`, `mods`).
- **`shared/`** — reusable pieces (`AppShell`, tables, modals, `favoriteRows`, etc.).
- **`i18n/`** — i18n bootstrap.
- **`theme/`** — tokens and themes (see [design-system.md](./design-system.md)).

### `data/`

Go-embedded assets (`//go:embed`), e.g. `dbip-sample.csv` referenced from `app.go` for bundled geo sample ranges.

## Typical data flow

1. The UI calls `frontend/wailsjs/go/main/App.*`.
2. `app.go` delegates to services/adapters and reads/writes via `configfile.Store`.
3. Responses cross the Wails boundary as JSON (types under `frontend/wailsjs/go/models`).

## How this maps to `/docs`

- **architecture-and-product.md** — *what* and *why* (product and integrations), decoupled from `internal/` layout.
- **design-system.md** — *how* the frontend is styled.
- **project-and-structure.md** (this file) — *where* each piece lives in the repo.
