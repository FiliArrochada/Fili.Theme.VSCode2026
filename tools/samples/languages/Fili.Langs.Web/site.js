'use strict';
// Loads the order grid and refreshes it every minute.
import { OrderGrid } from './orders.js';

const REFRESH_MS = 60_000;
let timer = null;

/**
 * Renders a grid into an element.
 * @param {HTMLElement} host where to render
 */
export function render(host, grid = new OrderGrid()) {
  const rows = grid.lines.map((line, i) => `<tr data-i="${i}">${line.sku}</tr>`);
  host.innerHTML = rows.join('') || '<tr><td>none</td></tr>';
  return rows.length;
}

class Poller extends EventTarget {
  #busy = false;

  start(host) {
    timer = setInterval(async () => {
      if (this.#busy) return;
      this.#busy = true;
      try { console.log(render(host), typeof host, undefined); }
      catch (e) { console.error(e.message); }
      finally { this.#busy = false; }
    }, REFRESH_MS);
  }
}

window.poller = new Poller();
