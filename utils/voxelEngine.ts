import { GRID_SIZE, MAX_HEIGHT } from '../constants';
import { Voxel, GridState, Stats } from '../types';

/**
 * Converts a Voxel array to a Set of coordinate strings "x,y,z" for fast lookup
 */
export const getVoxelSet = (voxels: Voxel[]): Set<string> => {
  return new Set(voxels.map(v => `${v.x},${v.y},${v.z}`));
};

/**
 * Calculates stats: Count, Surface Area, Volume (Volume = Count for unit cubes)
 */
export const calculateStats = (voxels: Voxel[]): Stats => {
  const voxelSet = getVoxelSet(voxels);
  let surfaceArea = 0;

  voxels.forEach(v => {
    // Check 6 neighbors
    const neighbors = [
      { x: v.x + 1, y: v.y, z: v.z },
      { x: v.x - 1, y: v.y, z: v.z },
      { x: v.x, y: v.y + 1, z: v.z },
      { x: v.x, y: v.y - 1, z: v.z },
      { x: v.x, y: v.y, z: v.z + 1 },
      { x: v.x, y: v.y, z: v.z - 1 },
    ];

    neighbors.forEach(n => {
      if (!voxelSet.has(`${n.x},${n.y},${n.z}`)) {
        surfaceArea++;
      }
    });
  });

  // Calculate volume (count * 1^3)
  const count = voxels.length;

  return {
    count,
    volume: count,
    surfaceArea,
  };
};

/**
 * Generates 2D projections from the current 3D voxel state.
 * Returns boolean grids.
 */
export const project3DTo2D = (voxels: Voxel[]): GridState => {
  const top = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  const front = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  const side = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));

  voxels.forEach(v => {
    if (v.x >= 0 && v.x < GRID_SIZE && v.z >= 0 && v.z < GRID_SIZE) {
        top[v.z][v.x] = true; // Top view: Z is row, X is col
    }
    if (v.x >= 0 && v.x < GRID_SIZE && v.y >= 0 && v.y < MAX_HEIGHT) {
        front[MAX_HEIGHT - 1 - v.y][v.x] = true; // Front view: Y is inverted row, X is col
    }
    if (v.z >= 0 && v.z < GRID_SIZE && v.y >= 0 && v.y < MAX_HEIGHT) {
        side[MAX_HEIGHT - 1 - v.y][v.z] = true; // Side view (Right): Y is inverted row, Z is col (looking from right)
    }
  });

  return { top, front, side };
};

// Helper to find the first active column (Min X or Min Z) in a grid
const getFirstActiveColumn = (grid: boolean[][]): number => {
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c]) return c;
    }
  }
  return -1; // Empty
};

/**
 * Generates 3D voxels based on the intersection of 3 2D grids.
 * Algorithm: Max Fill with Smart Alignment.
 * It detects the start X/Z of each view and shifts them to align with the Top view.
 */
export const intersect2DTo3D = (grids: GridState): Voxel[] => {
  const newVoxels: Voxel[] = [];

  // 1. Analyze offsets for smart alignment
  // We align Front and Side views TO the Top view's position.
  
  // Top View: Row=Z, Col=X
  const minX_Top = getFirstActiveColumn(grids.top);
  // We also need MinZ for Top. MinZ corresponds to the first active ROW in Top view.
  let minZ_Top = -1;
  rowLoop: for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
          if (grids.top[r][c]) {
              minZ_Top = r;
              break rowLoop;
          }
      }
  }

  // Front View: Row=Y(inv), Col=X
  const minX_Front = getFirstActiveColumn(grids.front);
  
  // Side View: Row=Y(inv), Col=Z
  const minZ_Side = getFirstActiveColumn(grids.side);

  // Calculate shifts (If a grid is empty, shift is 0)
  const shiftX = (minX_Top !== -1 && minX_Front !== -1) ? (minX_Front - minX_Top) : 0;
  const shiftZ = (minZ_Top !== -1 && minZ_Side !== -1) ? (minZ_Side - minZ_Top) : 0;

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < MAX_HEIGHT; y++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        // Map 3D coords to 2D grid coords
        const hasTop = grids.top[z][x];
        
        // Apply Smart Alignment: Shift lookup index for Front and Side
        const frontX = x + shiftX;
        const sideZ = z + shiftZ;

        let hasFront = false;
        if (frontX >= 0 && frontX < GRID_SIZE) {
            hasFront = grids.front[MAX_HEIGHT - 1 - y][frontX];
        }

        let hasSide = false;
        if (sideZ >= 0 && sideZ < GRID_SIZE) {
            hasSide = grids.side[MAX_HEIGHT - 1 - y][sideZ];
        }

        if (hasTop && hasFront && hasSide) {
          newVoxels.push({
            x, y, z,
            id: `${x},${y},${z}`
          });
        }
      }
    }
  }

  return newVoxels;
};

/**
 * Generates a height map string for the Top View (used for learning aid)
 */
export const generateTopViewNumbers = (voxels: Voxel[]): (number | null)[][] => {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  
  voxels.forEach(v => {
     if (grid[v.z][v.x] < v.y + 1) {
       grid[v.z][v.x] = v.y + 1;
     }
  });

  return grid.map(row => row.map(val => val === 0 ? null : val));
}

/**
 * Generates depth numbers for Front View (Count along Z axis for each X,Y)
 */
export const generateFrontViewNumbers = (voxels: Voxel[]): (number | null)[][] => {
  const grid = Array(MAX_HEIGHT).fill(null).map(() => Array(GRID_SIZE).fill(0));

  voxels.forEach(v => {
    // Row index for Y is inverted (MAX_HEIGHT - 1 - y)
    const row = MAX_HEIGHT - 1 - v.y;
    const col = v.x;

    if (row >= 0 && row < MAX_HEIGHT && col >= 0 && col < GRID_SIZE) {
      grid[row][col] += 1;
    }
  });

  return grid.map(row => row.map(val => val === 0 ? null : val));
};

/**
 * Generates depth numbers for Side View (Count along X axis for each Z,Y)
 */
export const generateSideViewNumbers = (voxels: Voxel[]): (number | null)[][] => {
  const grid = Array(MAX_HEIGHT).fill(null).map(() => Array(GRID_SIZE).fill(0));

  voxels.forEach(v => {
    const row = MAX_HEIGHT - 1 - v.y;
    const col = v.z; // Side view (Right) uses Z as column

    if (row >= 0 && row < MAX_HEIGHT && col >= 0 && col < GRID_SIZE) {
      grid[row][col] += 1;
    }
  });

  return grid.map(row => row.map(val => val === 0 ? null : val));
};
