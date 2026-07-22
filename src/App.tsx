import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useGameStore } from "./state/useGameStore";
import { useAudio } from "./state/useAudio";
import { GameScene } from "./scene/GameScene";
import { HUD } from "./ui/HUD";
import { InventoryPanel } from "./ui/InventoryPanel";
import { LootPanel } from "./ui/LootPanel";
import { DeadScreen, MenuScreen, WonScreen } from "./ui/Screens";
import "./styles.css";

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const inventoryOpen = useGameStore((s) => s.inventoryOpen);

  // App-level keys: Tab toggles inventory, F/Esc close the loot window, M mutes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useGameStore.getState();
      if (e.code === "Tab") {
        e.preventDefault();
        if (store.lootTarget) store.closeLoot();
        else if (store.phase === "playing") store.setInventoryOpen(!store.inventoryOpen);
      }
      if (e.code === "Escape") {
        if (store.lootTarget) store.closeLoot();
        else if (store.inventoryOpen) store.setInventoryOpen(false);
      }
      if (e.code === "KeyM") useAudio.getState().toggleMuted();
    };
    const noContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", noContextMenu);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("contextmenu", noContextMenu);
    };
  }, []);

  return (
    <div className="app">
      {phase === "menu" && <MenuScreen />}
      {phase === "dead" && <DeadScreen />}
      {phase === "won" && <WonScreen />}
      {phase === "playing" && (
        <>
          <Canvas camera={{ position: [0, 13, 7.5], fov: 55 }} shadows>
            <GameScene />
          </Canvas>
          <HUD />
          {inventoryOpen && <InventoryPanel />}
          <LootPanel />
        </>
      )}
    </div>
  );
}
