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
                  position: [0, 10, 0],
                  zoom: 20,
                  up: [0, 0, 1],
                  near: 0.1,
                  far: 1000,
                }}
                gl={{
                  antialias: true,
                }}
                style={{ 
                  background: "#222222",
                  height: "100vh",
                  width: "100vw",
                }}
                flat
                legacy
              >
                {/* Debug Elements */}
                <color attach="background" args={["#222222"]} />
                <ambientLight intensity={1.5} />
                <directionalLight 
                  position={[0, 10, 0]} 
                  intensity={1.0} 
                  castShadow 
                />
                
                {/* Debug objects */}
                <mesh position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
                  <planeGeometry args={[20, 20]} />
                  <meshBasicMaterial color="#333333" />
                </mesh>
                
                <mesh position={[0, 1, 0]}>
                  <boxGeometry args={[5, 2, 5]} />
                  <meshStandardMaterial color="hotpink" />
                </mesh>
                
                <mesh position={[5, 1, 5]}>
                  <sphereGeometry args={[2, 32, 32]} />
                  <meshStandardMaterial color="cyan" />
                </mesh>
                
                {/* Game World */}
                <Suspense fallback={null}>
                  <CruiseShip />
                </Suspense>
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
