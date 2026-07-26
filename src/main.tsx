import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { world } from "./game/world";
import { useGameStore } from "./state/useGameStore";
import { useInventory } from "./state/useInventory";
import { useAudio } from "./state/useAudio";

// Dev/debug handle for poking at live state from the console. Reach the stores
// through this rather than importing them: in dev, Vite serves a changed module
// under a fresh URL, so a separate import can hand you a second store instance
// that the running game is not using.
(window as any).__game = { world, useGameStore, useInventory, useAudio };

// Dev/debug: save what the canvas currently shows to .screenshots/<name>.jpg.
// The scene renders even when the browser isn't compositing frames, so this
// works in situations where an external screenshot tool captures nothing.
// Paired with the screenshot endpoint in vite.config.ts.
if (import.meta.env.DEV) {
  (window as any).__shot = async (name = "shot", width = 900, quality = 0.6) => {
    const source = document.querySelector("canvas");
    if (!source) throw new Error("no canvas to capture");
    const scaled = document.createElement("canvas");
    scaled.width = width;
    scaled.height = Math.round(source.height * (width / source.width));
    scaled.getContext("2d")!.drawImage(source, 0, 0, scaled.width, scaled.height);
    const data = scaled.toDataURL("image/jpeg", quality).split(",")[1];
    const res = await fetch("/__shot", { method: "POST", body: `${name}\n${data}` });
    return res.text();
  };
}

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
