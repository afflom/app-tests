/**
 * Tests for RNAFolder core module
 */

import { RNAFolder } from '../../src/core/RNAFolder';
import { FoldingParameters, FoldingResult } from '../../src/types';
import { OPTIMAL_PARAMETERS } from '../../src/constants';
import { 
  VALIDATION_SEQUENCES, 
  Assertions,
  MockMathematicalUniverse 
} from '../setup';

// Mock the Mathematical Universe module
jest.mock('@uor-foundation/math-ts-core', () => ({
  MathematicalUniverse: MockMathematicalUniverse
}));

describe('RNAFolder', () => {
  let folder: RNAFolder;

  beforeEach(() => {
    folder = new RNAFolder();
  });

  describe('constructor', () => {
    it('should initialize with default parameters', () => {
      expect(folder).toBeDefined();
    });

    it('should accept custom parameters', () => {
      const customParams: Partial<FoldingParameters> = {
        fieldCoupling: 0.1,
        learningRate: 0.05
      };
      
      const customFolder = new RNAFolder(customParams);
      expect(customFolder).toBeDefined();
    });
  });

  describe('fold - general', () => {
    it('should fold valid RNA sequences', async () => {
      const sequence = 'AUGCAUGC';
      const result = await folder.fold(sequence);
      
      expect(result.sequence).toBe(sequence);
      expect(result.coordinates).toHaveLength(sequence.length);
      expect(Assertions.validCoordinates(result.coordinates)).toBe(true);
      expect(Assertions.balancedStructure(result.secondary)).toBe(true);
    });

    it('should reject invalid sequences', async () => {
      await expect(folder.fold('AUGCT')).rejects.toThrow('Invalid RNA sequence');
      await expect(folder.fold('')).rejects.toThrow('Invalid RNA sequence');
    });

    it('should include metadata', async () => {
      const result = await folder.fold('AUGC');
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.foldTime).toBeGreaterThan(0);
      expect(result.metadata.method).toBeDefined();
      expect(result.metadata.parameters).toBeDefined();
    });
  });

  describe('fold - small sequences', () => {
    it('should use optimal strategy for sequences <30 bases', async () => {
      const sequence = VALIDATION_SEQUENCES.small.seq1; // 9 bases
      const result = await folder.fold(sequence);
      
      expect(result.metadata.method).toBe('small-sequence-optimal');
    });

    it('should achieve good structure for small sequences', async () => {
      const sequence = 'GGGAAACCC'; // Perfect hairpin
      const result = await folder.fold(sequence);
      
      // Should form base pairs
      expect(result.pairs.length).toBeGreaterThan(0);
      
      // Check base pair distances
      result.pairs.forEach(pair => {
        const dist = Assertions.distance(
          result.coordinates[pair.i],
          result.coordinates[pair.j]
        );
        expect(dist).toBeGreaterThan(5); // Should be close to 10.8Å
        expect(dist).toBeLessThan(20);
      });
    });

    it('should maintain backbone connectivity', async () => {
      const sequence = VALIDATION_SEQUENCES.small.seq3;
      const result = await folder.fold(sequence);
      
      // Check consecutive backbone distances
      for (let i = 1; i < result.coordinates.length; i++) {
        const dist = Assertions.distance(
          result.coordinates[i],
          result.coordinates[i-1]
        );
        expect(dist).toBeGreaterThan(4); // ~5.91Å
        expect(dist).toBeLessThan(8);
      }
    });
  });

  describe('fold - medium sequences', () => {
    it('should use scaled strategy for 30-100 bases', async () => {
      const sequence = VALIDATION_SEQUENCES.medium.seq1; // 36 bases
      const result = await folder.fold(sequence);
      
      expect(result.metadata.method).toBe('medium-sequence-scaled');
    });

    it('should apply parameter scaling', async () => {
      const sequence = 'A'.repeat(50);
      const result = await folder.fold(sequence);
      
      // Parameters should be scaled
      const params = result.metadata.parameters;
      expect(params.fieldCoupling).toBeGreaterThan(OPTIMAL_PARAMETERS.fieldCoupling);
    });

    it('should handle complex structures', async () => {
      const sequence = VALIDATION_SEQUENCES.structured.multiloop;
      const result = await folder.fold(sequence);
      
      expect(result.coordinates).toHaveLength(sequence.length);
      expect(Assertions.validCoordinates(result.coordinates)).toBe(true);
      expect(result.energy).toBeLessThan(0); // Should be stable
    });
  });

  describe('fold - large sequences', () => {
    it('should use hierarchical strategy for >100 bases', async () => {
      const sequence = 'AUGC'.repeat(30); // 120 bases
      const result = await folder.fold(sequence);
      
      expect(result.metadata.method).toBe('large-sequence-hierarchical');
    });

    it('should fragment and assemble domains', async () => {
      const sequence = 'GGGAAACCC'.repeat(15); // 135 bases
      const result = await folder.fold(sequence);
      
      expect(result.coordinates).toHaveLength(sequence.length);
      expect(Assertions.validCoordinates(result.coordinates)).toBe(true);
    });

    it('should maintain global structure', async () => {
      const sequence = 'AUGC'.repeat(40); // 160 bases
      const result = await folder.fold(sequence);
      
      // Should not be completely linear
      const startToEnd = Assertions.distance(
        result.coordinates[0],
        result.coordinates[result.coordinates.length - 1]
      );
      const totalLength = sequence.length * 5.91; // If completely extended
      
      expect(startToEnd).toBeLessThan(totalLength * 0.8); // Some compaction
    });
  });

  describe('structural constraints', () => {
    it('should enforce base pair constraints', async () => {
      const folder = new RNAFolder();
      const sequence = 'GGGGCCCC';
      const result = await folder.fold(sequence);
      
      // Should have base pairs
      expect(result.pairs.length).toBeGreaterThan(0);
      
      // Base pairs should be at correct distance
      result.pairs.forEach(pair => {
        const dist = Assertions.distance(
          result.coordinates[pair.i],
          result.coordinates[pair.j]
        );
        expect(dist).toBeGreaterThan(8);
        expect(dist).toBeLessThan(15);
      });
    });

    it('should create helical regions', async () => {
      const sequence = 'GGGGAAAACCCC'; // Stem-loop
      const result = await folder.fold(sequence);
      
      // Check for helical twist in stem region
      if (result.pairs.length >= 2) {
        // Consecutive pairs should show helical arrangement
        const angles: number[] = [];
        for (let i = 1; i < result.pairs.length; i++) {
          if (result.pairs[i].i === result.pairs[i-1].i + 1) {
            // Calculate angle between base pairs
            const v1 = [
              result.coordinates[result.pairs[i-1].j][0] - result.coordinates[result.pairs[i-1].i][0],
              result.coordinates[result.pairs[i-1].j][1] - result.coordinates[result.pairs[i-1].i][1],
              result.coordinates[result.pairs[i-1].j][2] - result.coordinates[result.pairs[i-1].i][2]
            ];
            const v2 = [
              result.coordinates[result.pairs[i].j][0] - result.coordinates[result.pairs[i].i][0],
              result.coordinates[result.pairs[i].j][1] - result.coordinates[result.pairs[i].i][1],
              result.coordinates[result.pairs[i].j][2] - result.coordinates[result.pairs[i].i][2]
            ];
            
            // Should have some twist
            const dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
            const mag1 = Math.sqrt(v1[0]**2 + v1[1]**2 + v1[2]**2);
            const mag2 = Math.sqrt(v2[0]**2 + v2[1]**2 + v2[2]**2);
            const angle = Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
            angles.push(angle);
          }
        }
        
        if (angles.length > 0) {
          // Should have some non-zero angles (helical twist)
          expect(Math.max(...angles)).toBeGreaterThan(10);
        }
      }
    });
  });

  describe('energy calculation', () => {
    it('should calculate negative energy for stable structures', async () => {
      const sequence = 'GGGCCC';
      const result = await folder.fold(sequence);
      
      expect(result.energy).toBeLessThan(0);
    });

    it('should have less negative energy for less stable structures', async () => {
      const stable = await folder.fold('GGGGCCCC'); // All paired
      const unstable = await folder.fold('AAAAAAAA'); // No pairs
      
      expect(stable.energy).toBeLessThan(unstable.energy);
    });
  });

  describe('performance', () => {
    it('should fold small sequences quickly', async () => {
      const sequence = 'AUGCAUGC';
      const startTime = Date.now();
      
      await folder.fold(sequence);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in <1s
    });

    it('should handle parameter updates', async () => {
      const folder1 = new RNAFolder({ learningRate: 0.1 });
      const folder2 = new RNAFolder({ learningRate: 0.01 });
      
      const sequence = 'AUGCAUGC';
      const result1 = await folder1.fold(sequence);
      const result2 = await folder2.fold(sequence);
      
      // Different learning rates should produce different results
      expect(result1.coordinates).not.toEqual(result2.coordinates);
    });
  });

  describe('edge cases', () => {
    it('should handle single nucleotide', async () => {
      const result = await folder.fold('A');
      
      expect(result.coordinates).toHaveLength(1);
      expect(result.pairs).toHaveLength(0);
      expect(result.secondary).toBe('.');
    });

    it('should handle sequences with no possible pairs', async () => {
      const result = await folder.fold('AAAA');
      
      expect(result.pairs).toHaveLength(0);
      expect(result.secondary).toBe('....');
    });

    it('should handle very long sequences', async () => {
      const sequence = 'AUGC'.repeat(50); // 200 bases
      const result = await folder.fold(sequence);
      
      expect(result.coordinates).toHaveLength(200);
      expect(Assertions.validCoordinates(result.coordinates)).toBe(true);
    }, 10000); // Longer timeout for large sequence
  });
});