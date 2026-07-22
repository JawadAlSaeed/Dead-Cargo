// In-game overlay: health, ammo, location, transient messages, control hints.

import { useEffect, useState } from "react";
import { useGameStore } from "../state/useGameStore";
import { useInventory } from "../state/useInventory";
import { useAudio } from "../state/useAudio";

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

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-room">{ship?.rooms[currentRoomId]?.label ?? ""}</div>
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
            {weapon ? `${ammoLoaded} / ${ammoReserve}` : "—"}
          </div>
        </div>
        <div className="hud-hints">
          WASD move · RMB aim · LMB shoot · F search · R reload · Tab inventory
        </div>
      </div>
    </div>
  );
}
