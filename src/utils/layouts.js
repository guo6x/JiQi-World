import * as THREE from 'three';

export const getSphereLayout = (count, radius = 10) => {
  const positions = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
    const r = Math.sqrt(1 - y * y); // radius at y
    const theta = phi * i; // golden angle increment

    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    positions.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return positions;
};

export const getHelixLayout = (count, radius = 4, spacing = 1.5) => {
  const positions = [];
  
  for (let i = 0; i < count; i++) {
    const pairIndex = Math.floor(i / 2);
    const isStrandA = i % 2 === 0;

    // Vertical Helix: Height is Y axis
    const y = (pairIndex - count / 4) * spacing;
    
    // Twist factor
    const t = pairIndex * 0.5; 
    
    // Spine curve (Gentle vertical sway)
    const spineX = Math.sin(y * 0.15) * 3; 
    const spineZ = Math.cos(y * 0.15) * 2;
    
    // Double Helix logic
    const angle = t + (isStrandA ? 0 : Math.PI);
    
    const x = spineX + Math.cos(angle) * radius;
    const z = spineZ + Math.sin(angle) * radius;
    
    positions.push(new THREE.Vector3(x, y, z));
  }
  return positions;
};

// Helper to get connecting line pairs
export const getHelixLines = (count) => {
    const lines = [];
    
    // 1. Rungs (Base Pairs): Connect i and i+1
    for (let i = 0; i < count - 1; i += 2) {
        lines.push({ start: i, end: i + 1, type: 'rung' });
    }

    // 2. Backbone: Connect i and i+2
    for (let i = 0; i < count - 2; i++) {
        lines.push({ start: i, end: i + 2, type: 'backbone' });
    }

    return lines;
};
