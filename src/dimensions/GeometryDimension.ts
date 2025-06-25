/**
 * Geometry Dimension - handles 3D coordinate operations
 */

import { Coordinate3D, GeometryDimension as IGeometryDimension } from '../types';
import { RNA_CONSTANTS } from '../constants';

export class GeometryDimension implements IGeometryDimension {
  /**
   * Initialize coordinates as an extended chain
   */
  initializeCoordinates(length: number): Coordinate3D[] {
    const coordinates: Coordinate3D[] = [];
    
    for (let i = 0; i < length; i++) {
      coordinates.push([
        i * RNA_CONSTANTS.BACKBONE_DISTANCE,
        0,
        0
      ]);
    }
    
    return coordinates;
  }

  /**
   * Initialize coordinates based on secondary structure
   */
  initializeFromSecondary(secondary: string): Coordinate3D[] {
    const n = secondary.length;
    const coordinates: Coordinate3D[] = [];
    
    // Track base pairs
    const pairMap = new Map<number, number>();
    const stack: number[] = [];
    for (let i = 0; i < n; i++) {
      if (secondary[i] === '(') {
        stack.push(i);
      } else if (secondary[i] === ')' && stack.length > 0) {
        const j = stack.pop()!;
        pairMap.set(j, i);
        pairMap.set(i, j);
      }
    }
    
    // Initialize with better structure-aware positions
    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;
    let direction = 0; // angle in radians
    
    for (let i = 0; i < n; i++) {
      if (secondary[i] === '(') {
        // Start of helix - create helix coordinates
        const j = pairMap.get(i);
        if (j !== undefined) {
          // Count consecutive pairs for helix length
          let helixLength = 1;
          let k = i + 1;
          while (k < j && pairMap.get(k) === j - (k - i)) {
            helixLength++;
            k++;
          }
          
          // Generate helix positions
          const helixCoords = this.generateHelix(helixLength);
          
          // Transform to current position
          for (let h = 0; h < helixLength; h++) {
            const rotated = this.rotatePoint(helixCoords[h], direction);
            coordinates[i + h] = [
              currentX + rotated[0],
              currentY + rotated[1],
              currentZ + rotated[2]
            ];
            
            // Place the paired base
            const pairIdx = pairMap.get(i + h)!;
            if (pairIdx > i + h) {
              coordinates[pairIdx] = [
                currentX + rotated[0] + RNA_CONSTANTS.BASE_PAIR_DISTANCE * Math.cos(direction + Math.PI/2),
                currentY + rotated[1] + RNA_CONSTANTS.BASE_PAIR_DISTANCE * Math.sin(direction + Math.PI/2),
                currentZ + rotated[2]
              ];
            }
          }
          
          // Update position
          const lastHelix = helixCoords[helixLength - 1];
          const rotated = this.rotatePoint(lastHelix, direction);
          currentX += rotated[0];
          currentY += rotated[1];
          currentZ += rotated[2];
          
          // Skip processed bases
          i += helixLength - 1;
        }
      } else if (secondary[i] === '.' && !pairMap.has(i)) {
        // Unpaired region - create loop-like structure
        const loopAngle = Math.PI / 6; // 30 degrees per unpaired base
        direction += loopAngle;
        
        currentX += RNA_CONSTANTS.BACKBONE_DISTANCE * Math.cos(direction);
        currentY += RNA_CONSTANTS.BACKBONE_DISTANCE * Math.sin(direction);
        
        coordinates[i] = [currentX, currentY, currentZ];
      } else if (!coordinates[i]) {
        // Default position for unprocessed bases
        currentX += RNA_CONSTANTS.BACKBONE_DISTANCE * Math.cos(direction);
        currentY += RNA_CONSTANTS.BACKBONE_DISTANCE * Math.sin(direction);
        
        coordinates[i] = [currentX, currentY, currentZ];
      }
    }
    
    // Fill any missing coordinates
    for (let i = 0; i < n; i++) {
      if (!coordinates[i]) {
        coordinates[i] = [i * RNA_CONSTANTS.BACKBONE_DISTANCE, 0, 0];
      }
    }
    
    return coordinates;
  }

