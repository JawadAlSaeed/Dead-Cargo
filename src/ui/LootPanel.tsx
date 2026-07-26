// Tarkov-style loot window: the container's own grid next to your inventory.
// First search reveals items one by one; drag either way, double-click a
// container item to quick-take it.

import { useCallback, useEffect, useState } from "react";
import { InventoryItem, useInventory } from "../state/useInventory";
import { GridSide, useGameStore } from "../state/useGameStore";
import { Cell, canPlace } from "../game/grid";
import { combineTargetAt } from "../game/crafting";
import { DragGhost, GridView, useDragController } from "./GridView";

const REVEAL_MS = 550;

export function LootPanel() {
  const lootTarget = useGameStore((s) => s.lootTarget);
  const containers = useGameStore((s) => s.containers);
  const transferItem = useGameStore((s) => s.transferItem);
  const craftItems = useGameStore((s) => s.craftItems);
  const closeLoot = useGameStore((s) => s.closeLoot);
  const useItem = useGameStore((s) => s.useItem);
  const equippedItemId = useGameStore((s) => s.equippedItemId);
  const ship = useGameStore((s) => s.ship);
  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const gridSize = useInventory((s) => s.gridSize);
  const invItems = useInventory((s) => s.items);

  const objectId = lootTarget?.objectId ?? "";
  const container = containers[objectId];
  const containerLabel =
    ship?.rooms[currentRoomId]?.objects.find((o) => o.id === objectId)?.type ?? "container";

  // Staggered reveal on first search only.
  const [revealed, setRevealed] = useState(0);
  const totalItems = container?.items.length ?? 0;
  useEffect(() => {
    if (!lootTarget) return;
    if (!lootTarget.firstOpen) {
      setRevealed(totalItems);
      return;
    }
    setRevealed(0);
    if (totalItems === 0) return;
    const timer = setInterval(() => {
      setRevealed((n) => {
        if (n + 1 >= totalItems) clearInterval(timer);
        return n + 1;
      });
    }, REVEAL_MS);
    return () => clearInterval(timer);
  }, [objectId]);

  const onClickItem = useCallback(() => {}, []);
  const { drag, mouse, grab, endDrag } = useDragController(onClickItem);

  if (!lootTarget || !container) return null;
  const searching = lootTarget.firstOpen && revealed < totalItems;

  const gridOf = (side: GridSide) =>
    side === "inventory"
      ? { grid: useInventory.getState().gridSize, items: useInventory.getState().items }
      : {
          grid: useGameStore.getState().containers[side].gridSize,
          items: useGameStore.getState().containers[side].items
        };

  const canDropAt = (side: GridSide, x: number, y: number) => {
    if (!drag) return false;
    const g = gridOf(side);
    const ignoreId = drag.source === side ? drag.item.id : undefined;
    return canPlace(drag.item.shape, drag.rotation, x, y, g.grid, g.items, ignoreId);
  };

  const onDropAt = (side: GridSide, x: number, y: number) => {
    if (!drag) return;
    transferItem(drag.source, side, drag.item.id, { x, y, rotation: drag.rotation });
    endDrag();
  };

  // Crafting works here too, including straight out of the container — most
  // combining happens while a crate is open, since that is where items arrive.
  const findCombineTarget = (cell: Cell) => combineTargetAt(drag?.item ?? null, invItems, cell);

  const onCombine = (target: InventoryItem) => {
    if (drag) craftItems(drag.source, drag.item.id, target.id);
    endDrag();
  };

  const quickTake = (item: InventoryItem) => {
    if (searching) return;
    transferItem(objectId, "inventory", item.id);
  };

  const takeAll = () => {
    for (const item of [...container.items]) {
      if (!transferItem(objectId, "inventory", item.id)) break;
    }
  };

  return (
    <div className="inv-overlay">
      <div className="loot-panels">
        <div className="inv-panel">
          <div className="inv-header">
            <span>{containerLabel.toUpperCase()}</span>
            <span className="inv-hint">{searching ? "Searching…" : `${container.items.length} item(s)`}</span>
          </div>
          <GridView
            side={objectId}
            gridSize={container.gridSize}
            items={container.items}
            drag={drag}
            grab={grab}
            onDropAt={onDropAt}
            canDropAt={canDropAt}
            onDoubleClickItem={quickTake}
            visibleCount={revealed}
          />
          <div className="inv-actions">
            <button className="btn" onClick={takeAll} disabled={searching || totalItems === 0}>
              Take All
            </button>
            <button className="btn btn-small" onClick={closeLoot}>
              Close (F)
            </button>
          </div>
        </div>

        <div className="inv-panel">
          <div className="inv-header">
            <span>
              INVENTORY — {gridSize.width}×{gridSize.height}
            </span>
          </div>
          <GridView
            side="inventory"
            gridSize={gridSize}
            items={invItems}
            drag={drag}
            grab={grab}
            onDropAt={onDropAt}
            canDropAt={canDropAt}
            onDoubleClickItem={(item) => useItem(item.id)}
            equippedItemId={equippedItemId}
            combineTargetAt={findCombineTarget}
            onCombine={onCombine}
          />
          <div className="inv-actions">
            <span className="inv-hint">
              Drag between grids · drop onto an item to combine · R rotates · double-click
              takes / uses
            </span>
          </div>
        </div>
      </div>
      <DragGhost drag={drag} mouse={mouse} />
    </div>
  );
}
