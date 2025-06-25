/**
 * Tests for QuantumDimension module
 */

import { QuantumDimension } from '../../src/dimensions/QuantumDimension';
import { Coordinate3D, FoldingParameters } from '../../src/types';
import { OPTIMAL_PARAMETERS } from '../../src/constants';
import { MockMathematicalUniverse } from '../setup';

// Mock the Mathematical Universe module
jest.mock('@uor-foundation/math-ts-core', () => ({
  MathematicalUniverse: MockMathematicalUniverse
}));

describe('QuantumDimension', () => {
  let quantumDim: QuantumDimension;

  beforeEach(() => {
    quantumDim = new QuantumDimension();
  });

  describe('calculateResonance', () => {
    it('should return resonance values in expected range', () => {
      const resonance = quantumDim.calculateResonance(10, 100);
      
      expect(resonance).toBeGreaterThan(0);
      expect(resonance).toBeLessThanOrEqual(10);
    });

    it('should handle Mathematical Universe errors gracefully', () => {
      // Force MU to throw error
      const mockAnalyze = jest.spyOn(MockMathematicalUniverse.prototype, 'analyze')
        .mockImplementation(() => { throw new Error('MU Error'); });
      
      const resonance = quantumDim.calculateResonance(10, 100);
      
      expect(resonance).toBeGreaterThanOrEqual(-1);
      expect(resonance).toBeLessThanOrEqual(1.5);
      
      mockAnalyze.mockRestore();
    });

    it('should provide different resonances for different positions', () => {
      const res1 = quantumDim.calculateResonance(10, 100);
      const res2 = quantumDim.calculateResonance(50, 100);
      
      expect(res1).not.toBe(res2);
    });
  });

  describe('calculateEntanglement', () => {
    it('should decrease with distance', () => {
      const close = quantumDim.calculateEntanglement(10, 15);
      const far = quantumDim.calculateEntanglement(10, 50);
      
      expect(close).toBeGreaterThan(far);
    });

    it('should be symmetric', () => {
      const ent1 = quantumDim.calculateEntanglement(10, 20);
      const ent2 = quantumDim.calculateEntanglement(20, 10);
      
      expect(ent1).toBe(ent2);
    });

    it('should be maximum at zero distance', () => {
      const same = quantumDim.calculateEntanglement(10, 10);
      const diff = quantumDim.calculateEntanglement(10, 11);
      
      expect(same).toBeGreaterThan(diff);
    });

    it('should include field coupling bonus', () => {
      // With MU fields contributing
      const entanglement = quantumDim.calculateEntanglement(5, 10);
      
      expect(entanglement).toBeGreaterThan(0);
      expect(entanglement).toBeLessThanOrEqual(2); // Base + field bonus
    });
  });

  describe('calculateConsciousness', () => {
    it('should vary with GC content', () => {
      const gcRichSeq = 'GGGGCCCCGGGGCCCC';
      const atRichSeq = 'AAAAUUUUAAAAUUUU';
      
      const gcConsciousness = quantumDim.calculateConsciousness(gcRichSeq, 8);
      const atConsciousness = quantumDim.calculateConsciousness(atRichSeq, 8);
      
      expect(gcConsciousness).toBeGreaterThan(atConsciousness);
    });

    it('should be bounded between 0 and 1', () => {
      const sequences = ['AUGC', 'GGGG', 'AAAA', 'GCGCGCGC'];
      
      for (const seq of sequences) {
        for (let i = 0; i < seq.length; i++) {
          const consciousness = quantumDim.calculateConsciousness(seq, i);
          expect(consciousness).toBeGreaterThanOrEqual(0);
          expect(consciousness).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should use local window', () => {
      const sequence = 'AAAAGGGGGAAAAA';
      const posInGC = 7; // Middle of GC region
      const posInAT = 2; // In AT region
      
      const gcRegionConsciousness = quantumDim.calculateConsciousness(sequence, posInGC);
      const atRegionConsciousness = quantumDim.calculateConsciousness(sequence, posInAT);
      
      expect(gcRegionConsciousness).toBeGreaterThan(atRegionConsciousness);
    });
  });

  describe('applyQuantumField', () => {
    it('should modify coordinates', () => {
      const initial: Coordinate3D[] = [
        [0, 0, 0],
        [5.91, 0, 0],
        [11.82, 0, 0]
      ];
      
      const parameters: FoldingParameters = OPTIMAL_PARAMETERS;
      
      const modified = quantumDim.applyQuantumField(initial, parameters, 'AUG');
      
      expect(modified).toHaveLength(3);
      expect(modified).not.toEqual(initial);
      
      // Should maintain valid coordinates
      modified.forEach(coord => {
        expect(coord).toHaveLength(3);
        coord.forEach(v => {
          expect(typeof v).toBe('number');
          expect(isNaN(v)).toBe(false);
        });
      });
    });

    it('should scale with field coupling parameter', () => {
      const initial: Coordinate3D[] = [[0, 0, 0], [5.91, 0, 0]];
      
      const weakParams = { ...OPTIMAL_PARAMETERS, fieldCoupling: 0.01 };
      const strongParams = { ...OPTIMAL_PARAMETERS, fieldCoupling: 0.5 };
      
      const weakField = quantumDim.applyQuantumField(initial, weakParams);
      const strongField = quantumDim.applyQuantumField(initial, strongParams);
      
      // Strong field should create larger deviations
      const weakDist = Math.sqrt(
        Math.pow(weakField[0][0] - initial[0][0], 2) +
        Math.pow(weakField[0][1] - initial[0][1], 2) +
        Math.pow(weakField[0][2] - initial[0][2], 2)
      );
      
      const strongDist = Math.sqrt(
        Math.pow(strongField[0][0] - initial[0][0], 2) +
        Math.pow(strongField[0][1] - initial[0][1], 2) +
        Math.pow(strongField[0][2] - initial[0][2], 2)
      );
      
      expect(strongDist).toBeGreaterThan(weakDist);
    });

    it('should respect entanglement threshold', () => {
      const initial: Coordinate3D[] = Array(10).fill(null).map((_, i) => [i * 5.91, 0, 0]);
      
      const lowThreshold = { ...OPTIMAL_PARAMETERS, entanglementThreshold: 0.9 };
      const highThreshold = { ...OPTIMAL_PARAMETERS, entanglementThreshold: 0.1 };
      
      const lowResult = quantumDim.applyQuantumField(initial, lowThreshold);
      const highResult = quantumDim.applyQuantumField(initial, highThreshold);
      
      // Results should differ based on entanglement patterns
      expect(lowResult).not.toEqual(highResult);
    });
  });

  describe('isLagrangePoint', () => {
    it('should identify high resonance positions', () => {
      // Mock high resonance
      const mockAnalyze = jest.spyOn(MockMathematicalUniverse.prototype, 'analyze')
        .mockReturnValue({
          resonance: 7.5,
          fields: [],
          consciousness: 0.8,
          stability: 0.9
        });
      
      expect(quantumDim.isLagrangePoint(42)).toBe(true);
      
      mockAnalyze.mockRestore();
    });

    it('should use fallback for multiples of 48', () => {
      // Force error to use fallback
      const mockAnalyze = jest.spyOn(MockMathematicalUniverse.prototype, 'analyze')
        .mockImplementation(() => { throw new Error(); });
      
      expect(quantumDim.isLagrangePoint(48)).toBe(true);
      expect(quantumDim.isLagrangePoint(96)).toBe(true);
      expect(quantumDim.isLagrangePoint(47)).toBe(false);
      
      mockAnalyze.mockRestore();
    });
  });

  describe('calculateStability', () => {
    it('should return values between 0 and 1', () => {
      for (let i = 0; i < 100; i += 10) {
        const stability = quantumDim.calculateStability(i);
        expect(stability).toBeGreaterThanOrEqual(0);
        expect(stability).toBeLessThanOrEqual(1);
      }
    });

    it('should vary with position', () => {
      const stabilities = [0, 24, 48, 72].map(pos => 
        quantumDim.calculateStability(pos)
      );
      
      // Should have variation
      const uniqueValues = new Set(stabilities);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });

  describe('getQuantumState', () => {
    it('should return complex state vector', () => {
      const length = 10;
      const state = quantumDim.getQuantumState(length);
      
      expect(state).toHaveLength(length);
      
      state.forEach(component => {
        expect(component).toHaveProperty('real');
        expect(component).toHaveProperty('imag');
        expect(typeof component.real).toBe('number');
        expect(typeof component.imag).toBe('number');
      });
    });

    it('should have varying phase', () => {
      const state = quantumDim.getQuantumState(5);
      
      const phases = state.map(c => Math.atan2(c.imag, c.real));
      const uniquePhases = new Set(phases);
      
      expect(uniquePhases.size).toBeGreaterThan(1);
    });
  });

  describe('calculateFieldGradient', () => {
    it('should return 3D gradient vector', () => {
      const gradient = quantumDim.calculateFieldGradient(10, 100);
      
      expect(gradient).toHaveLength(3);
      gradient.forEach(component => {
        expect(typeof component).toBe('number');
        expect(isNaN(component)).toBe(false);
      });
    });

    it('should scale components appropriately', () => {
      const gradient = quantumDim.calculateFieldGradient(50, 100);
      
      // Y and Z components should be smaller than X
      expect(Math.abs(gradient[1])).toBeLessThanOrEqual(Math.abs(gradient[0]));
      expect(Math.abs(gradient[2])).toBeLessThanOrEqual(Math.abs(gradient[0]));
    });
  });

  describe('applyPageTheory', () => {
    it('should calculate page and harmonic correctly', () => {
      const result = quantumDim.applyPageTheory(50, 48);
      
      expect(result.page).toBe(2); // 50 % 48 = 2
      expect(result.harmonic).toBeCloseTo(Math.cos(2 * 2 * Math.PI / 48));
    });

    it('should handle different page sizes', () => {
      const result1 = quantumDim.applyPageTheory(100, 48);
      const result2 = quantumDim.applyPageTheory(100, 24);
      
      expect(result1.page).toBe(4); // 100 % 48
      expect(result2.page).toBe(4); // 100 % 24
      expect(result1.harmonic).not.toBe(result2.harmonic);
    });
  });
});