/**
 * Tests for GeometryDimension module
 */

import { GeometryDimension } from '../../src/dimensions/GeometryDimension';
import { Coordinate3D } from '../../src/types';
import { RNA_CONSTANTS } from '../../src/constants';
import { Assertions } from '../setup';

describe('GeometryDimension', () => {
  let geomDim: GeometryDimension;

  beforeEach(() => {
    geomDim = new GeometryDimension();
  });

  describe('initializeCoordinates', () => {
    it('should create linear chain with correct spacing', () => {
      const coords = geomDim.initializeCoordinates(5);
      
      expect(coords).toHaveLength(5);
      expect(Assertions.validCoordinates(coords)).toBe(true);
      
      // Check spacing
      for (let i = 1; i < coords.length; i++) {
        const dist = geomDim.distance(coords[i], coords[i-1]);
        expect(Assertions.withinTolerance(dist, RNA_CONSTANTS.BACKBONE_DISTANCE)).toBe(true);
      }
    });

    it('should create coordinates along x-axis', () => {
      const coords = geomDim.initializeCoordinates(3);
      
      expect(coords[0]).toEqual([0, 0, 0]);
      expect(coords[1][0]).toBeCloseTo(RNA_CONSTANTS.BACKBONE_DISTANCE);
      expect(coords[2][0]).toBeCloseTo(2 * RNA_CONSTANTS.BACKBONE_DISTANCE);
    });
  });

  describe('initializeFromSecondary', () => {
    it('should create helix for paired regions', () => {
      const secondary = '(((...)))';
      const coords = geomDim.initializeFromSecondary(secondary);
      
      expect(coords).toHaveLength(9);
      expect(Assertions.validCoordinates(coords)).toBe(true);
      
      // Check that paired bases are ~10.8Å apart
      const dist03 = geomDim.distance(coords[0], coords[8]);
      const dist14 = geomDim.distance(coords[1], coords[7]);
      
      expect(dist03).toBeGreaterThan(8); // Should be close to BASE_PAIR_DISTANCE
      expect(dist14).toBeGreaterThan(8);
    });

    it('should handle unpaired regions', () => {
      const secondary = '...(((...)))...';
      const coords = geomDim.initializeFromSecondary(secondary);
      
      expect(coords).toHaveLength(15);
      expect(Assertions.validCoordinates(coords)).toBe(true);
    });

    it('should handle multiple stems', () => {
      const secondary = '((...))..((..))';
      const coords = geomDim.initializeFromSecondary(secondary);
      
      expect(coords).toHaveLength(15);
      expect(Assertions.validCoordinates(coords)).toBe(true);
    });
  });

  describe('distance', () => {
    it('should calculate Euclidean distance correctly', () => {
      const c1: Coordinate3D = [0, 0, 0];
      const c2: Coordinate3D = [3, 4, 0];
      
      expect(geomDim.distance(c1, c2)).toBe(5); // 3-4-5 triangle
    });

    it('should handle 3D distances', () => {
      const c1: Coordinate3D = [1, 2, 3];
      const c2: Coordinate3D = [4, 6, 8];
      
      const expected = Math.sqrt(9 + 16 + 25); // sqrt(50)
      expect(geomDim.distance(c1, c2)).toBeCloseTo(expected);
    });
  });

  describe('angle', () => {
    it('should calculate 180° for straight line', () => {
      const c1: Coordinate3D = [0, 0, 0];
      const c2: Coordinate3D = [1, 0, 0];
      const c3: Coordinate3D = [2, 0, 0];
      
      expect(geomDim.angle(c1, c2, c3)).toBeCloseTo(180);
    });

    it('should calculate 90° for right angle', () => {
      const c1: Coordinate3D = [0, 1, 0];
      const c2: Coordinate3D = [0, 0, 0];
      const c3: Coordinate3D = [1, 0, 0];
      
      expect(geomDim.angle(c1, c2, c3)).toBeCloseTo(90);
    });

    it('should handle edge cases', () => {
      const c1: Coordinate3D = [0, 0, 0];
      const c2: Coordinate3D = [0, 0, 0]; // Same as c1
      const c3: Coordinate3D = [1, 0, 0];
      
      expect(geomDim.angle(c1, c2, c3)).toBe(0); // Zero magnitude vector
    });
  });

  describe('rotate', () => {
    it('should rotate around x-axis', () => {
      const coord: Coordinate3D = [0, 1, 0];
      const rotated = geomDim.rotate(coord, 90, 'x');
      
      expect(rotated[0]).toBeCloseTo(0);
      expect(rotated[1]).toBeCloseTo(0);
      expect(rotated[2]).toBeCloseTo(1);
    });

    it('should rotate around y-axis', () => {
      const coord: Coordinate3D = [1, 0, 0];
      const rotated = geomDim.rotate(coord, 90, 'y');
      
      expect(rotated[0]).toBeCloseTo(0);
      expect(rotated[1]).toBeCloseTo(0);
      expect(rotated[2]).toBeCloseTo(-1);
    });

    it('should rotate around z-axis', () => {
      const coord: Coordinate3D = [1, 0, 0];
      const rotated = geomDim.rotate(coord, 90, 'z');
      
      expect(rotated[0]).toBeCloseTo(0);
      expect(rotated[1]).toBeCloseTo(1);
      expect(rotated[2]).toBeCloseTo(0);
    });
  });

  describe('generateHelix', () => {
    it('should generate helix with correct parameters', () => {
      const coords = geomDim.generateHelix(10);
      
      expect(coords).toHaveLength(10);
      expect(Assertions.validCoordinates(coords)).toBe(true);
      
      // Check rise between consecutive bases
      for (let i = 1; i < coords.length; i++) {
        const zDiff = coords[i][2] - coords[i-1][2];
        expect(Assertions.withinTolerance(zDiff, RNA_CONSTANTS.HELIX_RISE)).toBe(true);
      }
      
      // Check radius
      for (const coord of coords) {
        const radius = Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1]);
        expect(Assertions.withinTolerance(radius, RNA_CONSTANTS.HELIX_RADIUS)).toBe(true);
      }
    });

    it('should accept custom parameters', () => {
      const customRise = 3.0;
      const customRadius = 3.0;
      const coords = geomDim.generateHelix(5, customRise, 36, customRadius);
      
      expect(coords).toHaveLength(5);
      
      // Check custom rise
      const zDiff = coords[1][2] - coords[0][2];
      expect(Assertions.withinTolerance(zDiff, customRise)).toBe(true);
      
      // Check custom radius
      const radius = Math.sqrt(coords[0][0] * coords[0][0] + coords[0][1] * coords[0][1]);
      expect(Assertions.withinTolerance(radius, customRadius)).toBe(true);
    });
  });

  describe('translate', () => {
    it('should translate coordinates correctly', () => {
      const coord: Coordinate3D = [1, 2, 3];
      const vector: Coordinate3D = [4, 5, 6];
      const translated = geomDim.translate(coord, vector);
      
      expect(translated).toEqual([5, 7, 9]);
    });
  });

  describe('scale', () => {
    it('should scale coordinates correctly', () => {
      const coord: Coordinate3D = [2, 4, 6];
      const scaled = geomDim.scale(coord, 0.5);
      
      expect(scaled).toEqual([1, 2, 3]);
    });
  });

  describe('centerOfMass', () => {
    it('should calculate center of mass', () => {
      const coords: Coordinate3D[] = [
        [0, 0, 0],
        [2, 0, 0],
        [0, 2, 0],
        [2, 2, 0]
      ];
      
      const com = geomDim.centerOfMass(coords);
      expect(com).toEqual([1, 1, 0]);
    });

    it('should handle single coordinate', () => {
      const coords: Coordinate3D[] = [[3, 4, 5]];
      const com = geomDim.centerOfMass(coords);
      
      expect(com).toEqual([3, 4, 5]);
    });
  });

  describe('rmsd', () => {
    it('should calculate RMSD correctly', () => {
      const coords1: Coordinate3D[] = [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0]
      ];
      const coords2: Coordinate3D[] = [
        [0, 0, 1],
        [1, 0, 1],
        [2, 0, 1]
      ];
      
      const rmsd = geomDim.rmsd(coords1, coords2);
      expect(rmsd).toBe(1); // All points shifted by 1 in z
    });

    it('should return 0 for identical structures', () => {
      const coords: Coordinate3D[] = [[1, 2, 3], [4, 5, 6]];
      
      expect(geomDim.rmsd(coords, coords)).toBe(0);
    });

    it('should throw error for different lengths', () => {
      const coords1: Coordinate3D[] = [[0, 0, 0]];
      const coords2: Coordinate3D[] = [[0, 0, 0], [1, 1, 1]];
      
      expect(() => geomDim.rmsd(coords1, coords2)).toThrow();
    });
  });

  describe('normalize', () => {
    it('should normalize vectors correctly', () => {
      const vec: Coordinate3D = [3, 4, 0];
      const normalized = geomDim.normalize(vec);
      
      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);
      expect(normalized[2]).toBeCloseTo(0);
      
      // Check magnitude is 1
      const mag = Math.sqrt(normalized[0]**2 + normalized[1]**2 + normalized[2]**2);
      expect(Assertions.withinTolerance(mag, 1)).toBe(true);
    });

    it('should handle zero vector', () => {
      const vec: Coordinate3D = [0, 0, 0];
      const normalized = geomDim.normalize(vec);
      
      expect(normalized).toEqual([0, 0, 1]); // Default direction
    });
  });

  describe('generateLoop', () => {
    it('should generate loop coordinates', () => {
      const start: Coordinate3D = [0, 0, 0];
      const end: Coordinate3D = [10, 0, 0];
      const loopCoords = geomDim.generateLoop(start, end, 5);
      
      expect(loopCoords).toHaveLength(5);
      expect(Assertions.validCoordinates(loopCoords)).toBe(true);
      
      // Should form an arc between start and end
      expect(loopCoords[0][0]).toBeGreaterThan(0);
      expect(loopCoords[0][0]).toBeLessThan(10);
    });
  });
});