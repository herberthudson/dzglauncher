# Linux: system dependencies

This project uses **Wails v2** with **GTK3** and **WebKit2GTK 4.1** (`webkit2_41` in [`wails.json`](../wails.json)). The Linux **zip/tar.gz** binary is **dynamically linked**: GTK and WebKit must be **installed** on the system. The **AppImage** bundles most of that stack, but may still rely on the host for fonts, GPU drivers, etc.

Two cases:

1. **Run** the `dzglauncher` binary (or a local `wails build` output) — **runtime** packages only.
2. **Compile** on Linux (`wails build`, `wails dev`) — **development** packages (`-dev` / `-devel`) plus a C toolchain.

**Other OS:** Windows (WebView2) and macOS — follow the [Wails installation guide](https://wails.io/docs/gettingstarted/installation).

## Release zip / tar.gz layout

GitHub **zip** and **tar.gz** assets also include a `share/` directory in the [freedesktop](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) layout:

- `share/applications/dzglauncher.desktop`
- `share/icons/hicolor/256x256/apps/dzglauncher.png`

After extracting an archive, you can merge those into your user prefix (desktop entry + icon for the shell):

```bash
mkdir -p ~/.local/share/applications ~/.local/share/icons
cp -r share/* ~/.local/share/
```

Edit `~/.local/share/applications/dzglauncher.desktop` so `Exec=` is the **absolute path** to the `dzglauncher` binary if it is not on `PATH`. Optionally run `gtk-update-icon-cache ~/.local/share/icons/hicolor` when your distro provides that tool.

---

## Arch-based (Arch Linux, CachyOS, Manjaro, EndeavourOS, …) — `pacman`

### Runtime (run the app)

```bash
sudo pacman -S --needed gtk3 webkit2gtk-4.1
```

`webkit2gtk-4.1` matches the WebKit2GTK **4.1** API expected by this repo’s Wails build tag.

### Build / development (`wails dev`, `wails build`)

```bash
sudo pacman -S --needed base-devel pkgconf gtk3 webkit2gtk-4.1 go nodejs npm
```

Also install the [Wails CLI](https://wails.io/docs/gettingstarted/installation) (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`).

---

## Ubuntu and Debian — `apt`

### Runtime

Ubuntu **22.04+** / Debian **12+** (WebKit2GTK 4.1 in default repositories):

```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-0 libwebkit2gtk-4.1-0
```

Exact names may differ; use `apt-cache search libwebkit2gtk` if needed.

### Build / development

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
```

Older releases without `libwebkit2gtk-4.1-dev` will not match the current `webkit2_41` setup without changing the toolchain or Wails tags.

---

## Fedora — `dnf`

### Runtime

```bash
sudo dnf install gtk3 webkit2gtk4.1
```

Confirm the WebKit 4.1 runtime name with `dnf search webkit2gtk` (Fedora often uses `webkit2gtk4.1`).

### Build / development

```bash
sudo dnf install gcc gcc-c++ pkgconf-pkg-config gtk3-devel webkit2gtk4.1-devel make
```

---

## Quick check

After installing runtime libraries, from the directory of the binary:

```bash
ldd ./dzglauncher | rg -i 'not found|webkit|gtk'
```

There should be no `not found` lines for WebKit or GTK.

---

## See also

- [Root README — Requirements](../README.md#requirements)
- [Wails — Linux](https://wails.io/docs/gettingstarted/installation#linux)
