/**
 * Tests for StructureDimension module
 */

import { StructureDimension } from '../../src/dimensions/StructureDimension';
import { BasePair } from '../../src/types';
import { Assertions } from '../setup';

describe('StructureDimension', () => {
  let structDim: StructureDimension;

  beforeEach(() => {
    structDim = new StructureDimension();
  });

  describe('predictSecondary', () => {
    it('should predict simple stem structure', () => {
      const sequence = 'GGGCCC';
      const secondary = structDim.predictSecondary(sequence);
      
      expect(secondary).toHaveLength(6);
      expect(Assertions.balancedStructure(secondary)).toBe(true);
      expect(secondary).toMatch(/^\(+\)+$/); // Should be all paired
    });

    it('should predict hairpin structure', () => {
      const sequence = 'GGGAAAAACCC';
      const secondary = structDim.predictSecondary(sequence);
      
      expect(secondary).toHaveLength(11);
      expect(Assertions.balancedStructure(secondary)).toBe(true);
      expect(secondary.slice(3, 8)).toBe('.....'); // Loop region
    });

    it('should respect minimum loop size', () => {
      const sequence = 'GGAAACC'; // Too short for loop
      const secondary = structDim.predictSecondary(sequence);
      
      expect(secondary).not.toContain('((..))'); // Min loop size is 3
    });

    it('should handle sequences with no valid pairs', () => {
      const sequence = 'AAAAAAA';
      const secondary = structDim.predictSecondary(sequence);
      
      expect(secondary).toBe('.......');
    });
  });

  describe('extractPairs', () => {
    it('should extract base pairs correctly', () => {
      const secondary = '(((...)))';
      const pairs = structDim.extractPairs(secondary);
      
      expect(pairs).toHaveLength(3);
      expect(pairs[0]).toEqual({ i: 0, j: 8, type: 'WC', strength: 2.5 });
      expect(pairs[1]).toEqual({ i: 1, j: 7, type: 'WC', strength: 2.5 });
      expect(pairs[2]).toEqual({ i: 2, j: 6, type: 'WC', strength: 2.5 });
    });

    it('should handle multiple stems', () => {
      const secondary = '((..))((...))';
      const pairs = structDim.extractPairs(secondary);
      
      expect(pairs).toHaveLength(5);
      expect(pairs.some(p => p.i === 0 && p.j === 4)).toBe(true);
      expect(pairs.some(p => p.i === 6 && p.j === 12)).toBe(true);
    });

    it('should handle empty structure', () => {
      const secondary = '......';
      const pairs = structDim.extractPairs(secondary);
      
      expect(pairs).toHaveLength(0);
    });
  });

  describe('validateStructure', () => {
    it('should validate balanced structures', () => {
      expect(structDim.validateStructure('(((...)))')).toBe(true);
      expect(structDim.validateStructure('(())(())')).toBe(true);
      expect(structDim.validateStructure('......')).toBe(true);
    });

    it('should reject unbalanced structures', () => {
      expect(structDim.validateStructure('(((...)')).toBe(false);
      expect(structDim.validateStructure('((())))')).toBe(false);
      expect(structDim.validateStructure('))((')).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(structDim.validateStructure('((X))')).toBe(false);
      expect(structDim.validateStructure('[[]]')).toBe(false);
    });
  });

  describe('findMotifs', () => {
    it('should find hairpin motifs', () => {
      const secondary = '(((...)))';
      const motifs = structDim.findMotifs(secondary);
      
      const hairpins = motifs.filter(m => m.type === 'hairpin');
      expect(hairpins).toHaveLength(1);
      expect(hairpins[0]).toEqual({ type: 'hairpin', start: 2, end: 6 });
    });

    it('should find stem motifs', () => {
      const secondary = '((((.....))))';
      const motifs = structDim.findMotifs(secondary);
      
      const stems = motifs.filter(m => m.type === 'stem');
      expect(stems.length).toBeGreaterThan(0);
      expect(stems[0].start).toBe(0);
    });

    it('should find multiple motifs', () => {
      const secondary = '((..))..(((...)))';
      const motifs = structDim.findMotifs(secondary);
      
      expect(motifs.length).toBeGreaterThan(1);
      expect(motifs.some(m => m.type === 'hairpin')).toBe(true);
    });
  });

  describe('calculatePairProbabilities', () => {
    it('should calculate pair probabilities', () => {
      const sequence = 'AUGCAUGC';
      const probMatrix = structDim.calculatePairProbabilities(sequence);
      
      expect(probMatrix).toHaveLength(8);
      expect(probMatrix[0]).toHaveLength(8);
      
      // Check symmetry
      for (let i = 0; i < 8; i++) {
        for (let j = i + 1; j < 8; j++) {
          expect(probMatrix[i][j]).toBe(probMatrix[j][i]);
        }
      }
      
      // Check that A-U pairs have positive probability
      expect(probMatrix[0][4]).toBeGreaterThan(0); // A-U at distance 4
      
      // Check that non-pairing bases have zero probability
      expect(probMatrix[0][1]).toBe(0); // A-U too close
      expect(probMatrix[0][5]).toBe(0); // A-G cannot pair
    });

    it('should decrease probability with distance', () => {
      const sequence = 'AUAUAUAUAUAU';
      const probMatrix = structDim.calculatePairProbabilities(sequence);
      
      const closeProb = probMatrix[0][5]; // Distance 5
      const farProb = probMatrix[0][11]; // Distance 11
      
      expect(closeProb).toBeGreaterThan(farProb);
    });
  });

  describe('structureToPairs', () => {
    it('should identify pair types correctly', () => {
      const sequence = 'AUGCGCAU';
      const secondary = '((....))';
      const pairs = structDim.structureToPairs(secondary, sequence);
      
      expect(pairs).toHaveLength(2);
      expect(pairs[0].type).toBe('WC'); // A-U
      expect(pairs[1].type).toBe('wobble'); // U-G
    });

    it('should calculate correct pair strengths', () => {
      const sequence = 'GCGC';
      const secondary = '(())';
      const pairs = structDim.structureToPairs(secondary, sequence);
      
      expect(pairs[0].strength).toBe(3.0); // G-C
      expect(pairs[1].strength).toBe(3.0); // C-G
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate low complexity for simple structures', () => {
      const simple = '((((....))))';
      const complexity = structDim.calculateComplexity(simple);
      
      expect(complexity).toBeLessThan(0.3);
    });

    it('should calculate high complexity for complex structures', () => {
      const complex = '.((.))..((..)).(((...)))';
      const complexity = structDim.calculateComplexity(complex);
      
      expect(complexity).toBeGreaterThan(0.5);
    });

    it('should return 0 for uniform structures', () => {
      expect(structDim.calculateComplexity('......')).toBe(0);
      expect(structDim.calculateComplexity('((((((')).toBe(0);
    });
  });
});