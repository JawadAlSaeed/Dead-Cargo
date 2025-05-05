import { useState, useRef } from "react";
import { useInventory } from "../../lib/stores/useInventory";
import InventoryItem from "./InventoryItem";
import { cn } from "../../lib/utils";

interface InventoryGridProps {
  gridSize: { width: number; height: number };
  items: Array<{
    id: string;
    name: string;
    type: string;
    size: { width: number; height: number };
    position: { x: number; y: number };
    rotated: boolean;
    image: string;
  }>;
}

const InventoryGrid = ({ gridSize, items }: InventoryGridProps) => {
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const { moveItem, rotateItem, removeItem, useItem } = useInventory();
  
  // Generate grid cells
  const gridCells = [];
  for (let y = 0; y < gridSize.height; y++) {
    for (let x = 0; x < gridSize.width; x++) {
      gridCells.push({ x, y });
    }
  }
  
  // Handle starting to drag an item
  const handleDragStart = (itemId: string, e: React.MouseEvent) => {
    // Start dragging this item
    setDraggingItem(itemId);
    
    // Get item position
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Calculate offset within the item where the drag started
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    // Initial ghost position
    setGhostPosition({
      x: item.position.x,
      y: item.position.y
    });
  };
  
  // Handle dragging over the grid
  const handleGridMouseMove = (e: React.MouseEvent) => {
    if (!draggingItem || !gridRef.current) return;
    
    // Get grid rect
    const gridRect = gridRef.current.getBoundingClientRect();
    
    // Calculate cell size
    const cellWidth = gridRect.width / gridSize.width;
    const cellHeight = gridRect.height / gridSize.height;
    
    // Calculate grid position from mouse position
    const x = Math.floor((e.clientX - gridRect.left - dragOffset.x) / cellWidth);
    const y = Math.floor((e.clientY - gridRect.top - dragOffset.y) / cellHeight);
    
    // Update ghost position
    setGhostPosition({ x, y });
  };
  
  // Handle dropping an item
  const handleGridMouseUp = () => {
    if (!draggingItem) return;
    
    // Get item
    const item = items.find(i => i.id === draggingItem);
    if (!item) return;
    
    // Check if new position is valid
    const isValidPosition = checkValidPosition(item, ghostPosition.x, ghostPosition.y);
    
    if (isValidPosition) {
      // Move item to new position
      moveItem(draggingItem, ghostPosition.x, ghostPosition.y);
    }
    
    // End dragging
    setDraggingItem(null);
  };
  
  // Handle rotating an item
  const handleRotate = (itemId: string) => {
    rotateItem(itemId);
  };
  
  // Handle using an item
  const handleUseItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    useItem(itemId);
  };
  
  // Check if a position is valid for an item
  const checkValidPosition = (item: any, x: number, y: number) => {
    if (x < 0 || y < 0) return false;
    
    const width = item.rotated ? item.size.height : item.size.width;
    const height = item.rotated ? item.size.width : item.size.height;
    
    // Check if item is within grid bounds
    if (x + width > gridSize.width || y + height > gridSize.height) return false;
    
    // Check for overlap with other items
    for (let i = 0; i < items.length; i++) {
      const otherItem = items[i];
      if (otherItem.id === item.id) continue;
      
      const otherWidth = otherItem.rotated ? otherItem.size.height : otherItem.size.width;
      const otherHeight = otherItem.rotated ? otherItem.size.width : otherItem.size.height;
      
      // Check for overlap
      const overlap = !(
        x + width <= otherItem.position.x ||
        y + height <= otherItem.position.y ||
        x >= otherItem.position.x + otherWidth ||
        y >= otherItem.position.y + otherHeight
      );
      
      if (overlap) return false;
    }
    
    return true;
  };
  
  return (
    <div
      ref={gridRef}
      className="border border-gray-700 bg-gray-800 rounded grid relative"
      style={{
        gridTemplateColumns: `repeat(${gridSize.width}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize.height}, 1fr)`,
        height: `${gridSize.height * 50}px`,
        width: '100%',
      }}
      onMouseMove={handleGridMouseMove}
      onMouseUp={handleGridMouseUp}
      onMouseLeave={handleGridMouseUp}
    >
      {/* Grid cells background */}
      {gridCells.map((cell, index) => (
        <div
          key={`cell-${index}`}
          className="border border-gray-700 bg-gray-900"
          style={{
            gridRow: `${cell.y + 1} / span 1`,
            gridColumn: `${cell.x + 1} / span 1`,
          }}
        />
      ))}
      
      {/* Render items */}
      {items.map(item => (
        <InventoryItem
          key={item.id}
          item={item}
          isDragging={draggingItem === item.id}
          ghostPosition={draggingItem === item.id ? ghostPosition : undefined}
          onDragStart={handleDragStart}
          onRotate={handleRotate}
          onUse={handleUseItem}
        />
      ))}
    </div>
  );
};

export default InventoryGrid;
