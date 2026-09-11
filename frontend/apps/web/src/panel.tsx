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
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${css}</style><div id="app"></div>`;
    this.root = createRoot(shadow.querySelector("#app")!);
    this.render();
  }

  private render() {
    if (this.root && this.conn) this.root.render(<App conn={this.conn} />);
  }
}

customElements.define("lightwick-panel", LightwickPanel);
