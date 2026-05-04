# Changelog

Notable changes to **dzglauncher** are listed here. Packaged **Linux** builds (zip and tar.gz) and checksums are attached to [GitHub Releases](https://github.com/herberthudson/dzglauncher/releases).

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for tags (`vMAJOR.MINOR.PATCH`) and uses [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style sections.

## [Unreleased]

### Changed

- Linux release workflow: **AppImage** is no longer built or published; releases ship **zip** and **tar.gz** only, with `SHA256SUMS`.

## [1.0.4] — 2026-05-04

### Added

- Linux: attempt to set `WEBKIT_EXEC_DIR` from the layout next to the binary (for self-contained bundles).

## [1.0.3] — 2026-05-04

### Fixed

- Linux AppImage: shell wrapper in `usr/bin` so `WEBKIT_EXEC_DIR` is set even when the launcher does not run `AppRun`.

## [1.0.2] — 2026-05-04

### Fixed

- Linux AppImage: `AppRun` only sets `APPDIR` when the AppImage runtime has not already set it.

## [1.0.1] — 2026-05-04

### Added

- Linux dependency documentation (`docs/linux-dependencies.md`) and related README updates.
- Linux release workflow and packaging improvements (including earlier AppImage experiments in CI).

## [1.0.0] — 2026-05-04

### Added

- First versioned public release track: Linux window icon packaging, UI refinements, and release automation groundwork.

---

Earlier history: see `git log` and commits before `v1.0.0` for SolidJS migration, favorites, Workshop flows, themes, and documentation.
