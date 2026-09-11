import { createRoot, type Root } from "react-dom/client";
import type { Connection } from "@lightwick/core";
import { App } from "./App";
import css from "./app.css?inline";

// HA custom panel: HA sets `hass` on this element and keeps it updated.
class LightwickPanel extends HTMLElement {
  private root?: Root;
  private conn?: Connection;

  set hass(hass: { connection: Connection }) {
    if (this.conn === hass.connection) return;
    this.conn = hass.connection;
    this.render();
  }

  connectedCallback() {
    // HA may set `hass` before this class is defined; that leaves an own property shadowing the setter.
    if (Object.prototype.hasOwnProperty.call(this, "hass")) {
      const early = (this as unknown as { hass: { connection: Connection } }).hass;
      delete (this as unknown as { hass?: unknown }).hass;
      this.hass = early;
    }
    if (this.shadowRoot) return;
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>:host{display:block;height:100%}${css}</style><div id="app" style="height:100%"></div>`;
    this.root = createRoot(shadow.querySelector("#app")!);
    this.render();
  }

  private render() {
    if (this.root && this.conn) {
      this.root.render(<App conn={this.conn} onMenu={() => this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }))} />);
    }
  }
}

customElements.define("lightwick-panel", LightwickPanel);
