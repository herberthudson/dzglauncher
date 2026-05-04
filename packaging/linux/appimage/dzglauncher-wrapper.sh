#!/bin/sh
_SCRIPT=$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")
_BIN=$(dirname "$_SCRIPT")
_USR=$(dirname "$_BIN")
_APPDIR=$(dirname "$_USR")
export LD_LIBRARY_PATH="$_APPDIR/usr/lib:$_APPDIR/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
_WK="$_APPDIR/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1"
if [ -d "$_WK" ]; then
  export WEBKIT_EXEC_DIR="$_WK"
fi
exec "$_BIN/dzglauncher.bin" "$@"
