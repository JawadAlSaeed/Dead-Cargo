// Grid inventory panel (Tab). Click an item to select it, then use the action
// buttons, or click an empty cell to move the selected item there.

import { useState } from "react";
import { useInventory } from "../state/useInventory";
import { useGameStore } from "../state/useGameStore";

const CELL = 52;

const TYPE_COLORS: Record<string, string> = {
  weapon: "#7c4a2d",
  healing: "#2d6b3c",
  ammo: "#6b632d",
  key: "#8a7420",
  misc: "#44484f"
};

export function InventoryPanel() {
  const gridSize = useInventory((s) => s.gridSize);
  const items = useInventory((s) => s.items);
  const moveItem = useInventory((s) => s.moveItem);
  const rotateItem = useInventory((s) => s.rotateItem);
  const useItem = useGameStore((s) => s.useItem);
  const dropItem = useGameStore((s) => s.dropItem);
  const equippedItemId = useGameStore((s) => s.equippedItemId);
  const setInventoryOpen = useGameStore((s) => s.setInventoryOpen);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const cellClick = (x: number, y: number) => {
    if (selected) moveItem(selected.id, x, y);
  };

  return (
    <div className="inv-overlay">
      <div className="inv-panel">
        <div className="inv-header">
          <span>CARGO — INVENTORY</span>
          <button className="btn btn-small" onClick={() => setInventoryOpen(false)}>
            Close (Tab)
          </button>
        </div>

        <div
          className="inv-grid"
          style={{ width: gridSize.width * CELL, height: gridSize.height * CELL }}
        >
          {Array.from({ length: gridSize.width * gridSize.height }, (_, i) => {
            const x = i % gridSize.width;
            const y = Math.floor(i / gridSize.width);
            return (
              <div
                key={i}
                className="inv-cell"
                style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
                onClick={() => cellClick(x, y)}
              />
            );
          })}
          {items.map((item) => {
            const w = (item.rotated ? item.size.height : item.size.width) * CELL;
            const h = (item.rotated ? item.size.width : item.size.height) * CELL;
            return (
              <div
                key={item.id}
                className={`inv-item ${item.id === selectedId ? "selected" : ""} ${
                  item.id === equippedItemId ? "equipped" : ""
                }`}
                style={{
                  left: item.position.x * CELL + 2,
                  top: item.position.y * CELL + 2,
                  width: w - 4,
                  height: h - 4,
                  background: TYPE_COLORS[item.type] ?? TYPE_COLORS.misc
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(item.id === selectedId ? null : item.id);
                }}
              >
                <span>{item.name}</span>
                {item.type === "ammo" && <em>×{item.properties.ammoCount}</em>}
                {item.id === equippedItemId && <em>equipped</em>}
              </div>
            );
          })}
        </div>

        <div className="inv-actions">
          {selected ? (
            <>
              <button className="btn" onClick={() => useItem(selected.id)}>
                {selected.type === "weapon" ? "Equip" : "Use"}
              </button>
              <button className="btn" onClick={() => rotateItem(selected.id)}>
                Rotate
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  dropItem(selected.id);
                  setSelectedId(null);
                }}
              >
                Drop
              </button>
            </>
          ) : (
            <span className="inv-hint">Select an item, or click a free cell to move it.</span>
          )}
        </div>
      </div>
    </div>
  );
}
