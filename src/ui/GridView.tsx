// Shared grid renderer + drag controller for the inventory and loot windows.
// Items render as their actual cell shapes (Tetris-style). Drag to move
// between/within grids, R rotates the held item, click selects.

import { useEffect, useRef, useState } from "react";
import { Cell, absCells, rotateCells, shapeBounds } from "../game/grid";
import { InventoryItem } from "../state/useInventory";
import { GridSide } from "../state/useGameStore";

export const CELL_PX = 46;

export const TYPE_COLORS: Record<string, string> = {
  weapon: "#7c4a2d",
  healing: "#2d6b3c",
  ammo: "#6b632d",
  key: "#8a7420",
  upgrade: "#4a3d75",
  trap: "#8a4a20",
  misc: "#44484f"
};

export interface DragState {
  item: InventoryItem;
  source: GridSide;
  rotation: number;
  grabOffset: Cell; // grabbed cell within the rotated shape
}

interface PendingGrab {
  item: InventoryItem;
  side: GridSide;
  startX: number;
  startY: number;
  cellOffset: Cell;
}

export function useDragController(onClickItem: (item: InventoryItem, side: GridSide) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const pending = useRef<PendingGrab | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
      const p = pending.current;
      if (p && !dragRef.current && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 6) {
        setDrag({
          item: p.item,
          source: p.side,
          rotation: p.item.rotation,
          grabOffset: p.cellOffset
        });
      }
    };
    // Grid mouseup handlers run first (bubbling) and perform the drop; this
    // window-level handler settles clicks and clears any leftover drag.
    const up = () => {
      const p = pending.current;
      if (p && !dragRef.current) onClickItem(p.item, p.side);
      pending.current = null;
      setDrag(null);
    };
    const keyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyR" && dragRef.current) {
        e.preventDefault();
        setDrag((d) =>
          d ? { ...d, rotation: (d.rotation + 1) % 4, grabOffset: { x: 0, y: 0 } } : d
        );
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("keydown", keyDown);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("keydown", keyDown);
    };
  }, [onClickItem]);

  const grab = (item: InventoryItem, side: GridSide, e: React.MouseEvent, cellOffset: Cell) => {
    if (e.button !== 0) return;
    pending.current = { item, side, startX: e.clientX, startY: e.clientY, cellOffset };
  };

  const endDrag = () => {
    pending.current = null;
    setDrag(null);
  };

  return { drag, mouse, grab, endDrag };
}

/** Ghost of the held item following the cursor. Render once at panel level. */
export function DragGhost({ drag, mouse }: { drag: DragState | null; mouse: { x: number; y: number } }) {
  if (!drag) return null;
  const cells = rotateCells(drag.item.shape, drag.rotation);
  return (
    <div
      className="drag-ghost"
      style={{
        left: mouse.x - (drag.grabOffset.x + 0.5) * CELL_PX,
        top: mouse.y - (drag.grabOffset.y + 0.5) * CELL_PX
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className="drag-ghost-cell"
          style={{
            left: c.x * CELL_PX,
            top: c.y * CELL_PX,
            width: CELL_PX,
            height: CELL_PX,
            background: TYPE_COLORS[drag.item.type] ?? TYPE_COLORS.misc
          }}
        />
      ))}
    </div>
  );
}

interface GridViewProps {
  side: GridSide;
  gridSize: { width: number; height: number };
  items: InventoryItem[];
  drag: DragState | null;
  grab: (item: InventoryItem, side: GridSide, e: React.MouseEvent, cellOffset: Cell) => void;
  onDropAt: (side: GridSide, x: number, y: number) => void;
  canDropAt: (side: GridSide, x: number, y: number) => boolean;
  onDoubleClickItem?: (item: InventoryItem) => void;
  selectedId?: string | null;
  equippedItemId?: string | null;
  /** When set, only the first N items are visible (search reveal). */
  visibleCount?: number;
  /**
   * The item the held one would combine with if dropped on this cell, if any.
   * Omitted by grids that don't support crafting (the loot windows), which is
   * what keeps combining an inventory-only action.
   */
  combineTargetAt?: (cell: Cell) => InventoryItem | null;
  onCombine?: (target: InventoryItem) => void;
}

