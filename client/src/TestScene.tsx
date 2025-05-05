import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// This is a completely standalone test scene to verify Three.js is working
export default function TestScene() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        style={{ background: '#111' }}
      >
        {/* Basic lighting */}
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Basic test objects */}
        {/* Red box */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
        
        {/* Blue box */}
        <mesh position={[2, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        
        {/* Green box */}
        <mesh position={[0, 0, 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="green" />
        </mesh>
        
        {/* Yellow box */}
        <mesh position={[2, 0, 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="yellow" />
        </mesh>
        
        {/* Floor */}
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="gray" />
        </mesh>
        
        {/* Camera controls */}
        <OrbitControls />
      </Canvas>
      
      {/* UI overlay */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        color: 'white',
        background: 'rgba(0,0,0,0.5)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          Basic Three.js Test Scene
        </h1>
        <p style={{ margin: '10px 0 0 0' }}>
          You should see colored boxes if Three.js is working properly
        </p>
      </div>
    </div>
  );
}