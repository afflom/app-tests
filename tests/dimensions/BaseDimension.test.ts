/**
 * Tests for BaseDimension module
 */

import { BaseDimension } from '../../src/dimensions/BaseDimension';
import { RNABase } from '../../src/types';

describe('BaseDimension', () => {
  let baseDim: BaseDimension;

  beforeEach(() => {
    baseDim = new BaseDimension();
  });

  describe('getType', () => {
    it('should identify purines correctly', () => {
      expect(baseDim.getType('A')).toBe('purine');
      expect(baseDim.getType('G')).toBe('purine');
    });

    it('should identify pyrimidines correctly', () => {
      expect(baseDim.getType('U')).toBe('pyrimidine');
      expect(baseDim.getType('C')).toBe('pyrimidine');
    });
  });

  describe('canPair', () => {
    it('should identify Watson-Crick pairs', () => {
      expect(baseDim.canPair('A', 'U')).toBe(true);
      expect(baseDim.canPair('U', 'A')).toBe(true);
      expect(baseDim.canPair('G', 'C')).toBe(true);
      expect(baseDim.canPair('C', 'G')).toBe(true);
    });

    it('should identify wobble pairs', () => {
      expect(baseDim.canPair('G', 'U')).toBe(true);
      expect(baseDim.canPair('U', 'G')).toBe(true);
    });

    it('should reject invalid pairs', () => {
      expect(baseDim.canPair('A', 'A')).toBe(false);
      expect(baseDim.canPair('A', 'G')).toBe(false);
      expect(baseDim.canPair('C', 'U')).toBe(false);
      expect(baseDim.canPair('C', 'C')).toBe(false);
    });
  });

  describe('getPairStrength', () => {
    it('should return correct strengths for Watson-Crick pairs', () => {
      expect(baseDim.getPairStrength('A', 'U')).toBe(2.0);
      expect(baseDim.getPairStrength('U', 'A')).toBe(2.0);
      expect(baseDim.getPairStrength('G', 'C')).toBe(3.0);
      expect(baseDim.getPairStrength('C', 'G')).toBe(3.0);
    });

    it('should return correct strength for wobble pairs', () => {
      expect(baseDim.getPairStrength('G', 'U')).toBe(1.0);
      expect(baseDim.getPairStrength('U', 'G')).toBe(1.0);
    });

    it('should return 0 for non-pairs', () => {
      expect(baseDim.getPairStrength('A', 'A')).toBe(0);
      expect(baseDim.getPairStrength('C', 'U')).toBe(0);
    });
  });

  describe('calculateGCContent', () => {
    it('should calculate GC content correctly', () => {
      expect(baseDim.calculateGCContent('AAAA')).toBe(0);
      expect(baseDim.calculateGCContent('GGGG')).toBe(1);
      expect(baseDim.calculateGCContent('AUGC')).toBe(0.5);
      expect(baseDim.calculateGCContent('AAGGCCUU')).toBe(0.5);
    });

    it('should handle empty sequences', () => {
      expect(baseDim.calculateGCContent('')).toBe(NaN);
    });
  });

  describe('isGCRich', () => {
    it('should identify GC-rich regions', () => {
      const sequence = 'AAAAGGGGGCCCCCAAAAA';
      expect(baseDim.isGCRich(sequence, 9, 10)).toBe(true); // Center of GC region
      expect(baseDim.isGCRich(sequence, 2, 10)).toBe(false); // A-rich region
    });

    it('should handle edge cases', () => {
      const sequence = 'AUGC';
      expect(baseDim.isGCRich(sequence, 0, 4)).toBe(false); // 50% is not > 60%
      expect(baseDim.isGCRich(sequence, 2, 2)).toBe(true); // Just GC
    });
  });

  describe('findPairingPartners', () => {
    it('should find all valid pairing partners', () => {
      const sequence = 'AUGCAUGC';
      const partners = baseDim.findPairingPartners(sequence, 0, 4);
      
      expect(partners).toContain(4); // A can pair with U at position 4
      expect(partners).not.toContain(1); // Too close (min distance = 4)
      expect(partners).not.toContain(5); // G cannot pair with A
    });

    it('should respect minimum distance constraint', () => {
      const sequence = 'AUAUAUAU';
      const partners = baseDim.findPairingPartners(sequence, 0, 3);
      
      expect(partners).not.toContain(2); // Too close
      expect(partners).toContain(3); // Exactly at min distance
      expect(partners).toContain(5); // Far enough
    });
  });

  describe('getStackingPotential', () => {
    it('should calculate stacking potentials correctly', () => {
      expect(baseDim.getStackingPotential('A', 'G')).toBe(1.0); // purine-purine
      expect(baseDim.getStackingPotential('A', 'U')).toBe(0.7); // purine-pyrimidine
      expect(baseDim.getStackingPotential('U', 'C')).toBe(0.4); // pyrimidine-pyrimidine
    });
  });

  describe('isValidSequence', () => {
    it('should validate RNA sequences', () => {
      expect(baseDim.isValidSequence('AUGC')).toBe(true);
      expect(baseDim.isValidSequence('AAAAUUUUGGGGCCCC')).toBe(true);
      expect(baseDim.isValidSequence('')).toBe(false);
      expect(baseDim.isValidSequence('AUGCT')).toBe(false); // Contains DNA base T
      expect(baseDim.isValidSequence('AUGCX')).toBe(false); // Contains invalid base
      expect(baseDim.isValidSequence('augc')).toBe(false); // Lowercase
    });
  });

  describe('dnaToRna', () => {
    it('should convert DNA to RNA', () => {
      expect(baseDim.dnaToRna('ATGC')).toBe('AUGC');
      expect(baseDim.dnaToRna('TTTT')).toBe('UUUU');
      expect(baseDim.dnaToRna('AUGC')).toBe('AUGC'); // Already RNA
    });
  });

  describe('getComplement', () => {
    it('should return correct complements', () => {
      expect(baseDim.getComplement('A')).toBe('U');
      expect(baseDim.getComplement('U')).toBe('A');
      expect(baseDim.getComplement('G')).toBe('C');
      expect(baseDim.getComplement('C')).toBe('G');
    });

    it('should return null for invalid bases', () => {
      expect(baseDim.getComplement('X' as RNABase)).toBe(null);
    });
  });
});