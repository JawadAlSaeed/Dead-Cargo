import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { world } from "./game/world";
import { useGameStore } from "./state/useGameStore";
import { useInventory } from "./state/useInventory";

// Dev/debug handle for poking at live state from the console.
(window as any).__game = { world, useGameStore, useInventory };

// With ?headless, drive animation frames from timers so the game loop keeps
// running when the window isn't compositing (used for automated testing).
if (new URLSearchParams(location.search).has("headless")) {
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 16);
  window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  // ResizeObserver callbacks are only delivered while frames render, so R3F's
  // canvas measurement never fires when hidden — report sizes via timers too.
  window.ResizeObserver = class {
    private cb: ResizeObserverCallback;
    private timers = new Map<Element, number>();
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(el: Element) {
      const fire = () => {
        const r = el.getBoundingClientRect();
        this.cb(
          [{ target: el, contentRect: r } as ResizeObserverEntry],
          this as unknown as ResizeObserver
        );
      };
      fire();
      this.timers.set(el, window.setInterval(fire, 500));
    }
    unobserve(el: Element) {
      const t = this.timers.get(el);
      if (t) window.clearInterval(t);
      this.timers.delete(el);
    }
    disconnect() {
      for (const t of this.timers.values()) window.clearInterval(t);
      this.timers.clear();
    }
  } as unknown as typeof ResizeObserver;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
