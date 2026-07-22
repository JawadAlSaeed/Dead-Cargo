// Inventory window (Tab). Drag items to rearrange (R rotates while held),
// click to select, double-click to use/equip.

import { useCallback, useState } from "react";
import { InventoryItem, useInventory } from "../state/useInventory";
import { GridSide, useGameStore } from "../state/useGameStore";
import { canPlace } from "../game/grid";
import { DragGhost, GridView, useDragController } from "./GridView";

export function InventoryPanel() {
  const gridSize = useInventory((s) => s.gridSize);
  const items = useInventory((s) => s.items);
  const useItem = useGameStore((s) => s.useItem);
  const dropItem = useGameStore((s) => s.dropItem);
  const transferItem = useGameStore((s) => s.transferItem);
  const equippedItemId = useGameStore((s) => s.equippedItemId);
  const setInventoryOpen = useGameStore((s) => s.setInventoryOpen);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const onClickItem = useCallback((item: InventoryItem) => {
    setSelectedId((cur) => (cur === item.id ? null : item.id));
  }, []);

  const { drag, mouse, grab, endDrag } = useDragController(onClickItem);

  const canDropAt = (_side: GridSide, x: number, y: number) => {
    if (!drag) return false;
    const inv = useInventory.getState();
    return canPlace(drag.item.shape, drag.rotation, x, y, inv.gridSize, inv.items, drag.item.id);
  };

  const onDropAt = (_side: GridSide, x: number, y: number) => {
    if (!drag) return;
    transferItem("inventory", "inventory", drag.item.id, { x, y, rotation: drag.rotation });
    endDrag();
  };

  const rotateSelected = () => {
    if (!selected) return;
    transferItem("inventory", "inventory", selected.id, {
      x: selected.position.x,
      y: selected.position.y,
      rotation: (selected.rotation + 1) % 4
    });
  };

  return (
    <div className="inv-overlay">
      <div className="inv-panel">
        <div className="inv-header">
          <span>
            INVENTORY — {gridSize.width}×{gridSize.height}
          </span>
          <button className="btn btn-small" onClick={() => setInventoryOpen(false)}>
            Close (Tab)
          </button>
        </div>

        <GridView
          side="inventory"
          gridSize={gridSize}
          items={items}
          drag={drag}
          grab={grab}
          onDropAt={onDropAt}
          canDropAt={canDropAt}
          onDoubleClickItem={(item) => useItem(item.id)}
          selectedId={selectedId}
          equippedItemId={equippedItemId}
        />

        <div className="inv-actions">
          {selected ? (
            <>
              <button className="btn" onClick={() => useItem(selected.id)}>
                {selected.type === "weapon" ? "Equip" : "Use"}
              </button>
              <button className="btn" onClick={rotateSelected}>
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
            <span className="inv-hint">
              Drag to move · R rotates while holding · double-click to use
            </span>
          )}
        </div>
      </div>
      <DragGhost drag={drag} mouse={mouse} />
    </div>
  );
}