export function GridView({
  side,
  gridSize,
  items,
  drag,
  grab,
  onDropAt,
  canDropAt,
  onDoubleClickItem,
  selectedId,
  equippedItemId,
  visibleCount,
  combineTargetAt,
  onCombine
}: GridViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Cell | null>(null);

  const cellFromEvent = (e: React.MouseEvent): Cell | null => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return null;
    const x = Math.floor((e.clientX - r.left) / CELL_PX);
    const y = Math.floor((e.clientY - r.top) / CELL_PX);
    if (x < 0 || y < 0 || x >= gridSize.width || y >= gridSize.height) return null;
    return { x, y };
  };

  const dropTarget = (c: Cell): Cell =>
    drag ? { x: c.x - drag.grabOffset.x, y: c.y - drag.grabOffset.y } : c;

  const shown = visibleCount === undefined ? items : items.slice(0, visibleCount);

  return (
    <div
      ref={ref}
      className="grid-view"
      style={{ width: gridSize.width * CELL_PX, height: gridSize.height * CELL_PX }}
      onMouseMove={(e) => setHover(cellFromEvent(e))}
      onMouseLeave={() => setHover(null)}
      onMouseUp={(e) => {
        if (!drag) return;
        const c = cellFromEvent(e);
        if (!c) return;
        // Combining is keyed off the cell actually under the cursor, not the
        // held shape's origin — you point at what you want to combine with.
        const combine = combineTargetAt?.(c);
        if (combine && onCombine) {
          onCombine(combine);
          return;
        }
        const t = dropTarget(c);
        onDropAt(side, t.x, t.y);
      }}
    >
      {Array.from({ length: gridSize.width * gridSize.height }, (_, i) => (
        <div
          key={i}
          className="grid-cell"
          style={{
            left: (i % gridSize.width) * CELL_PX,
            top: Math.floor(i / gridSize.width) * CELL_PX,
            width: CELL_PX,
            height: CELL_PX
          }}
        />
      ))}

      {shown.map((item) => {
        const cells = absCells(item);
        const rot = rotateCells(item.shape, item.rotation);
        const bounds = shapeBounds(rot);
        const beingDragged = drag?.item.id === item.id && drag.source === side;
        const color = TYPE_COLORS[item.type] ?? TYPE_COLORS.misc;
        const cls = [
          "grid-item",
          item.id === selectedId ? "selected" : "",
          item.id === equippedItemId ? "equipped" : "",
          beingDragged ? "dragging" : ""
        ].join(" ");
        return (
          <div key={item.id} className={cls}>
            {cells.map((c, i) => (
              <div
                key={i}
                className="grid-item-cell"
                style={{
                  left: c.x * CELL_PX + 1,
                  top: c.y * CELL_PX + 1,
                  width: CELL_PX - 2,
                  height: CELL_PX - 2,
                  background: color
                }}
                onMouseDown={(e) =>
                  grab(item, side, e, {
                    x: c.x - item.position.x,
                    y: c.y - item.position.y
                  })
                }
                onDoubleClick={() => onDoubleClickItem?.(item)}
              />
            ))}
            <div
              className="grid-item-label"
              style={{
                left: item.position.x * CELL_PX,
                top: item.position.y * CELL_PX,
                width: bounds.width * CELL_PX,
                height: bounds.height * CELL_PX
              }}
            >
              <span>{item.name}</span>
              {item.type === "ammo" && <em>×{item.properties.ammoCount}</em>}
              {item.id === equippedItemId && <em>equipped</em>}
            </div>
          </div>
        );
      })}

      {drag && hover && (() => {
        // Over a valid combine target, highlight that item instead of previewing
        // a drop — the shape would not fit there anyway, and a red "no" would
        // hide the fact that something better is on offer.
        const combine = combineTargetAt?.(hover);
        if (combine) {
          return absCells(combine).map((c, i) => (
            <div
              key={`combine-${i}`}
              className="grid-drop-preview"
              style={{
                left: c.x * CELL_PX,
                top: c.y * CELL_PX,
                width: CELL_PX,
                height: CELL_PX,
                background: "rgba(235, 170, 45, 0.55)"
              }}
            />
          ));
        }
        const t = dropTarget(hover);
        const ok = canDropAt(side, t.x, t.y);
        return rotateCells(drag.item.shape, drag.rotation).map((c, i) => (
          <div
            key={`ghost-${i}`}
            className="grid-drop-preview"
            style={{
              left: (t.x + c.x) * CELL_PX,
              top: (t.y + c.y) * CELL_PX,
              width: CELL_PX,
              height: CELL_PX,
              background: ok ? "rgba(80, 200, 110, 0.35)" : "rgba(220, 70, 60, 0.35)"
            }}
          />
        ));
      })()}
    </div>
  );
}
