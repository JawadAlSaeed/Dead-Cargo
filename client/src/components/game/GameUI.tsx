import { useEffect, useState } from "react";
import HealthBar from "./HealthBar";
import Inventory from "./Inventory";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useInventory } from "../../lib/stores/useInventory";
import { useRooms } from "../../lib/stores/useRooms";
import { cn } from "../../lib/utils";

const GameUI = () => {
  const { currentRoom, rooms } = useRooms();
  const [showControls, setShowControls] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string, message: string, time: number }[]>([]);
  
  // Get current room info for display
  const roomInfo = currentRoom && rooms[currentRoom] 
    ? `${rooms[currentRoom].type === "captainCabin" ? "Captain's Cabin" : "Room"} ${currentRoom.substring(0, 5)}`
    : "Unknown Room";
  
  // Add notification system
  const addNotification = (message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, time: 3000 }]);
    
    // Auto-remove notification after time expires
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };
  
  // Watch for player actions that should trigger notifications
  useEffect(() => {
    const unsubscribePlayer = usePlayer.subscribe(
      state => state.health,
      (health, prevHealth) => {
        if (health < prevHealth) {
          addNotification("You were attacked by a zombie!");
        }
      }
    );
    
    const unsubscribeInventory = useInventory.subscribe(
      state => state.items.length,
      (itemCount, prevItemCount) => {
        if (itemCount > prevItemCount) {
          addNotification("Item added to inventory!");
        }
      }
    );
    
    const unsubscribeRoom = useRooms.subscribe(
      state => state.currentRoom,
      () => {
        addNotification(`Entered ${roomInfo}`);
      }
    );
    
    return () => {
      unsubscribePlayer();
      unsubscribeInventory();
      unsubscribeRoom();
    };
  }, [roomInfo]);
  
  // Tick down notification timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => 
        prev.map(n => ({ ...n, time: n.time - 100 }))
          .filter(n => n.time > 0)
      );
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <>
      {/* Health Bar UI */}
      <HealthBar />
      
      {/* Inventory UI (will be hidden until toggled) */}
      <Inventory />
      
      {/* Room Info */}
      <div className="fixed top-4 right-4 bg-gray-900 bg-opacity-80 rounded px-3 py-1 text-white">
        <div className="text-sm font-bold">{roomInfo}</div>
      </div>
      
      {/* Controls Help */}
      <div className="fixed bottom-4 right-4">
        <button 
          className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
          onClick={() => setShowControls(prev => !prev)}
        >
          {showControls ? "Hide Controls" : "Show Controls"}
        </button>
        
        {showControls && (
          <div className="absolute right-0 bottom-10 bg-gray-900 border border-gray-700 rounded p-3 w-64 text-white text-sm">
            <h3 className="font-bold mb-2">Controls:</h3>
            <ul className="space-y-1">
              <li>Move: WASD or Arrow Keys</li>
              <li>Attack: Space</li>
              <li>Interact: E</li>
              <li>Inventory: I or Tab</li>
              <li>Reload Weapon: R</li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Notifications */}
      <div className="fixed bottom-4 left-4 w-64 space-y-2">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={cn(
              "bg-gray-900 border-l-4 border-blue-500 text-white px-3 py-2 rounded",
              "transition-opacity duration-300",
              notification.time < 500 ? "opacity-0" : "opacity-100"
            )}
          >
            {notification.message}
          </div>
        ))}
      </div>
    </>
  );
};

export default GameUI;
