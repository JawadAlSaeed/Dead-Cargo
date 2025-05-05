import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Simple Player Component
function Player() {
  const playerRef = useRef<THREE.Mesh>(null);
  
  // Simple animation
  useFrame(({ clock }) => {
    if (playerRef.current) {
      playerRef.current.position.y = Math.sin(clock.getElapsedTime()) * 0.2 + 0.5;
    }
  });
  
  return (
    <group>
      {/* Player body */}
      <mesh ref={playerRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="blue" />
      </mesh>
      
      {/* Direction indicator */}
      <mesh position={[0, 0.5, 0.8]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="cyan" />
      </mesh>
    </group>
  );
}

// Simple Room Component
function Room() {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#335577" />
      </mesh>
      
      {/* Walls */}
      <mesh position={[0, 1, 10]}>
        <boxGeometry args={[20, 2, 1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 1, -10]}>
        <boxGeometry args={[20, 2, 1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[10, 1, 0]}>
        <boxGeometry args={[1, 2, 20]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[-10, 1, 0]}>
        <boxGeometry args={[1, 2, 20]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Objects */}
      <mesh position={[3, 0.5, 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      <mesh position={[-3, 0.5, 4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      <mesh position={[5, 0.5, -2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      
      {/* Door */}
      <mesh position={[0, 1, 9.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 2, 0.5]} />
        <meshStandardMaterial color="#00aa00" />
      </mesh>
    </group>
  );
}

// Simple Zombie Component
function Zombie({ position }: { position: [number, number, number] }) {
  const zombieRef = useRef<THREE.Mesh>(null);
  
  // Simple animation
  useFrame(({ clock }) => {
    if (zombieRef.current) {
      zombieRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.5;
    }
  });
  
  return (
    <mesh ref={zombieRef} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}

// Simple Game UI
function GameUI() {
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      padding: '10px',
      background: 'rgba(0,0,0,0.7)',
      borderRadius: '5px',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ marginBottom: '10px' }}>Health: 100</div>
      <div>Ammo: 12</div>
    </div>
  );
}

// Main Game Component
export default function SimpleGame() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        style={{ background: '#111' }}
        camera={{ position: [0, 10, 0], fov: 60 }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 8, 0]} intensity={1} castShadow />
        
        {/* Game Elements */}
        <Room />
        <Player />
        <Zombie position={[5, 0.5, 5]} />
        <Zombie position={[-4, 0.5, -3]} />
        <Zombie position={[2, 0.5, -6]} />
        
        {/* Debug Grid */}
        <gridHelper args={[20, 20]} rotation={[0, 0, 0]} />
        
        {/* Camera Controls */}
        <OrbitControls />
      </Canvas>
      
      {/* UI Overlay */}
      <GameUI />
      
      {/* Instructions */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        padding: '10px',
        background: 'rgba(0,0,0,0.7)',
        borderRadius: '5px',
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>Dead Cargo - Simple Demo</h1>
        <p style={{ margin: '0', fontSize: '14px' }}>
          Blue box: Player • Red boxes: Zombies • Brown boxes: Objects
        </p>
      </div>
    </div>
  );
}