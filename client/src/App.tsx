import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import { useGame } from "./lib/stores/useGame";
import MenuScreen from "./components/game/MenuScreen";
import GameOverScreen from "./components/game/GameOverScreen";
import WinScreen from "./components/game/WinScreen";
import GameUI from "./components/game/GameUI";
import CruiseShip from "./components/game/CruiseShip";
import "@fontsource/inter";

// Define control keys for the game
const controls = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "leftward", keys: ["KeyA", "ArrowLeft"] },
  { name: "rightward", keys: ["KeyD", "ArrowRight"] },
  { name: "interact", keys: ["KeyE"] },
  { name: "inventory", keys: ["Tab"] }, // Inventory only uses Tab key now
  { name: "attack", keys: ["Space"] },
  { name: "reload", keys: ["KeyR"] },
];

// Main App component
function App() {
  const { phase } = useGame();
  const [showCanvas, setShowCanvas] = useState(false);
  
  // Initialize audio (preloading sound assets)
  useEffect(() => {
    const backgroundMusic = new Audio("/sounds/background.mp3");
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;
    
    const hitSound = new Audio("/sounds/hit.mp3");
    const successSound = new Audio("/sounds/success.mp3");
    
    const audioStore = useAudio.getState();
    audioStore.setBackgroundMusic(backgroundMusic);
    audioStore.setHitSound(hitSound);
    audioStore.setSuccessSound(successSound);
    
    setShowCanvas(true);
    
    return () => {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <KeyboardControls map={controls}>
          {phase === 'ready' && <MenuScreen />}
          
          {phase === 'playing' && (
            <>
              <Canvas
                shadows
                orthographic
                camera={{
                  position: [0, 20, 0],
                  zoom: 40,
                  up: [0, 0, 1],
                  near: 0.1,
                  far: 1000
                }}
                gl={{
                  antialias: true,
                  alpha: false,
                  depth: true,
                }}
                style={{ 
                  background: "#111111",
                  width: "100%",
                  height: "100vh"
                }}
              >
                <color attach="background" args={["#111111"]} />
                <ambientLight intensity={1.5} />
                <directionalLight 
                  position={[0, 10, 0]} 
                  intensity={2.0} 
                  castShadow 
                />
                <axesHelper scale={5} position={[0, 0.1, 0]} />
                
                <Suspense fallback={null}>
                  <CruiseShip />
                </Suspense>
                
                {/* Debug grid */}
                <gridHelper 
                  args={[100, 100, "#555555", "#333333"]}
                  position={[0, 0.01, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                />
              </Canvas>
              <GameUI />
            </>
          )}
          
          {phase === 'ended' && <GameOverScreen />}
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
