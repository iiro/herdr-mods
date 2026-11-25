#!/usr/bin/env bash
# Install the move-pane mod into the Herdr app, and optionally the pane-menu
# item and a key binding.
#
#   ./install.sh                         # just the mod (palette: "Move pane to space…")
#   ./install.sh --menu my-layout        # + right-click "Move to space…" in that layout
#   ./install.sh --key cmd-shift-m       # + key binding in keys.json
#
# Herdr must be running for --menu (it clones the shipped menu mod).
set -euo pipefail

HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="${HERDR_APP:-herdr-app}"
LAYOUT="" KEY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --menu) LAYOUT="${2:?--menu needs a layout name}"; shift 2 ;;
    --key) KEY="${2:?--key needs a key, e.g. cmd-shift-m}"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

command -v "$APP" >/dev/null || { echo "herdr-app not found (set HERDR_APP=/path/to/herdr-app)" >&2; exit 1; }
[ -d "$HOME_DIR/mods" ] || { echo "no Herdr app home at $HOME_DIR (start Herdr once)" >&2; exit 1; }

if "$APP" commands | grep -q '"pane.move"'; then
  echo "note: this Herdr has a native pane.move; you may not need this mod."
fi

# 1. The mod.
mkdir -p "$HOME_DIR/mods/move-pane"
cp "$HERE/move-pane/mod.json" "$HERE/move-pane/main.js" "$HOME_DIR/mods/move-pane/"
"$APP" check "$HOME_DIR/mods/move-pane"
echo "installed: $HOME_DIR/mods/move-pane"

# 2. Pane menu: clone Herdr's menu as my-menu, patch it, point the layout at it.
if [ -n "$LAYOUT" ]; then
  case "$LAYOUT" in
    main|terminals|win98)
      echo "'$LAYOUT' is a shipped layout (read-only). Clone it first, then rerun with --menu my-layout:" >&2
      echo "  $APP do layout.clone '{\"name\":\"$LAYOUT\",\"as\":\"my-layout\"}'" >&2
      exit 1 ;;
  esac
  LFILE="$HOME_DIR/layouts/$LAYOUT.json"
  [ -f "$LFILE" ] || { echo "no layout $LFILE" >&2; exit 1; }
  if [ ! -d "$HOME_DIR/mods/my-menu" ]; then
    "$APP" do mod.clone '{"name":"menu","as":"my-menu"}' >/dev/null
    for _ in $(seq 20); do [ -f "$HOME_DIR/mods/my-menu/main.js" ] && break; sleep 0.25; done
  fi
  python3 "$HERE/menu-patch/apply.py" "$HOME_DIR/mods/my-menu/main.js"
  "$APP" check "$HOME_DIR/mods/my-menu"
  python3 - "$LFILE" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
old = d.get("terminal_menu")
if old and old != "my-menu":
    sys.exit(f"{p} already uses terminal_menu '{old}'; add the item to that mod instead (see README)")
if old != "my-menu":
    d["terminal_menu"] = "my-menu"
    with open(p, "w") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write("\n")
print("terminal_menu = my-menu in", p)
PY
fi

# 3. Key binding.
if [ -n "$KEY" ]; then
  python3 - "$HOME_DIR/keys.json" "$KEY" <<'PY'
import json, sys
p, key = sys.argv[1], sys.argv[2]
d = json.load(open(p))
g = d.setdefault("global", {})
if g.get(key) not in (None, "mod.open:move-pane"):
    sys.exit(f"{key} is already bound to {g[key]!r}; pick another key")
if g.get(key) is None:
    g[key] = "mod.open:move-pane"
    with open(p, "w") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("note: keys.json is now hand-edited; Herdr won't add new default shortcuts to it on update.")
print(f"{key} -> mod.open:move-pane in {p}")
PY
fi

sleep 1
for f in "$HOME_DIR"/*.error "$HOME_DIR"/layouts/*.error; do
  [ -e "$f" ] && { echo "Herdr reported an error in $f:" >&2; cat "$f" >&2; exit 1; }
done
echo "done."
