#!/usr/bin/env python3
"""Add "Move to space…" to a cloned Herdr menu mod (pane right-click menu).

Usage: apply.py <path to cloned menu main.js>
Edits the file in place. Exits non-zero, changing nothing, if an anchor is
missing (Herdr changed its menu). Running it twice is safe.
"""
import sys

ITEM_ANCHOR = '        ...(inTab ? [["Close pane", "pane.close", { pane: tg.pane }]] : []),'
ITEM = ('        // herdr-mods: move this pane to another space, still running.\n'
        '        ...(inTab && term ? [["Move to space…", "move-pane", { pane: tg.pane, terminal: term.address }]] : []),\n')
RUN_ANCHOR = '    else run(it[1], it[2]);'
RUN = ('    else if (it[1] === "move-pane") openOverlay({ mod: "move-pane", kind: "popup", at: "top", width: 520, height: 0.6, props: { target: it[2] } });\n')


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    src = open(path, encoding="utf-8").read()
    if '"move-pane"' in src:
        print("already patched:", path)
        return
    for anchor in (ITEM_ANCHOR, RUN_ANCHOR):
        if src.count(anchor) != 1:
            sys.exit("anchor not found exactly once; Herdr's menu has changed, patch by hand (see README):\n  " + anchor.strip())
    src = src.replace(ITEM_ANCHOR, ITEM + ITEM_ANCHOR).replace(RUN_ANCHOR, RUN + RUN_ANCHOR)
    open(path, "w", encoding="utf-8").write(src)
    print("patched:", path)


main()
