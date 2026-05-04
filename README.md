# dzglauncher

Desktop client to browse DayZ servers, manage favorites (including up to **five quick favorites**), connection history, Steam Workshop mods, and launches via Steam. **Linux-first**, built with **Wails v2** (Go + SolidJS/TypeScript).

License: **Apache License 2.0** — see [`LICENSE`](LICENSE).

## Platform support

Development and day-to-day validation target **Linux only**. Wails can produce binaries for **Windows** and **macOS**, but this repository **does not claim** those builds are tested, supported, or free of platform-specific issues. Treat non-Linux targets as **best-effort** until someone exercises and documents them.

## Requirements

### Development toolchain

| Tool | Suggested version | Notes |
|------|-------------------|-------|
| [Go](https://go.dev/dl/) | **1.23+** (matches `go.mod`) | Backend compile and runtime. |
| [Node.js](https://nodejs.org/) | **18 LTS** or newer | `npm install` and frontend build (`vite`, `tsc`). |
| [Wails CLI](https://wails.io/docs/gettingstarted/installation) | **v2** (e.g. 2.12.x) | `wails dev` and `wails build`. Install: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`. |

### Wails platform dependencies

Wails hosts the UI in a native webview. Always follow the official guide: [Getting Started — Installation](https://wails.io/docs/gettingstarted/installation).

Typical expectations:

- **Linux:** **GTK3** and **WebKit2GTK** dev packages (e.g. Debian/Ubuntu: `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`; names vary by distro). Build tools: `gcc`, `pkg-config`.
- **Windows:** [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (often preinstalled); MSVC or equivalent per Wails docs.
- **macOS:** Xcode / command-line tools.

This repo sets `"build:tags": "webkit2_41"` in [`wails.json`](wails.json) to align with WebKit2GTK versions used on Linux builds. Cross-compiling or building on Windows/macOS is possible with Wails; see **Platform support** above regarding testing.

### Linux system packages (run the binary or build locally)

The Linux **zip/tar.gz** binary expects **GTK3** and **WebKit2GTK 4.1** from the distro (dynamic linking). Install runtime packages before running `dzglauncher`. For full commands (Arch-based, Ubuntu/Debian, Fedora) and separate **build** dependencies for `wails build` / `wails dev`, see **[`docs/linux-dependencies.md`](docs/linux-dependencies.md)**.

| Family | Runtime (examples) |
|--------|---------------------|
| **Arch-based** (Arch, CachyOS, Manjaro, …) | `sudo pacman -S --needed gtk3 webkit2gtk-4.1` |
| **Ubuntu / Debian** | `sudo apt-get install -y libgtk-3-0 libwebkit2gtk-4.1-0` |
| **Fedora** | `sudo dnf install gtk3 webkit2gtk4.1` |

The **AppImage** bundles much of the GUI stack; the table above still applies if you use the portable archive or develop with the system WebKit.

### Linux window icon (taskbar, overview, Wayland)

Wails passes your PNG to GTK (`gtk_window_set_icon`). On **X11**, that is often enough. On **Wayland** (default on many desktops), the compositor usually takes the window/taskbar icon from a **`.desktop` file** plus the **freedesktop icon theme** (`Icon=dzglauncher` → `hicolor/.../dzglauncher.png`), not from GTK’s window icon alone. If you only run `./build/bin/dzglauncher` without installing those pieces, you may still see a **generic or WebKit-style fallback** (e.g. a “W”-like placeholder), even though the app embeds a custom icon.

To get the correct icon in the shell while developing, install the entry and icons into your user prefix (paths match [`packaging/linux/dzglauncher.desktop`](packaging/linux/dzglauncher.desktop) and `packaging/linux/icons/`):

```bash
mkdir -p ~/.local/share/applications ~/.local/share/icons/hicolor/256x256/apps
cp packaging/linux/dzglauncher.desktop ~/.local/share/applications/
cp packaging/linux/icons/hicolor/256x256/apps/dzglauncher.png ~/.local/share/icons/hicolor/256x256/apps/
gtk-update-icon-cache ~/.local/share/icons/hicolor 2>/dev/null || true
```

Adjust the `Exec=` line in the copied `.desktop` if your binary is not on `PATH` (use the full path to `dzglauncher`).

### Runtime / keys (app behavior)

- **Steam Web API key** — required for the Steam master-list browser (see in-app settings and [`docs/architecture-and-product.md`](docs/architecture-and-product.md)).
- **Steam client** and **DayZ** install — for joining and Workshop.
- **Battlemetrics** (optional) — ID-based flows and optional fallbacks (see architecture doc).

## Quick start

From the repository root:

```bash
wails dev
```

This runs the frontend npm install as configured in `wails.json`, starts Vite in dev mode, and rebuilds Go with reload where applicable.

Optional manual frontend build:

```bash
cd frontend && npm install && npm run build
```

## Production build

```bash
wails build
```

Binaries and bundles land under `build/bin/` (standard Wails layout). Windows/macOS icons and metadata live under [`build/`](build/README.md). If you build for a non-Linux OS, treat the output as **untested** by this project (see **Platform support**).

Linux release archives (zip, tar.gz, AppImage) and `SHA256SUMS` are built by [`.github/workflows/release-linux.yml`](.github/workflows/release-linux.yml) on version tags `v*`. The **zip** and **tar.gz** archives include `dzglauncher`, `LICENSE`, `README.md`, and a `share/` tree with [`packaging/linux/dzglauncher.desktop`](packaging/linux/dzglauncher.desktop) under `share/applications/` and the PNG icon under `share/icons/hicolor/256x256/apps/` (freedesktop layout for copying into `~/.local/share/`). After downloading `SHA256SUMS` together with the zip, tar.gz, and AppImage into the same directory, run `sha256sum -c SHA256SUMS` to verify them. The AppImage is produced on **Ubuntu 22.04** and bundles WebKit2GTK helper binaries plus a custom `AppRun` that sets `WEBKIT_EXEC_DIR` so the app does not rely on host paths such as `/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/` (which do not exist on some distros, e.g. Arch-based systems). If the AppImage still fails to start WebKit on your system, use the **tar.gz** or **zip** build against your distribution’s `libwebkit2gtk-4.1` packages instead.

## Documentation

Index: [`docs/README.md`](docs/README.md).

| Document | Contents |
|----------|----------|
| [`docs/architecture-and-product.md`](docs/architecture-and-product.md) | Domain, integrations (Steam, A2S, Battlemetrics, geo), product rules — stack-agnostic. |
| [`docs/project-and-structure.md`](docs/project-and-structure.md) | Folders, languages, libraries, layer boundaries. |
| [`docs/design-system.md`](docs/design-system.md) | Tailwind, CSS tokens, built-in themes, external theme overlay, UI components. |

## Repository layout

```
dzglauncher/
├── main.go, app.go          # Wails entry and API exposed to the frontend
├── internal/
│   ├── domain/              # Domain models and rules (Settings, server row, quick fav caps, …)
│   ├── services/          # Use cases (Steam browser, filters, geo, launch, favorites/history)
│   ├── adapters/          # HTTP, files, A2S, Steam API, Workshop, LAN, Battlemetrics
│   └── ports/             # Interfaces (e.g. config store)
├── frontend/              # SolidJS + TypeScript + Vite + @solidjs/router + i18next
├── data/                  # Embedded data (e.g. DB-IP sample ranges)
├── build/                 # Wails packaging assets
└── docs/                  # Documentation
```

Persisted settings: JSON at `dzglauncher/config.json` inside the OS user config directory (e.g. `$XDG_CONFIG_HOME` on Linux, equivalent paths on macOS/Windows).

## Frontend scripts

```bash
cd frontend
npm run lint    # tsc --noEmit
npm run build   # tsc && vite build
npm run dev     # Vite only (no Wails; limited for UI-only work)
```

## Go tests

```bash
go test ./...
```

## Implemented highlights

- Steam master-list server browser with filters, search, and map selection.
- Live server metadata and ping refresh via **A2S** (incl. DayZ rules / mod list where available).
- **Favorites** plus up to **five quick favorites**, deduplicated **history**, and Workshop-oriented **mods** workflow.
- Settings for Steam Web API key, Steam launch command, install paths, DayZ branch, i18n, bundled **dark/light** themes, and optional **external CSS overlay** path (`uiExternalThemePath` + `ReadUIThemeFile`).
- JSON settings under the OS config directory; Apache 2.0 license; English docs under [`docs/`](docs/README.md).

## Roadmap / open work

Rough edges and missing product work (code stubs or partial UI may exist; this is what still needs ownership, UX polish, and **Linux-focused** testing):

- **Battlemetrics** — token field and ID resolution exist, but end-to-end flows (errors, fallbacks, discoverability) are not finished or systematically tested.
- **LAN** — subnet scan API exists; a first-class LAN experience (UX, edge cases, validation on real networks) is still open.
- **Geolocation** — bundled DB-IP sample plus optional user database path; client location refresh, accuracy, and distance labelling need a coherent product pass and tests.
- **Themes without a rebuild** — bundled themes still ship with the app; **optional runtime CSS overlay**: set an absolute file path in Settings (`uiExternalThemePath`); the app reads the file via Wails and injects it after built-in theme variables so you can override tokens without a developer build of the theme files themselves.

## Third-party credits

Third-party libraries and data keep their own licenses (e.g. Wails, `github.com/woozymasta/a2s`, system WebKit/GTK). Geo database attribution follows project notes in [`docs/architecture-and-product.md`](docs/architecture-and-product.md).
