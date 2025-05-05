import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, OrbitControls } from '@react-three/drei';
import { useAudio } from './lib/stores/useAudio';
import { useGame } from './lib/stores/useGame';
import MenuScreen from './components/game/MenuScreen';
import GameOverScreen from './components/game/GameOverScreen';
import WinScreen from './components/game/WinScreen';
import GameUI from './components/game/GameUI';
import CruiseShipNew from './components/game/CruiseShipNew';
import ProcGenRooms from './components/game/ProcGenRooms';
import CollisionSystem from './components/game/CollisionSystem';

// Define control keys for the game
const controls = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "leftward", keys: ["KeyA", "ArrowLeft"] },
  { name: "rightward", keys: ["KeyD", "ArrowRight"] },
  { name: "interact", keys: ["KeyE"] },
  { name: "inventory", keys: ["Tab"] },
  { name: "attack", keys: ["Space"] },
  { name: "reload", keys: ["KeyR"] },
];

// Main App component
export default function FullGame() {
  const { phase } = useGame();
  const [showCanvas, setShowCanvas] = useState(false);
  
  // Initialize audio
  useEffect(() => {
    const backgroundMusic = new Audio("/sounds/background.mp3");
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;
    
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
                style={{ background: '#111' }}
                camera={{ 
                  position: [0, 15, 0],
                  fov: 50,
                  near: 0.1,
                  far: 1000
                }}
              >
                {/* Room generator (logic only) */}
                <ProcGenRooms />
                
                {/* Collision detection (logic only) */}
                <CollisionSystem />
                
                {/* Lighting */}
                <ambientLight intensity={0.7} />
                <pointLight position={[0, 10, 0]} intensity={1} castShadow />
                
                {/* Debug grid */}
                <gridHelper args={[50, 50]} position={[0, 0.02, 0]} />
                
                {/* Game world */}
                <Suspense fallback={null}>
                  <CruiseShipNew />
                </Suspense>
                
                {/* Debug controls - remove in production */}
                <OrbitControls />
              </Canvas>
              
              <GameUI />
              
              {/* Debug Panel */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '5px',
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '12px',
                maxWidth: '250px'
              }}>
                <h3 style={{ margin: '0 0 5px 0' }}>DEBUG MODE</h3>
                <p>- Use WASD to move</p>
                <p>- Press E to interact</p>
                <p>- Press Space to attack</p>
                <p>- Press Tab for inventory</p>
                <p>- Mouse drag to move camera</p>
              </div>
            </>
          )}
          
          {phase === 'ended' && <GameOverScreen />}
        </KeyboardControls>
      )}
    </div>
  );
}