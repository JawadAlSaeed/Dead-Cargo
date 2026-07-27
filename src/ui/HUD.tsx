// In-game overlay: health, ammo, location, transient messages, control hints.

import { useEffect, useRef, useState } from "react";
import { isUiOpen, useGameStore } from "../state/useGameStore";
import { useInventory } from "../state/useInventory";
import { useAudio } from "../state/useAudio";
import { world } from "../game/world";

/**
 * Reticle that tracks the cursor, driven straight from world.ts on a rAF loop
 * — avoids putting per-frame pointer/shot state into React so the HUD doesn't
 * re-render at 60fps. Aiming is always on, so this is always visible during
 * play; it only hides while an inventory/loot panel is up.
 */
function Crosshair() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const now = performance.now();
        const hitFlash = now - world.lastHitConfirmedAt < 140;
        const shotFlash = now - world.lastShotAt < 90;
        const hidden = isUiOpen(useGameStore.getState());
        const { x, y } = world.mouseScreen;
        el.style.opacity = hidden ? "0" : "0.8";
        el.style.transform =
          `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${shotFlash ? 1.35 : 1})`;
        el.style.setProperty("--crosshair-color", hitFlash ? "#ff3b3b" : "#f2efe4");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} className="crosshair" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/** How long the damage arc stays up after a hit. */
const DAMAGE_ARC_MS = 1100;

/**
 * Sneak indicator. Held-key modes need to be visible or you lose track of which
 * one you are in — and here that costs you half your speed without telling you.
 */
function SneakBadge() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const on = world.sneaking && !isUiOpen(useGameStore.getState());
        el.style.opacity = on ? "1" : "0";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={ref} className="sneak-badge" aria-hidden="true">
      SNEAKING
    </div>
  );
}

/**
 * Arc at the screen edge pointing at whatever just hit you.
 *
 * With zombies invisible outside the view cone, damage otherwise arrives from
 * nowhere with no way to learn which way to turn — which is unfair rather than
 * frightening. Driven from the same rAF loop style as the crosshair so it costs
 * no React re-renders.
 */
function DamageArc() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let shownAt = -1;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const { angle, at } = world.lastHit;
        const age = performance.now() - at;
        if (at !== shownAt || age < DAMAGE_ARC_MS) {
          shownAt = at;
          const live = at > 0 && age < DAMAGE_ARC_MS && !isUiOpen(useGameStore.getState());
          el.style.opacity = live ? String(1 - age / DAMAGE_ARC_MS) : "0";
          // World bearing 0 is +z, which the camera shows as screen-down; the
          // marker is drawn pointing up, so screen angle is 180 - bearing.
          el.style.transform = `rotate(${180 - (angle * 180) / Math.PI}deg)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} className="damage-arc" aria-hidden="true">
      <span />
    </div>
  );
}

export function HUD() {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const ammoLoaded = useGameStore((s) => s.ammoLoaded);
  const equippedItemId = useGameStore((s) => s.equippedItemId);
  const message = useGameStore((s) => s.message);
  const ship = useGameStore((s) => s.ship);
  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const muted = useAudio((s) => s.muted);
  const weapon = useInventory((s) => s.items.find((i) => i.id === equippedItemId));

  // Re-render on a timer only while a message is fading.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!message) return;
    const t = setInterval(() => forceTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [message]);
  const messageVisible = message && performance.now() - message.at < 4000;

  const ammoReserve = useInventory((s) =>
    s.items
      .filter((i) => i.type === "ammo" && i.properties.ammoType === weapon?.properties.ammoType)
      .reduce((sum, i) => sum + (i.properties.ammoCount ?? 0), 0)
  );

  const healthPct = (health / maxHealth) * 100;
  const healthColor = healthPct > 60 ? "#3ecf5a" : healthPct > 30 ? "#e0b83a" : "#e04a3a";
  const currentRoom = ship?.rooms[currentRoomId];
  const roomLabel = currentRoom ? `Deck ${currentRoom.floor + 1} — ${currentRoom.label}` : "";
  const vignetteIntensity = Math.max(0, (50 - healthPct) / 50);
  const critical = healthPct <= 25;

  return (
    <div className="hud">
      {vignetteIntensity > 0 && (
        <div
          className={`vignette ${critical ? "vignette-critical" : ""}`}
          style={{ opacity: Math.min(0.7, vignetteIntensity) }}
        />
      )}
      <Crosshair />
      <DamageArc />
      <SneakBadge />

      <div className="hud-top">
        <div className="hud-room">{roomLabel}</div>
        {muted && <div className="hud-muted">MUTED (M)</div>}
      </div>

      {messageVisible && <div className="hud-message">{message.text}</div>}

      <div className="hud-bottom">
        <div className="hud-health">
          <div className="hud-label">HEALTH</div>
          <div className="hud-health-bar">
            <div
              className="hud-health-fill"
              style={{ width: `${healthPct}%`, background: healthColor }}
            />
          </div>
        </div>
        <div className="hud-ammo">
          <div className="hud-label">{weapon ? weapon.name.toUpperCase() : "UNARMED"}</div>
          <div className="hud-ammo-count">
            {!weapon ? "—" : weapon.properties.melee ? "MELEE" : `${ammoLoaded} / ${ammoReserve}`}
          </div>
        </div>
        <div className="hud-hints">
          WASD move · Shift sneak · LMB attack · F search · R reload · Tab inventory
        </div>
      </div>
    </div>
  );
}
