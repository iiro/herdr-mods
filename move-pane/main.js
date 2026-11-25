// Move the focused pane's terminal to another space, keeping its program running.
// Herdr has no pane.move yet, so this chains three app commands:
//   terminal.park  (its pane goes, the terminal keeps running in herdr-core)
//   space.select   (show the target space)
//   terminal.keep  (give the running terminal a pane: a new tab in the shown space)
// Opened from the palette: "Move pane to space…". Type to filter, ↑/↓, Enter, Esc.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, panes, focused, run, theme, props, closeOverlay, notify } from "herdr";

export default class MovePane extends View {
  init(_props, cx) {
    // From the pane menu: props().target {pane, terminal}; from the palette or a key: the focused pane.
    const tg = props()?.target;
    const f = focused();
    const pane = panes().find((p) => p.pane === (tg?.pane ?? f?.pane));
    const sp = pane && spaces().find((s) => s.tabs.some((x) => x.id === pane.tab));
    this.src = pane && pane.terminal ? { pane: pane.pane, terminal: pane.terminal, space: sp?.id, tab: pane.tab } : null;
    const all = spaces();
    const from = all.find((s) => s.id === this.src?.space);
    this.fromName = from?.name ?? "?";
    this.machine = from?.machine ?? null;
    this.filter = "";
    this.at = 0;
    this.busy = null;
    this.input = InputState.new({ placeholder: "Move to space…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.at = 0; cx.notify(); });
    this.input.on("submit", (_e, cx) => this.go(this.targets()[this.at], cx));
    this.input.focus();
    cx.timer.after(400, () => this.input.focus());
  }

  close() { closeOverlay(props().overlay); }

  targets() {
    if (!this.src) return [];
    const f = this.filter.toLowerCase();
    // terminal.keep can only place a terminal on its own machine.
    return spaces().filter((s) => s.id !== this.src.space && (s.machine ?? null) === this.machine && (!f || s.name.toLowerCase().includes(f)));
  }

  go(target, cx) {
    if (!target || this.busy) return;
    const t = this.src.terminal;
    this.busy = target.name;
    cx.notify();
    run("terminal.park", { terminal: t });
    // park is acknowledged as pending; wait until the pane is really gone.
    let tries = 0;
    const step = () => {
      const stillShown = panes().some((p) => p.terminal === t);
      if (stillShown && tries++ < 40) return cx.timer.after(125, step);
      if (stillShown) {
        notify({ title: "Move pane", body: "The pane didn't let go of " + t + "; nothing moved.", level: "error" });
        return this.close();
      }
      run("space.select", { id: target.id });
      run("terminal.keep", { terminal: t, place: "tab" });
      this.close();
    };
    cx.timer.after(125, step);
  }

  render() {
    const t = theme();
    const list = this.targets();
    if (this.at >= list.length) this.at = Math.max(0, list.length - 1);
    const head = this.src
      ? `Move ${this.src.terminal} from ${this.fromName} to…`
      : "Focus a terminal pane first";
    const row = (s, i) =>
      h_flex().id("mp-" + s.id).mx(4).px(10).h(32).items_center().rounded(7).gap(10).cursor_pointer()
        .when(i === this.at, (el) => el.bg(t.hover))
        .hover((st) => st.bg(t.hover))
        .on_click((_e, cx) => this.go(s, cx))
        .child(div().flex_1().truncate().text_color(t.foreground).child(s.name))
        .child(div().text_size(11).text_color(t.dim).child(s.tabs.length + (s.tabs.length === 1 ? " tab" : " tabs")));
    return v_flex()
      .id("move-pane").w_full().min_h(0).p(18).gap(10).bg(t.popover).text_size(13)
      .on_key_down((e, cx) => {
        const n = list.length;
        if (e.key === "escape") return this.close();
        if (e.key === "down" && n) this.at = (this.at + 1) % n;
        else if (e.key === "up" && n) this.at = (this.at + n - 1) % n;
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(div().text_size(15).font_semibold().text_color(t.foreground).child(this.busy ? `Moving to ${this.busy}…` : head))
      .when(!!this.src && !this.busy, (el) => el
        .child(h_flex().h(36).flex_none().px(10).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
          .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground)))
        .child(list.length
          ? v_flex().id("mp-list").gap(2).children(list.map(row))
          : div().px(10).text_color(t.dim).child("No other space on this machine.")));
  }
}
