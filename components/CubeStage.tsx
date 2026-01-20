import React, { useState } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Edges } from '@react-three/drei';
import { Voxel, ViewMode } from '../types';
import { GRID_SIZE, COLORS } from '../constants';

// Augment JSX.IntrinsicElements to include React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      group: any;
      mesh: any;
      boxGeometry: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      color: any;
      gridHelper: any;
      [elemName: string]: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      group: any;
      mesh: any;
      boxGeometry: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      color: any;
      gridHelper: any;
      [elemName: string]: any;
    }
  }
}

// Simple Error Boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("CubeStage Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface CubeStageProps {
  voxels: Voxel[];
  mode: ViewMode;
  onAddVoxel: (x: number, y: number, z: number) => void;
  onRemoveVoxel: (id: string) => void;
  showXRay: boolean;
  selectedColor: string;
}

interface VoxelMeshProps {
  data: Voxel;
  onRemove?: (id: string) => void;
  onAdd?: (x: number, y: number, z: number) => void;
  isGhost?: boolean;
  showXRay: boolean;
  defaultColor: string;
}

const VoxelMesh: React.FC<VoxelMeshProps> = ({ 
  data, 
  onRemove, 
  onAdd,
  isGhost, 
  showXRay,
  defaultColor
}) => {
  const [hovered, setHover] = useState(false);

  // Position offset to center cubes on integer coordinates
  const position: [number, number, number] = [
    data.x - Math.floor(GRID_SIZE / 2),
    data.y + 0.5,
    data.z - Math.floor(GRID_SIZE / 2)
  ];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isGhost) return;
    e.stopPropagation();
    if (e.delta > 10) return; // Ignore drag

    // Handle Adding (Stacking) - relies on face normal
    if (onAdd && e.face) {
        const nx = Math.round(e.face.normal.x);
        const ny = Math.round(e.face.normal.y);
        const nz = Math.round(e.face.normal.z);
        onAdd(data.x + nx, data.y + ny, data.z + nz);
    }

    // Handle Removing
    if (onRemove) {
        onRemove(data.id);
    }
  };

  const isTransparent = showXRay || isGhost;

  return (
    <mesh
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      castShadow={!isTransparent}
      receiveShadow={!isTransparent}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        key={`${isTransparent}`} // Force material recreation when transparency changes
        color={data.color || defaultColor}
        transparent={isTransparent}
        opacity={isTransparent ? 0.3 : 1}
        depthWrite={!isTransparent} 
        roughness={0.5}
        metalness={0.1}
      />
      <Edges 
        color={hovered && !isGhost ? "white" : COLORS.voxelOutline} 
        threshold={15} 
        linewidth={2} 
        visible={true} 
      />
    </mesh>
  );
};

interface VoxelListProps {
  voxels: Voxel[];
  mode: ViewMode;
  onAddVoxel: (x: number, y: number, z: number) => void;
  onRemoveVoxel: (id: string) => void;
  showXRay: boolean;
  selectedColor: string;
}

// Component to render the list of voxels
const VoxelLayer: React.FC<VoxelListProps> = ({
  voxels, mode, onAddVoxel, onRemoveVoxel, showXRay, selectedColor
}) => {
  return (
    <group position={[0, -0.5, 0]}>
      {voxels.map((v) => (
        <VoxelMesh 
          key={v.id} 
          data={v} 
          onRemove={onRemoveVoxel}
          onAdd={onAddVoxel}
          showXRay={showXRay}
          isGhost={mode === '2d-blueprint'}
          defaultColor={selectedColor} // For ghosts or fallbacks
        />
      ))}
    </group>
  );
};

interface PlaneSelectorProps {
  onAdd: (x: number, y: number, z: number) => void;
}

const PlaneSelector: React.FC<PlaneSelectorProps> = ({ onAdd }) => {
  const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x + GRID_SIZE / 2);
    const z = Math.floor(e.point.z + GRID_SIZE / 2);
    
    if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
        setHoverPos([x, 0, z]);
    } else {
        setHoverPos(null);
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 10) return; // Ignore drag
    const x = Math.floor(e.point.x + GRID_SIZE / 2);
    const z = Math.floor(e.point.z + GRID_SIZE / 2);
    
    if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
      onAdd(x, 0, z);
    }
  };

  return (
    <group>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        visible={false} 
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshBasicMaterial />
      </mesh>

      {hoverPos && (
         <mesh 
            position={[hoverPos[0] - Math.floor(GRID_SIZE / 2), 0.02, hoverPos[2] - Math.floor(GRID_SIZE / 2)]} 
            rotation={[-Math.PI / 2, 0, 0]}
         >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={COLORS.primary} transparent opacity={0.4} />
         </mesh>
      )}
    </group>
  );
}

const Environment: React.FC<{ mode: ViewMode, onAddVoxel: (x: number, y: number, z: number) => void }> = ({ mode, onAddVoxel }) => {
  return (
      <>
        <color attach="background" args={[COLORS.background]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-bias={-0.0001} />
        
        <group position={[0, -0.5, 0]}>
            <Grid 
                infiniteGrid 
                fadeDistance={30} 
                sectionColor={COLORS.gridLine} 
                cellColor={COLORS.gridLine}
                sectionSize={1}
                cellSize={1}
                position={[0, -0.01, 0]} 
            />

            <group position={[0, 0, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                    <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
                    <meshBasicMaterial color={COLORS.primary} transparent opacity={0.05} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
                    <meshBasicMaterial transparent opacity={0} />
                    <Edges color={COLORS.primary} linewidth={2} />
                </mesh>
                <gridHelper 
                    args={[GRID_SIZE, GRID_SIZE, COLORS.gridLine, COLORS.gridLine]} 
                    position={[0, 0.005, 0]} 
                />
            </group>
            
            {mode === '3d-edit' && (
                <PlaneSelector onAdd={onAddVoxel} />
            )}
        </group>

        <OrbitControls makeDefault enableDamping />
      </>
  );
};

export const CubeStage: React.FC<CubeStageProps> = (props) => {
  return (
    <Canvas shadows camera={{ position: [8, 8, 8], fov: 45 }}>
        <Environment mode={props.mode} onAddVoxel={props.onAddVoxel} />
        <ErrorBoundary fallback={null}>
           <VoxelLayer {...props} />
        </ErrorBoundary>
    </Canvas>
  );
};