#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPO:-herberthudson/dzglauncher}"
RAW_BRANCH="${DZGLAUNCHER_BRANCH:-main}"
API_LATEST="https://api.github.com/repos/${REPO}/releases/latest"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/${RAW_BRANCH}/packaging/aur"

die() {
  echo "error: $*" >&2
  exit 1
}

need_cmd() {
  local c
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || die "required command not found: $c"
  done
}

have_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    return 0
  fi
  command -v sudo >/dev/null 2>&1 || die "sudo is required to install packages"
  sudo -v
}

fetch_release_urls() {
  need_cmd python3 curl
  python3 - "$API_LATEST" <<'PY'
import json, sys, urllib.request

url = sys.argv[1]
req = urllib.request.Request(
    url,
    headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "dzglauncher-install-sh",
    },
)
with urllib.request.urlopen(req, timeout=120) as r:
    data = json.load(r)

deb = rpm = sums = None
for a in data.get("assets") or []:
    name = a.get("name") or ""
    b = a.get("browser_download_url")
    if not b:
        continue
    if name.endswith("_amd64.deb") and name.startswith("dzglauncher_"):
        deb = b
    elif name.endswith(".x86_64.rpm") and name.startswith("dzglauncher-"):
        rpm = b
    elif name == "SHA256SUMS":
        sums = b

if not deb or not rpm or not sums:
    print("incomplete release: missing .deb, .rpm, or SHA256SUMS", file=sys.stderr)
    sys.exit(1)

print(deb)
print(rpm)
print(sums)
PY
}

is_arch_like() {
  command -v pacman >/dev/null 2>&1 || return 1
  if [ -f /etc/arch-release ]; then
    return 0
  fi
  if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    case "${ID:-}" in
      arch|cachyos|manjaro|endeavouros|garuda) return 0 ;;
    esac
    case ",${ID_LIKE:-}," in
      *,arch,*) return 0 ;;
    esac
  fi
  return 1
}

is_debian_like() {
  [ -f /etc/debian_version ] && command -v apt-get >/dev/null 2>&1
}

is_rpm_like() {
  command -v rpm >/dev/null 2>&1 || return 1
  if [ -f /etc/redhat-release ] || [ -f /etc/fedora-release ]; then
    return 0
  fi
  if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    case "${ID:-}" in
      fedora|rhel|centos|rocky|almalinux|ol|mageia|opensuse-tumbleweed|opensuse-leap|sled|sles) return 0 ;;
    esac
    case ",${ID_LIKE:-}," in
      *,rhel,*) return 0 ;;
      *,fedora,*) return 0 ;;
      *,suse,*) return 0 ;;
    esac
  fi
  return 1
}

install_deb() {
  need_cmd curl sha256sum
  have_sudo
  is_debian_like || die "this does not look like a Debian-based system"
  local tmp deb line
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  mapfile -t line < <(fetch_release_urls)
  deb="${line[0]}"
  sums="${line[2]}"

  echo "Downloading checksums..."
  curl -fsSL -o "$tmp/SHA256SUMS" "$sums"
  echo "Downloading .deb package..."
  curl -fsSL -o "$tmp/pkg.deb" "$deb"
  grep -E 'dzglauncher_.*_amd64\.deb$' "$tmp/SHA256SUMS" >"$tmp/subsums" || true
  if [ ! -s "$tmp/subsums" ]; then
    die ".deb line not found in SHA256SUMS"
  fi
  ( cd "$tmp" && sha256sum -c --strict subsums )

  echo "Installing runtime dependencies (GTK/WebKit) if missing..."
  sudo apt-get update -qq
  sudo apt-get install -y --no-install-recommends libgtk-3-0 libwebkit2gtk-4.1-0 librsvg2-2 || true

  echo "Installing dzglauncher (.deb)..."
  sudo apt-get install -y "$tmp/pkg.deb"
  echo "Done."
}

install_rpm() {
  need_cmd curl sha256sum
  have_sudo
  is_rpm_like || die "this does not look like an RPM-based system"
  local tmp rpm line
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  mapfile -t line < <(fetch_release_urls)
  rpm="${line[1]}"
  sums="${line[2]}"

  echo "Downloading checksums..."
  curl -fsSL -o "$tmp/SHA256SUMS" "$sums"
  echo "Downloading .rpm package..."
  curl -fsSL -o "$tmp/pkg.rpm" "$rpm"
  grep -E 'dzglauncher-.*\.x86_64\.rpm$' "$tmp/SHA256SUMS" >"$tmp/subsums" || true
  if [ ! -s "$tmp/subsums" ]; then
    die ".rpm line not found in SHA256SUMS"
  fi
  ( cd "$tmp" && sha256sum -c --strict subsums )

  echo "Installing dzglauncher (.rpm)..."
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y "$tmp/pkg.rpm"
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y "$tmp/pkg.rpm"
  elif command -v zypper >/dev/null 2>&1; then
    sudo zypper --non-interactive install -y "$tmp/pkg.rpm"
  else
    die "unrecognized RPM package manager (expected dnf, yum, or zypper)"
  fi
  echo "Done."
}

install_arch() {
  need_cmd curl makepkg pacman
  have_sudo
  is_arch_like || die "this does not look like an Arch-based system"

  echo "Ensuring build/install dependencies (AUR-style package)..."
  sudo pacman -S --needed --noconfirm base-devel gtk3 webkit2gtk-4.1 librsvg hicolor-icon-theme desktop-file-utils curl

  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  echo "Downloading PKGBUILD and dzglauncher.install from the repository..."
  curl -fsSL -o "$tmp/PKGBUILD" "${RAW_BASE}/PKGBUILD"
  curl -fsSL -o "$tmp/dzglauncher.install" "${RAW_BASE}/dzglauncher.install"

  ( cd "$tmp" && makepkg -sf --noconfirm )

  local built
  built="$(find "$tmp" -maxdepth 1 -name 'dzglauncher-*.pkg.tar.zst' -print -quit)"
  [ -n "$built" ] || die "makepkg did not produce a .pkg.tar.zst"

  echo "Installing package with pacman -U..."
  sudo pacman -U --noconfirm "$built"
  echo "Done."
}

main() {
  if is_arch_like; then
    install_arch
  elif is_debian_like; then
    install_deb
  elif is_rpm_like; then
    install_rpm
  else
    die "unsupported system for this script (use Debian/Ubuntu, Fedora/openSUSE/RHEL family, or Arch and derivatives)"
  fi
}

main "$@"
