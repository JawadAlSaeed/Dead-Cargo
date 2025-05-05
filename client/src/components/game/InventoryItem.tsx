import { cn } from "../../lib/utils";

interface ItemProps {
  item: {
    id: string;
    name: string;
    type: string;
    size: { width: number; height: number };
    position: { x: number; y: number };
    rotated: boolean;
    image: string;
  };
  isDragging: boolean;
  ghostPosition?: { x: number; y: number };
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onRotate: (id: string) => void;
  onUse: (id: string) => void;
}

const InventoryItem = ({ 
  item, 
  isDragging, 
  ghostPosition, 
  onDragStart, 
  onRotate,
  onUse
}: ItemProps) => {
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(item.id, e);
  };
  
  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRotate(item.id);
  };
  
  const handleUse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUse(item.id);
  };
  
  // Get item position for display
  const displayPosition = isDragging && ghostPosition 
    ? ghostPosition 
    : item.position;
  
  // Get item size (taking rotation into account)
  const width = item.rotated ? item.size.height : item.size.width;
  const height = item.rotated ? item.size.width : item.size.height;
  
  // Get item color based on type
  let itemColor = "bg-gray-600";
  if (item.type === "weapon") itemColor = "bg-red-700";
  if (item.type === "healing") itemColor = "bg-green-700";
  if (item.type === "ammo") itemColor = "bg-yellow-700";
  if (item.type === "key") itemColor = "bg-blue-700";
  
  return (
    <div
      className={cn(
        "absolute flex items-center justify-center cursor-move rounded border-2 transition-colors",
        itemColor,
        isDragging ? "border-white opacity-70" : "border-gray-600"
      )}
      style={{
        left: `${displayPosition.x * 100 / 6}%`,
        top: `${displayPosition.y * 100 / 8}%`,
        width: `${width * 100 / 6}%`,
        height: `${height * 100 / 8}%`,
        zIndex: isDragging ? 10 : 1,
      }}
      onMouseDown={handleDragStart}
      onDoubleClick={handleUse}
    >
      <div className="flex flex-col items-center justify-center h-full w-full p-1">
        <div className="text-xs font-bold text-white text-center truncate w-full">
          {item.name}
        </div>
        
        {/* Item icon or representation */}
        <div className="flex-1 flex items-center justify-center">
          {item.type === "weapon" && <i className="fas fa-gun text-white"></i>}
          {item.type === "healing" && <i className="fas fa-medkit text-white"></i>}
          {item.type === "ammo" && <i className="fas fa-bullseye text-white"></i>}
          {item.type === "key" && <i className="fas fa-key text-white"></i>}
        </div>
        
        {/* Rotate button */}
        <button
          className="absolute bottom-0 right-0 w-5 h-5 bg-gray-800 text-white rounded-tl flex items-center justify-center text-xs"
          onClick={handleRotate}
        >
          <i className="fas fa-rotate"></i>
        </button>
      </div>
    </div>
  );
};

export default InventoryItem;
