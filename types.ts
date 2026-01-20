
export type Vector3 = [number, number, number];

export interface Voxel {
  x: number;
  y: number;
  z: number;
  id: string;
  color?: string;
}

export interface GridState {
  top: boolean[][];
  front: boolean[][];
  side: boolean[][];
}

export type ViewMode = '3d-edit' | '2d-blueprint';

export interface Stats {
  count: number;
  surfaceArea: number;
  volume: number;
}

// Quiz Mode Types
export type QuizState = 'playing' | 'correct' | 'incorrect' | 'revealed';

export interface QuizData {
  voxels: Voxel[];
  correctAnswer: number; // Block count
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}
