# dzglauncher

Desktop client for **DayZ**: browse servers (including Steam master list), manage **favorites** (up to five quick slots), **history**, **Steam Workshop** mods, and launch the game via **Steam**. **Linux-first**, built with [**Wails v2**](https://wails.io/) (Go backend + **SolidJS** / TypeScript frontend).

---

## Project maintenance — read this first

This repository is a **personal** project. The maintainer **does not** commit to reviewing feature ideas, reproducing bugs, or merging pull requests on any schedule. Issues and pull requests may receive **no reply**, be **closed without a fix or merge**, or be handled **only when convenient**. There is **no obligation** to implement requests or keep compatibility with your distro, hardware, or workflow.

**Use the code and releases as-is.** If you need predictable support or timelines, **fork** the repository and maintain your own copy.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [How to run and build](#how-to-run-and-build)
- [Changelog](#changelog)
- [Documentation](#documentation)
- [Repository layout](#repository-layout)
- [TODO](#todo)
- [License and third-party credits](#license-and-third-party-credits)

---

## Overview

dzglauncher connects to public server lists and live **A2S** metadata where available, stores settings in a JSON file under the OS config directory (e.g. `$XDG_CONFIG_HOME/dzglauncher/config.json` on Linux), and focuses on a **single-player-style** desktop workflow rather than a hosted service.

**Platforms:** day-to-day development and validation target **Linux only**. Wails can build for **Windows** and **macOS**; this repo **does not** claim those targets are tested or supported—treat them as **best-effort** unless someone documents real usage.

---

## Features

- Steam master-list browser with filters, search, and map selection.
- Live server metadata and ping refresh via **A2S** (including DayZ rules / mod list where the server exposes them).
- **Favorites**, up to **five quick favorites**, deduplicated **history**, and Workshop-oriented **mods** flows.
- Settings: Steam Web API key, Steam launch command, install paths, DayZ branch, i18n, built-in **dark/light** themes, optional **external CSS overlay** (`uiExternalThemePath` + `ReadUIThemeFile`).

---

## Requirements

### Toolchain (to develop or compile from source)

| Tool | Version | Role |
|------|---------|------|
| [Go](https://go.dev/dl/) | **1.23+** (see `go.mod`) | Backend compile and runtime |
| [Node.js](https://nodejs.org/) | **18 LTS** or newer | Frontend install and build (`vite`, `tsc`) |
| [Wails CLI v2](https://wails.io/docs/gettingstarted/installation) | e.g. **2.12.x** | `wails dev` / `wails build` — install: `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |

Wails embeds the UI in a **native webview**. On Linux you need **GTK 3** and **WebKit2GTK 4.1** development packages plus a C toolchain (`gcc`, `pkg-config`). This repo sets `"build:tags": "webkit2_41"` in [`wails.json`](wails.json). For other OS expectations, follow the official [Wails installation](https://wails.io/docs/gettingstarted/installation) guide.

### Linux: system libraries for running a release binary or building locally

Official **zip** and **tar.gz** builds are **dynamically linked** against GTK 3 and WebKit2GTK 4.1 from **your** distribution—you must install the **runtime** packages before running `dzglauncher`.

| Family | Example install |
|--------|------------------|
| **Arch-based** (Arch, CachyOS, Manjaro, …) | `sudo pacman -S --needed gtk3 webkit2gtk-4.1` |
| **Ubuntu / Debian** | `sudo apt-get install -y libgtk-3-0 libwebkit2gtk-4.1-0` |
| **Fedora** | `sudo dnf install gtk3 webkit2gtk4.1` |

**Build** from source on Linux needs the matching **-dev** / **-devel** packages as well—exact names and extra packages are in **[`docs/linux-dependencies.md`](docs/linux-dependencies.md)**.

### What you need to use the app (behavior, not compile)

- **Steam Web API key** — required for the Steam master-list browser (configure in-app; see [`docs/architecture-and-product.md`](docs/architecture-and-product.md)).
- **Steam** client and **DayZ** installed — for joining servers and Workshop.
- **Battlemetrics** (optional) — some ID-based flows and fallbacks; see architecture doc.

### Optional: correct window icon on Linux (Wayland / taskbar)

GTK sets a window icon, but on **Wayland** many shells use the **`.desktop` file** and **freedesktop icon theme** instead. If you only run `./build/bin/dzglauncher`, you may see a generic placeholder even though the app ships a PNG.

To install the user-level entry and icon (paths match [`packaging/linux/dzglauncher.desktop`](packaging/linux/dzglauncher.desktop) and [`packaging/linux/icons/`](packaging/linux/icons/)):

```bash
mkdir -p ~/.local/share/applications ~/.local/share/icons/hicolor/256x256/apps
cp packaging/linux/dzglauncher.desktop ~/.local/share/applications/
cp packaging/linux/icons/hicolor/256x256/apps/dzglauncher.png ~/.local/share/icons/hicolor/256x256/apps/
gtk-update-icon-cache ~/.local/share/icons/hicolor 2>/dev/null || true
```

If `dzglauncher` is not on your `PATH`, edit `~/.local/share/applications/dzglauncher.desktop` and set `Exec=` to the **full path** of the binary.

---

## How to run and build

### Full app in development (hot reload)

From the repository root:

```bash
wails dev
```

This runs `npm install` for the frontend as configured in `wails.json`, starts Vite, and rebuilds the Go side when needed.

### Production build (local)

```bash
wails build
```

Output is under **`build/bin/`** (Wails default). Extra Windows/macOS assets live under [`build/`](build/README.md). Non-Linux outputs are **untested** by this project—see [Overview](#overview).

### Optional: frontend without Wails

From the `frontend/` directory, run `npm install` once, then use whichever you need:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

`npm run dev` starts **Vite only** (no Wails; limited for UI-only work). `npm run lint` runs the TypeScript check. `npm run build` runs `tsc` and `vite build` (the same style of frontend build Wails uses in production).

### Tests (Go)

From the repository root:

```bash
go test ./...
```

### Linux release archives (from GitHub)

On tags `v*`, [`.github/workflows/release-linux.yml`](.github/workflows/release-linux.yml) publishes:

- **`dzglauncher-<version>-linux-amd64.zip`**
- **`dzglauncher-<version>-linux-amd64.tar.gz`**
- **`SHA256SUMS`**

Each archive contains the `dzglauncher` binary, `LICENSE`, `README.md`, and a **`share/`** tree (`share/applications/dzglauncher.desktop`, `share/icons/hicolor/256x256/apps/dzglauncher.png`) so you can merge into `~/.local/share/` if you want menu integration.

Download the two archives and `SHA256SUMS` into one directory, then:

```bash
sha256sum -c SHA256SUMS
```

Browse and download assets from **[Releases](https://github.com/herberthudson/dzglauncher/releases)**.

---

## Changelog

Version-to-version notes live in **[`CHANGELOG.md`](CHANGELOG.md)**. Binary releases and checksums are on **[GitHub Releases](https://github.com/herberthudson/dzglauncher/releases)**.

---

## Documentation

| Document | Contents |
|----------|----------|
| [`docs/README.md`](docs/README.md) | Index of all docs |
| [`docs/architecture-and-product.md`](docs/architecture-and-product.md) | Domain, Steam / A2S / Battlemetrics / geo, product rules |
| [`docs/project-and-structure.md`](docs/project-and-structure.md) | Folders, stack, layer boundaries |
| [`docs/design-system.md`](docs/design-system.md) | Tailwind, tokens, themes, UI components |
| [`docs/linux-dependencies.md`](docs/linux-dependencies.md) | Linux runtime vs build packages by distro |

---

## Repository layout

```
dzglauncher/
├── main.go, app.go       # Wails entry and APIs exposed to the frontend
├── internal/
│   ├── domain/           # Models and rules (settings, server row, quick fav caps, …)
│   ├── services/         # Use cases (browser, filters, geo, launch, favorites/history)
│   ├── adapters/         # HTTP, files, A2S, Steam API, Workshop, LAN, Battlemetrics
│   └── ports/            # Interfaces (e.g. config store)
├── frontend/             # SolidJS + TypeScript + Vite + @solidjs/router + i18next
├── data/                 # Embedded data (e.g. DB-IP sample ranges)
├── build/                # Wails packaging assets (icons, platform metadata)
├── packaging/linux/      # .desktop and icons for Linux packaging
└── docs/                 # Markdown documentation
```

---

## TODO

Open work (may include stubs or partial UI). Mark an item when it is implemented or no longer applicable.

- [ ] **Battlemetrics** — finish end-to-end flows (errors, fallbacks, discoverability); token field and ID resolution already exist.
- [ ] **LAN** — first-class UX and validation on real networks beyond the current subnet scan API.
- [ ] **Geolocation** — coherent product pass and tests for client location, accuracy, and distance labels (bundled DB-IP sample + optional user database path).
- [ ] **Runtime theme overlay** — document and harden the optional CSS overlay path (`uiExternalThemePath`) so tokens can be overridden without rebuilding shipped theme sources.

---

## License and third-party credits

- **License:** **Apache License 2.0** — full text in [`LICENSE`](LICENSE).
- **Third-party:** Libraries and embedded data keep their own licenses (e.g. Wails, [`github.com/woozymasta/a2s`](https://github.com/woozymasta/a2s), system GTK/WebKit). Geo database attribution is described in [`docs/architecture-and-product.md`](docs/architecture-and-product.md).
