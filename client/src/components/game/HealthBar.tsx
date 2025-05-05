import { usePlayer } from "../../lib/stores/usePlayer";
import { cn } from "../../lib/utils";

const HealthBar = () => {
  const { health, maxHealth } = usePlayer();
  
  // Calculate health percentage
  const healthPercentage = Math.max(0, (health / maxHealth) * 100);
  
  // Determine color based on health level
  let healthColor = "bg-green-600";
  if (healthPercentage < 30) {
    healthColor = "bg-red-600";
  } else if (healthPercentage < 60) {
    healthColor = "bg-yellow-600";
  }
  
  return (
    <div className="fixed top-4 left-4 w-64 z-10">
      <div className="flex items-center mb-1">
        <i className="fas fa-heart text-red-600 mr-2"></i>
        <span className="text-white font-bold text-sm">HEALTH</span>
        <span className="text-white text-sm ml-auto">{Math.floor(health)}/{maxHealth}</span>
      </div>
      <div className="w-full h-4 bg-gray-800 rounded-sm border border-gray-700">
        <div
          className={cn("h-full rounded-sm transition-all duration-300", healthColor)}
          style={{ width: `${healthPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default HealthBar;