  /**
   * Rotate a point around the origin
   */
  private rotatePoint(point: Coordinate3D, angle: number): Coordinate3D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      point[0] * cos - point[1] * sin,
      point[0] * sin + point[1] * cos,
      point[2]
    ];
  }

  /**
   * Calculate Euclidean distance between two points
   */
  distance(coord1: Coordinate3D, coord2: Coordinate3D): number {
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    const dz = coord1[2] - coord2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate angle between three points (in degrees)
   */
  angle(coord1: Coordinate3D, coord2: Coordinate3D, coord3: Coordinate3D): number {
    const v1 = this.subtract(coord1, coord2);
    const v2 = this.subtract(coord3, coord2);
    
    const dot = this.dotProduct(v1, v2);
    const mag1 = this.magnitude(v1);
    const mag2 = this.magnitude(v2);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = dot / (mag1 * mag2);
    // Clamp to avoid numerical errors
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    
    return Math.acos(clampedCos) * 180 / Math.PI;
  }

  /**
   * Rotate a coordinate around an axis
   */
  rotate(coord: Coordinate3D, angle: number, axis: 'x' | 'y' | 'z'): Coordinate3D {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    switch (axis) {
      case 'x':
        return [
          coord[0],
          coord[1] * cos - coord[2] * sin,
          coord[1] * sin + coord[2] * cos
        ];
      case 'y':
        return [
          coord[0] * cos + coord[2] * sin,
          coord[1],
          -coord[0] * sin + coord[2] * cos
        ];
      case 'z':
        return [
          coord[0] * cos - coord[1] * sin,
          coord[0] * sin + coord[1] * cos,
          coord[2]
        ];
    }
  }

  /**
   * Generate helix coordinates
   */
  generateHelix(
    length: number, 
    rise: number = RNA_CONSTANTS.HELIX_RISE,
    twist: number = RNA_CONSTANTS.HELIX_TWIST,
    radius: number = RNA_CONSTANTS.HELIX_RADIUS
  ): Coordinate3D[] {
    const coordinates: Coordinate3D[] = [];
    
    for (let i = 0; i < length; i++) {
      const angle = (i * twist) * Math.PI / 180;
      const z = i * rise;
      
      coordinates.push([
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        z
      ]);
    }
    
    return coordinates;
  }

  /**
   * Translate coordinates by a vector
   */
  translate(coord: Coordinate3D, vector: Coordinate3D): Coordinate3D {
    return [
      coord[0] + vector[0],
      coord[1] + vector[1],
      coord[2] + vector[2]
    ];
  }

  /**
   * Scale coordinates by a factor
   */
  scale(coord: Coordinate3D, factor: number): Coordinate3D {
    return [
      coord[0] * factor,
      coord[1] * factor,
      coord[2] * factor
    ];
  }

  /**
   * Calculate center of mass for a set of coordinates
   */
  centerOfMass(coordinates: Coordinate3D[]): Coordinate3D {
    const sum = coordinates.reduce((acc, coord) => [
      acc[0] + coord[0],
      acc[1] + coord[1],
      acc[2] + coord[2]
    ], [0, 0, 0] as Coordinate3D);
    
    const n = coordinates.length;
    return [sum[0] / n, sum[1] / n, sum[2] / n];
  }

  /**
   * Calculate RMSD between two sets of coordinates
   */
  rmsd(coords1: Coordinate3D[], coords2: Coordinate3D[]): number {
    if (coords1.length !== coords2.length) {
      throw new Error('Coordinate sets must have the same length');
    }
    
    let sumSquaredDist = 0;
    for (let i = 0; i < coords1.length; i++) {
      const dist = this.distance(coords1[i], coords2[i]);
      sumSquaredDist += dist * dist;
    }
    
    return Math.sqrt(sumSquaredDist / coords1.length);
  }

  /**
   * Normalize a vector
   */
  normalize(vector: Coordinate3D): Coordinate3D {
    const mag = this.magnitude(vector);
    if (mag === 0) return [0, 0, 1];
    
    return [
      vector[0] / mag,
      vector[1] / mag,
      vector[2] / mag
    ];
  }

  /**
   * Apply rotation matrix to coordinates
   */
  applyRotationMatrix(coord: Coordinate3D, matrix: number[][]): Coordinate3D {
    return [
      matrix[0][0] * coord[0] + matrix[0][1] * coord[1] + matrix[0][2] * coord[2],
      matrix[1][0] * coord[0] + matrix[1][1] * coord[1] + matrix[1][2] * coord[2],
      matrix[2][0] * coord[0] + matrix[2][1] * coord[1] + matrix[2][2] * coord[2]
    ];
  }

  /**
   * Generate coordinates for a loop
   */
  generateLoop(startCoord: Coordinate3D, endCoord: Coordinate3D, loopSize: number): Coordinate3D[] {
    const coords: Coordinate3D[] = [];
    const center = this.midpoint(startCoord, endCoord);
    const radius = this.distance(startCoord, endCoord) / 2;
    
    for (let i = 0; i < loopSize; i++) {
      const angle = (i / loopSize) * Math.PI;
      const offset = radius * Math.sin(angle);
      
      coords.push([
        center[0] + offset * Math.cos(angle),
        center[1] + offset * Math.sin(angle),
        center[2] + offset * 0.5
      ]);
    }
    
    return coords;
  }

  // Helper methods
  private subtract(a: Coordinate3D, b: Coordinate3D): Coordinate3D {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  private dotProduct(a: Coordinate3D, b: Coordinate3D): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private magnitude(vector: Coordinate3D): number {
    return Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
  }

  private midpoint(a: Coordinate3D, b: Coordinate3D): Coordinate3D {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  }
}