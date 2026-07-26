// Inventory window (Tab). Drag items to rearrange (R rotates while held),
// click to select, double-click to use/equip.

import { useCallback, useState } from "react";
import { InventoryItem, useInventory } from "../state/useInventory";
import { GridSide, useGameStore } from "../state/useGameStore";
import { Cell, absCells, canPlace } from "../game/grid";
import { combinesWith, findRecipe } from "../game/crafting";
import { DragGhost, GridView, useDragController } from "./GridView";

export function InventoryPanel() {
  const gridSize = useInventory((s) => s.gridSize);
  const items = useInventory((s) => s.items);
  const useItem = useGameStore((s) => s.useItem);
  const dropItem = useGameStore((s) => s.dropItem);
  const transferItem = useGameStore((s) => s.transferItem);
  const craftItems = useGameStore((s) => s.craftItems);
  const equippedItemId = useGameStore((s) => s.equippedItemId);
  const setInventoryOpen = useGameStore((s) => s.setInventoryOpen);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const selectedRecipes = selected ? combinesWith(selected.name) : [];

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

  /** The item under `cell`, if dropping the held one on it would craft. */
  const combineTargetAt = (cell: Cell): InventoryItem | null => {
    if (!drag) return null;
    const under = items.find(
      (i) => i.id !== drag.item.id && absCells(i).some((c) => c.x === cell.x && c.y === cell.y)
    );
    if (!under || !findRecipe(drag.item.name, under.name)) return null;
    return under;
  };

  const onCombine = (target: InventoryItem) => {
    if (drag) craftItems(drag.item.id, target.id);
    setSelectedId(null);
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
          combineTargetAt={combineTargetAt}
          onCombine={onCombine}
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
              {/* Recipes are discoverable from the item itself — nothing to
                  memorise and no separate crafting screen to go and read. */}
              {selectedRecipes.length > 0 && (
                <span className="inv-recipes">
                  {selectedRecipes.map((r) => (
                    <em key={r}>{r}</em>
                  ))}
                </span>
              )}
            </>
          ) : (
            <span className="inv-hint">
              Drag to move · drag onto another item to combine · R rotates while holding ·
              double-click to use
            </span>
          )}
        </div>
      </div>
      <DragGhost drag={drag} mouse={mouse} />
    </div>
  );
}
