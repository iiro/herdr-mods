# herdr-mods

Mods for the Herdr desktop app.

## move-pane: move a terminal pane to another space

Herdr can't move a pane between spaces (as of app 0.1.18). This mod can, and **the program keeps running through the move** (same process; nothing restarts).

- **Right-click a terminal → Move to space…** (optional pane-menu item)
- **⌘⇧M** (optional key binding), or **Command palette → Move pane to space…**

Pick a space and the pane appears there as a new tab. Type to filter, ↑/↓ and Enter, Esc to cancel.

### Install

Herdr must be running.

```sh
git clone https://github.com/iiro/herdr-mods && cd herdr-mods
./install.sh                                   # the mod + palette entry
./install.sh --menu <your-layout> --key cmd-shift-m   # + right-click item and key
```

`--menu` needs **your own** layout. Herdr's shipped layouts (`main`, `terminals`, `win98`) are read-only, so clone one first and switch to it: `herdr-app do layout.clone '{"name":"main","as":"my-layout"}'`. Running the installer again is safe.

### How it works

There is no `pane.move` command, so the mod chains three that exist:

1. `terminal.park`: the pane goes away; herdr-core keeps the terminal running.
2. `space.select`: show the target space.
3. `terminal.keep {place: "tab"}`: give the running terminal a pane there.

It waits until the park has really happened before step 3. Changing a terminal's `herdr.space` label with `hc label` does **not** move a terminal that is already shown.

The right-click item comes from `my-menu`, a clone of Herdr's own `menu` mod (made on your machine with `mod.clone`) with one item added by `menu-patch/apply.py`. The layout's `"terminal_menu": "my-menu"` makes Herdr use it. This repo doesn't ship Herdr's menu code, only the patch.

### Limits

- It always lands as a new tab; it can't drop into an existing tab's split.
- Only spaces on the same machine are offered (`terminal.keep` can't cross machines).
- Moving the last pane of a tab closes that tab; moving the last tab of a space closes the space.
- The window switches to the target space.

### After Herdr updates

Herdr updates itself and keeps these files, but they don't get upstream changes:

- `mods/move-pane/`: drop it once Herdr has a native pane move.
- `mods/my-menu/`: your copy of the menu. If Herdr adds pane-menu items you want, delete `mods/my-menu` and rerun `./install.sh --menu <layout>` to re-clone and re-patch.
- `keys.json`: once hand-edited, Herdr no longer adds new default shortcuts to it.

### Uninstall

Remove `~/.config/herdr-app/mods/move-pane` and `mods/my-menu`, delete `"terminal_menu"` from your layout, and remove the key from `keys.json`.

## For agents (Claude Code, Codex, …)

A user may hand you this repo URL and ask you to set it up. Do this:

1. Check Herdr: `herdr-app --version`, and `herdr-app commands` must list `terminal.park`, `terminal.keep` and `space.select`. If it lists a native `pane.move`, tell the user and stop.
2. Read `~/.config/herdr-app/AGENTS.md` (and `AGENTS.local.md` if present). Herdr app mods are JavaScript in `~/.config/herdr-app/mods/`. A "herdr-mods" skill describing Luau/Sheprd mods may not match this app; trust `AGENTS.md`.
3. Find the active layout: `herdr-app status` → `layout`. If it's a shipped one, ask the user before cloning it, since cloning switches the window to the clone.
4. Ask the user before touching `keys.json`. Suggest `cmd-shift-m` and explain that a hand-edited `keys.json` stops receiving new default shortcuts.
5. Run `./install.sh --menu <layout> [--key <key>]`. It must end with `done.`. A `WARN … stranded script tasks` line from `herdr-app check` is harmless.
6. If `apply.py` says an anchor wasn't found, Herdr's menu changed. Add the same two things by hand to `mods/my-menu/main.js`: a `["Move to space…", "move-pane", { pane, terminal }]` item in the pane menu, and a handler that runs `openOverlay({ mod: "move-pane", kind: "popup", at: "top", width: 520, height: 0.6, props: { target: { pane, terminal } } })`. Then run `herdr-app check`.
7. Test only on a throwaway terminal. Start one with `hc run --bg --json --name move-test --no-parent --label herdr.space=<id from herdr-app ls> -- sleep 900`, then focus it with `herdr-app do pane.focus '{"terminal":"<addr>"}'`. Ask the user to move it, since you can't click in the window. Check with `herdr-app ls` and `hc get <addr>` (same pid), then `hc kill` and `hc rm` it.
8. Add the "After Herdr updates" list above to `~/.config/herdr-app/AGENTS.local.md`.

## License

MIT
