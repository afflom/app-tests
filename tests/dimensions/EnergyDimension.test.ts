/**
 * Tests for EnergyDimension module
 */

import { EnergyDimension } from '../../src/dimensions/EnergyDimension';
import { FoldingResult, RNABase } from '../../src/types';
import { ENERGY_PARAMS } from '../../src/constants';
import { TestData } from '../setup';

describe('EnergyDimension', () => {
  let energyDim: EnergyDimension;

  beforeEach(() => {
    energyDim = new EnergyDimension();
  });

  describe('calculateTotalEnergy', () => {
    it('should calculate negative energy for stable structure', () => {
      const result = TestData.sampleFoldingResult('GGGAAACCC');
      result.secondary = '(((...)))';
      result.pairs = [
        { i: 0, j: 8, type: 'WC', strength: 3.0 },
        { i: 1, j: 7, type: 'WC', strength: 3.0 },
        { i: 2, j: 6, type: 'WC', strength: 3.0 }
      ];
      
      const energy = energyDim.calculateTotalEnergy(result);
      expect(energy).toBeLessThan(0); // Stable structures have negative energy
    });

    it('should include all energy components', () => {
      const result = TestData.sampleFoldingResult();
      
      // Mock methods to track calls
      const pairEnergySpy = jest.spyOn(energyDim, 'pairEnergy');
      const loopEnergySpy = jest.spyOn(energyDim as any, 'calculateLoopPenalties');
      const stackingSpy = jest.spyOn(energyDim as any, 'calculateStackingEnergies');
      const danglingSpy = jest.spyOn(energyDim as any, 'calculateDanglingEnds');
      const terminalSpy = jest.spyOn(energyDim as any, 'calculateTerminalPenalties');
      
      energyDim.calculateTotalEnergy(result);
      
      expect(pairEnergySpy).toHaveBeenCalled();
      expect(loopEnergySpy).toHaveBeenCalled();
      expect(stackingSpy).toHaveBeenCalled();
      expect(danglingSpy).toHaveBeenCalled();
      expect(terminalSpy).toHaveBeenCalled();
    });
  });

  describe('pairEnergy', () => {
    it('should calculate correct energies for base pairs', () => {
      expect(energyDim.pairEnergy('G', 'C', 37)).toBeLessThan(-1.5); // Strong pair
      expect(energyDim.pairEnergy('A', 'U', 37)).toBeLessThan(-1.0); // Medium pair
      expect(energyDim.pairEnergy('G', 'U', 37)).toBeLessThan(-0.5); // Weak pair
    });

    it('should adjust for temperature', () => {
      const energy25 = energyDim.pairEnergy('G', 'C', 25);
      const energy37 = energyDim.pairEnergy('G', 'C', 37);
      const energy50 = energyDim.pairEnergy('G', 'C', 50);
      
      // Higher temperature = less negative energy
      expect(energy25).toBeLessThan(energy37);
      expect(energy37).toBeLessThan(energy50);
    });
  });

  describe('loopEnergy', () => {
    it('should return infinity for hairpins smaller than 3', () => {
      expect(energyDim.loopEnergy(2, 'hairpin')).toBe(Infinity);
      expect(energyDim.loopEnergy(3, 'hairpin')).toBeLessThan(Infinity);
    });

    it('should use tabulated values for small loops', () => {
      expect(energyDim.loopEnergy(3, 'hairpin')).toBe(ENERGY_PARAMS.loopPenalty[3]);
      expect(energyDim.loopEnergy(5, 'hairpin')).toBe(ENERGY_PARAMS.loopPenalty[5]);
    });

    it('should calculate different energies for different loop types', () => {
      const hairpinEnergy = energyDim.loopEnergy(5, 'hairpin');
      const bulgeEnergy = energyDim.loopEnergy(5, 'bulge');
      const internalEnergy = energyDim.loopEnergy(5, 'internal');
      const multiEnergy = energyDim.loopEnergy(5, 'multi');
      
      // All should be positive (penalties)
      expect(hairpinEnergy).toBeGreaterThan(0);
      expect(bulgeEnergy).toBeGreaterThan(0);
      expect(internalEnergy).toBeGreaterThan(0);
      expect(multiEnergy).toBeGreaterThan(0);
      
      // They should be different
      const energies = [hairpinEnergy, bulgeEnergy, internalEnergy, multiEnergy];
      const uniqueEnergies = new Set(energies);
      expect(uniqueEnergies.size).toBe(4);
    });

    it('should use Turner parameters for multi-loops', () => {
      const size = 10;
      const expected = ENERGY_PARAMS.multiLoopInit + 
                      ENERGY_PARAMS.multiLoopUnpaired * size;
      
      expect(energyDim.loopEnergy(size, 'multi')).toBe(expected);
    });
  });

  describe('stackingEnergy', () => {
    it('should return stacking energies from parameters', () => {
      const bases: RNABase[] = ['G', 'C', 'G', 'C'];
      const energy = energyDim.stackingEnergy(bases);
      
      expect(energy).toBe(ENERGY_PARAMS.stackingEnergy['GG']);
    });

    it('should return 0 for invalid input', () => {
      expect(energyDim.stackingEnergy(['A', 'U'] as RNABase[])).toBe(0); // Too short
      expect(energyDim.stackingEnergy(['X', 'Y', 'Z', 'W'] as RNABase[])).toBe(0); // Invalid bases
    });
  });

  describe('deltaG', () => {
    it('should calculate Gibbs free energy correctly', () => {
      const enthalpy = -10; // kcal/mol
      const entropy = -0.02; // kcal/mol/K
      const temp = 37; // °C
      
      const deltaG = energyDim.deltaG(enthalpy, entropy, temp);
      const expected = enthalpy - (temp + 273.15) * entropy;
      
      expect(deltaG).toBeCloseTo(expected);
    });
  });

  describe('meltingTemperature', () => {
    it('should calculate melting temperature for short sequences', () => {
      const tm = energyDim.meltingTemperature('AUGCAUGC');
      expect(tm).toBeGreaterThan(0);
      expect(tm).toBeLessThan(100);
    });

    it('should give higher Tm for GC-rich sequences', () => {
      const tmAT = energyDim.meltingTemperature('AUAUAUAU');
      const tmGC = energyDim.meltingTemperature('GCGCGCGC');
      
      expect(tmGC).toBeGreaterThan(tmAT);
    });

    it('should use different formula for long sequences', () => {
      const longSeq = 'AUGC'.repeat(10); // 40 bases
      const tm = energyDim.meltingTemperature(longSeq);
      
      expect(tm).toBeGreaterThan(50);
      expect(tm).toBeLessThan(100);
    });
  });

  describe('dangling ends', () => {
    it('should calculate 5\' dangling end contributions', () => {
      const result = TestData.sampleFoldingResult('AUGCGCAU');
      result.secondary = '.((...))'; // U dangling on 5' of pair
      result.pairs = [{ i: 1, j: 7, type: 'WC', strength: 2.0 }];
      
      const energy = energyDim.calculateTotalEnergy(result);
      // Should include negative contribution from dangling U
      expect(energy).toBeLessThan(0);
    });

    it('should calculate 3\' dangling end contributions', () => {
      const result = TestData.sampleFoldingResult('AUGCGCAU');
      result.secondary = '((...)).'; // U dangling on 3' of pair
      result.pairs = [{ i: 0, j: 6, type: 'WC', strength: 2.0 }];
      
      const energy = energyDim.calculateTotalEnergy(result);
      expect(energy).toBeLessThan(0);
    });
  });

  describe('terminal penalties', () => {
    it('should apply penalty for terminal AU pairs', () => {
      const result1 = TestData.sampleFoldingResult('AUGCAU');
      result1.secondary = '((.))';
      result1.pairs = [
        { i: 0, j: 5, type: 'WC', strength: 2.0 }, // A-U terminal
        { i: 1, j: 4, type: 'WC', strength: 3.0 }  // G-C internal
      ];
      
      const result2 = TestData.sampleFoldingResult('GUGCAC');
      result2.secondary = '((.))';
      result2.pairs = [
        { i: 0, j: 5, type: 'WC', strength: 3.0 }, // G-C terminal
        { i: 1, j: 4, type: 'WC', strength: 3.0 }  // G-C internal
      ];
      
      const energy1 = energyDim.calculateTotalEnergy(result1);
      const energy2 = energyDim.calculateTotalEnergy(result2);
      
      // AU terminal should have higher (less negative) energy due to penalty
      expect(energy1).toBeGreaterThan(energy2);
    });

    it('should apply penalty for terminal GU pairs', () => {
      const result = TestData.sampleFoldingResult('GUGCAU');
      result.secondary = '((...))';
      result.pairs = [{ i: 0, j: 5, type: 'wobble', strength: 1.0 }]; // G-U terminal
      
      const energy = energyDim.calculateTotalEnergy(result);
      // Should include terminal penalty
      expect(energy).toBeGreaterThan(-5);
    });
  });

  describe('loop finding', () => {
    it('should find hairpin loops correctly', () => {
      const secondary = '(((...)))';
      const loops = (energyDim as any).findLoops(secondary);
      
      const hairpins = loops.filter((l: any) => l.type === 'hairpin');
      expect(hairpins).toHaveLength(1);
      expect(hairpins[0].size).toBe(3);
    });

    it('should find bulge loops', () => {
      const secondary = '((.((...))))'; // Bulge on one side
      const loops = (energyDim as any).findLoops(secondary);
      
      const bulges = loops.filter((l: any) => l.type === 'bulge');
      expect(bulges.length).toBeGreaterThan(0);
    });

    it('should find internal loops with asymmetry', () => {
      const secondary = '((..(....)))'; // 2x4 internal loop
      const loops = (energyDim as any).findLoops(secondary);
      
      const internals = loops.filter((l: any) => l.type === 'internal');
      expect(internals.length).toBeGreaterThan(0);
      expect(internals[0].asymmetry).toBe(2); // |2-4| = 2
    });

    it('should find multi-loops', () => {
      const secondary = '((..((...))..((..))))'; // Junction
      const loops = (energyDim as any).findLoops(secondary);
      
      const multiLoops = loops.filter((l: any) => l.type === 'multi');
      expect(multiLoops.length).toBeGreaterThan(0);
    });
  });

  describe('asymmetry penalty', () => {
    it('should calculate asymmetry penalty correctly', () => {
      const penalty0 = (energyDim as any).calculateAsymmetryPenalty(3, 3); // Symmetric
      const penalty1 = (energyDim as any).calculateAsymmetryPenalty(2, 4); // Asymmetry = 2
      const penaltyMax = (energyDim as any).calculateAsymmetryPenalty(1, 50); // Large asymmetry
      
      expect(penalty0).toBe(0);
      expect(penalty1).toBeCloseTo(ENERGY_PARAMS.asymmetryPenalty * 2);
      expect(penaltyMax).toBeCloseTo(
        ENERGY_PARAMS.asymmetryPenalty * ENERGY_PARAMS.maxAsymmetry
      );
    });
  });
});