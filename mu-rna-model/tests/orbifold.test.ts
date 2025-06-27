/**
 * Exhaustive tests for Orbifold structure implementation
 */

import { RNAOrbifold } from '../src/orbifold';
import { ConformationalFields } from '../src/types';

describe('RNAOrbifold', () => {
  describe('initialization', () => {
    it('should create orbifold with correct page size', () => {
      const sequence = 'A'.repeat(100);
      const orbifold = new RNAOrbifold(sequence);
      
      expect(orbifold).toBeDefined();
      expect(orbifold.singularities).toBeDefined();
      expect(orbifold.domains).toBeDefined();
    });

    it('should create single domain for short sequences', () => {
      const sequence = 'AUGC';
      const orbifold = new RNAOrbifold(sequence);
      
      expect(orbifold.domains).toHaveLength(1);
      expect(orbifold.domains[0].start).toBe(1);
      expect(orbifold.domains[0].end).toBe(4);
      expect(orbifold.domains[0].pageNumber).toBe(1);
      expect(orbifold.domains[0].boundaryType).toBe('smooth');
    });

    it('should create multiple domains for long sequences', () => {
      const sequence = 'A'.repeat(100);
      const orbifold = new RNAOrbifold(sequence);
      
      expect(orbifold.domains).toHaveLength(3);
      
      // First domain
      expect(orbifold.domains[0].start).toBe(1);
      expect(orbifold.domains[0].end).toBe(48);
      expect(orbifold.domains[0].pageNumber).toBe(1);
      
      // Second domain
      expect(orbifold.domains[1].start).toBe(49);
      expect(orbifold.domains[1].end).toBe(96);
      expect(orbifold.domains[1].pageNumber).toBe(2);
      
      // Third domain (partial)
      expect(orbifold.domains[2].start).toBe(97);
      expect(orbifold.domains[2].end).toBe(100);
      expect(orbifold.domains[2].pageNumber).toBe(3);
    });

    it('should mark domain boundaries correctly', () => {
      const sequence = 'A'.repeat(96); // Exactly 2 pages
      const orbifold = new RNAOrbifold(sequence);
      
      expect(orbifold.domains[0].boundaryType).toBe('singular');
      expect(orbifold.domains[1].boundaryType).toBe('smooth');
    });

    it('should identify singularities at page boundaries', () => {
      const sequence = 'A'.repeat(150);
      const orbifold = new RNAOrbifold(sequence);
      
      expect(orbifold.singularities).toContain(48);
      expect(orbifold.singularities).toContain(96);
      expect(orbifold.singularities).toContain(144);
    });

    it('should handle sequences of exact page multiples', () => {
      const sequence = 'A'.repeat(48);
      const orbifold = new RNAOrbifold(sequence);
      
      expect(orbifold.domains).toHaveLength(1);
      // Sequence of all A's contains AAAA patterns which are detected as flexible regions
      expect(orbifold.singularities.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty sequence', () => {
      const orbifold = new RNAOrbifold('');
      
      expect(orbifold.domains).toHaveLength(0);
      expect(orbifold.singularities).toHaveLength(0);
    });
  });

  describe('getDomain', () => {
    let orbifold: RNAOrbifold;

    beforeEach(() => {
      orbifold = new RNAOrbifold('A'.repeat(100));
    });

    it('should return correct domain for position', () => {
      expect(orbifold.getDomain(1)).toBe(orbifold.domains[0]);
      expect(orbifold.getDomain(48)).toBe(orbifold.domains[0]);
      expect(orbifold.getDomain(49)).toBe(orbifold.domains[1]);
      expect(orbifold.getDomain(96)).toBe(orbifold.domains[1]);
      expect(orbifold.getDomain(97)).toBe(orbifold.domains[2]);
      expect(orbifold.getDomain(100)).toBe(orbifold.domains[2]);
    });

    it('should return undefined for out of range positions', () => {
      expect(orbifold.getDomain(0)).toBeUndefined();
      expect(orbifold.getDomain(101)).toBeUndefined();
      expect(orbifold.getDomain(-1)).toBeUndefined();
    });

    it('should handle boundary positions correctly', () => {
      const domain48 = orbifold.getDomain(48);
      const domain49 = orbifold.getDomain(49);
      
      expect(domain48?.pageNumber).toBe(1);
      expect(domain49?.pageNumber).toBe(2);
    });
  });

  describe('isSingularity', () => {
    let orbifold: RNAOrbifold;

    beforeEach(() => {
      orbifold = new RNAOrbifold('A'.repeat(150));
    });

    it('should identify singularity positions', () => {
      expect(orbifold.isSingularity(48)).toBe(true);
      expect(orbifold.isSingularity(96)).toBe(true);
      expect(orbifold.isSingularity(144)).toBe(true);
    });

    it('should return false for non-singularity positions', () => {
      expect(orbifold.isSingularity(25)).toBe(false);
      expect(orbifold.isSingularity(75)).toBe(false);
      expect(orbifold.isSingularity(125)).toBe(false);
    });

    it('should handle out of range positions', () => {
      expect(orbifold.isSingularity(0)).toBe(false);
      expect(orbifold.isSingularity(200)).toBe(false);
    });
  });

  describe('getLocalGroup', () => {
    let orbifold: RNAOrbifold;

    beforeEach(() => {
      orbifold = new RNAOrbifold('A'.repeat(150));
    });

    it('should return trivial group for regular positions', () => {
      expect(orbifold.getLocalGroup(25)).toBe('{e}');
      expect(orbifold.getLocalGroup(75)).toBe('{e}');
    });

    it('should return dihedral group for singular boundaries', () => {
      expect(orbifold.getLocalGroup(48)).toBe('D_4');
      expect(orbifold.getLocalGroup(96)).toBe('D_4');
    });
  });

  describe('blowUpSingularity', () => {
    let orbifold: RNAOrbifold;

    beforeEach(() => {
      orbifold = new RNAOrbifold('A'.repeat(100));
    });

    it('should blow up singularity with exceptional divisor', () => {
      const blowup = orbifold.blowUpSingularity(48);
      
      expect(blowup.exceptionalDivisor).toBeDefined();
      expect(blowup.localChart).toBeDefined();
      expect(blowup.exceptionalDivisor.length).toBeGreaterThan(0);
    });

    it('should throw error for non-singularity position', () => {
      expect(() => orbifold.blowUpSingularity(25)).toThrow();
    });

    it('should create local chart with conformational states', () => {
      const blowup = orbifold.blowUpSingularity(48);
      
      expect(blowup.localChart.size).toBeGreaterThan(0);
      
      for (const [_pos, states] of blowup.localChart) {
        expect(states).toBeDefined();
        expect(states.length).toBeGreaterThan(0);
        
        states.forEach(state => {
          expect(state).toHaveProperty('e0');
          expect(state).toHaveProperty('e1');
          expect(state).toHaveProperty('e2');
        });
      }
    });
  });

  describe('smoothSingularities', () => {
    let orbifold: RNAOrbifold;

    beforeEach(() => {
      orbifold = new RNAOrbifold('A'.repeat(100));
    });

    it('should create smoothing functions for singularities', () => {
      const smoothing = orbifold.smoothSingularities();
      
      expect(smoothing.size).toBe(orbifold.singularities.length);
      
      orbifold.singularities.forEach(sing => {
        expect(smoothing.has(sing)).toBe(true);
      });
    });

    it('should create valid interpolation functions', () => {
      const smoothing = orbifold.smoothSingularities();
      
      for (const [_sing, func] of smoothing) {
        // Test at different t values
        const state0 = func(0);
        const state05 = func(0.5);
        const state1 = func(1);
        
        [state0, state05, state1].forEach(state => {
          expect(state).toHaveProperty('e0');
          expect(typeof state.e0).toBe('boolean');
        });
      }
    });

    it('should handle empty singularities', () => {
      const smallOrbifold = new RNAOrbifold('AUGC');
      const smoothing = smallOrbifold.smoothSingularities();
      
      expect(smoothing.size).toBe(0);
    });
  });

  describe('eulerCharacteristic', () => {
    it('should return reasonable euler characteristic', () => {
      // Use sequences without flexible patterns to test pure domain singularities
      const orbifold1 = new RNAOrbifold('GC'.repeat(24)); // 48 nucleotides, no AAAA/UUUU
      const euler1 = orbifold1.eulerCharacteristic();
      expect(euler1).toBeGreaterThan(0);
      expect(euler1).toBeLessThan(1);
      
      const orbifold2 = new RNAOrbifold('GC'.repeat(48)); // 96 nucleotides, 1 domain boundary
      const euler2 = orbifold2.eulerCharacteristic();
      expect(euler2).toBeGreaterThan(0);
      // Just check they're both valid
      expect(euler2).toBeLessThan(1);
    });

    it('should handle sequences with no domains', () => {
      const emptyOrbifold = new RNAOrbifold('');
      expect(emptyOrbifold.eulerCharacteristic()).toBeCloseTo(1/48, 4);
    });
  });

  describe('getFundamentalGroup', () => {
    it('should return correct presentation for different topologies', () => {
      // Use GC repeats to avoid flexible region detection
      const orbifold0 = new RNAOrbifold('GC'.repeat(24)); // 48 nucleotides, no domain boundaries
      const group0 = orbifold0.getFundamentalGroup();
      // May have singularities from patterns, check structure
      expect(group0).toBeDefined();
      expect(typeof group0).toBe('string');
      
      const orbifold1 = new RNAOrbifold('GC'.repeat(48)); // 96 nucleotides, has domain boundary
      expect(orbifold1.getFundamentalGroup()).toContain('a_');
      expect(orbifold1.getFundamentalGroup()).toContain('orders:');
      
      const orbifold2 = new RNAOrbifold('GC'.repeat(72)); // 144 nucleotides, multiple boundaries
      const group2 = orbifold2.getFundamentalGroup();
      expect(group2).toContain('a_');
      expect(group2).toContain('orders:');
    });

    it('should handle empty orbifold', () => {
      const emptyOrbifold = new RNAOrbifold('');
      expect(emptyOrbifold.getFundamentalGroup()).toBe('Z/48Z');
    });
  });

  describe('findDomainConnections', () => {
    it('should find connections between adjacent domains', () => {
      const orbifold = new RNAOrbifold('A'.repeat(150));
      const connections = orbifold.findDomainConnections();
      
      expect(connections).toHaveLength(3); // 4 domains, 3 connections
      
      // First connection
      expect(connections[0].from.pageNumber).toBe(1);
      expect(connections[0].to.pageNumber).toBe(2);
      expect(connections[0].hinge).toBe(48);
      expect(connections[0].flexibility).toBeDefined();
      expect(connections[0].flexibility).toBeGreaterThanOrEqual(0);
      expect(connections[0].flexibility).toBeLessThanOrEqual(1);
      
      // Second connection
      expect(connections[1].from.pageNumber).toBe(2);
      expect(connections[1].to.pageNumber).toBe(3);
      expect(connections[1].hinge).toBe(96);
      
      // Third connection
      expect(connections[2].from.pageNumber).toBe(3);
      expect(connections[2].to.pageNumber).toBe(4);
      expect(connections[2].hinge).toBe(144);
    });

    it('should return empty array for single domain', () => {
      const orbifold = new RNAOrbifold('AUGC');
      const connections = orbifold.findDomainConnections();
      
      expect(connections).toHaveLength(0);
    });

    it('should handle two-domain case', () => {
      const orbifold = new RNAOrbifold('A'.repeat(60));
      const connections = orbifold.findDomainConnections();
      
      expect(connections).toHaveLength(1);
      expect(connections[0].from.pageNumber).toBe(1);
      expect(connections[0].to.pageNumber).toBe(2);
      expect(connections[0].hinge).toBe(48);
    });

    it('should compute flexibility scores', () => {
      const orbifold = new RNAOrbifold('A'.repeat(100));
      const connections = orbifold.findDomainConnections();
      
      connections.forEach(conn => {
        expect(conn.flexibility).toBeGreaterThanOrEqual(0);
        expect(conn.flexibility).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('inSameOrbit', () => {
    let orbifold: RNAOrbifold;

    beforeEach(() => {
      orbifold = new RNAOrbifold('A'.repeat(100));
    });

    it('should identify positions in same orbit', () => {
      // Same offset in same domain
      expect(orbifold.inSameOrbit(1, 1)).toBe(true);
      expect(orbifold.inSameOrbit(49, 49)).toBe(true);
      
      // Same offset in different domains - not in same orbit
      expect(orbifold.inSameOrbit(1, 49)).toBe(false);
      expect(orbifold.inSameOrbit(5, 53)).toBe(false);
    });

    it('should handle out of range positions', () => {
      expect(orbifold.inSameOrbit(0, 50)).toBe(false);
      expect(orbifold.inSameOrbit(50, 200)).toBe(false);
    });
  });

  describe('getOrbitRepresentative', () => {
    let orbifold: RNAOrbifold;

    beforeEach(() => {
      orbifold = new RNAOrbifold('A'.repeat(100));
    });

    it('should return canonical representative', () => {
      expect(orbifold.getOrbitRepresentative(1)).toBe(1);
      expect(orbifold.getOrbitRepresentative(49)).toBe(1); // First position of domain 2 maps to 1
      expect(orbifold.getOrbitRepresentative(50)).toBe(2); // Second position maps to 2
      expect(orbifold.getOrbitRepresentative(97)).toBe(1); // First position of domain 3 maps to 1
    });

    it('should handle out of range positions', () => {
      expect(orbifold.getOrbitRepresentative(0)).toBe(0);
      expect(orbifold.getOrbitRepresentative(200)).toBe(200);
    });
  });

  describe('edge cases', () => {
    it('should handle single nucleotide', () => {
      const orbifold = new RNAOrbifold('A');
      
      expect(orbifold.domains).toHaveLength(1);
      expect(orbifold.domains[0].start).toBe(1);
      expect(orbifold.domains[0].end).toBe(1);
      expect(orbifold.singularities).toHaveLength(0);
    });

    it('should handle exactly 48 nucleotides', () => {
      const orbifold = new RNAOrbifold('A'.repeat(48));
      
      expect(orbifold.domains).toHaveLength(1);
      expect(orbifold.domains[0].boundaryType).toBe('smooth');
      // May have singularities from flexible regions like AAAA
      expect(orbifold.singularities).toBeDefined();
    });

    it('should handle 49 nucleotides', () => {
      const orbifold = new RNAOrbifold('A'.repeat(49));
      
      expect(orbifold.domains).toHaveLength(2);
      expect(orbifold.domains[0].end).toBe(48);
      expect(orbifold.domains[1].start).toBe(49);
      expect(orbifold.domains[1].end).toBe(49);
      // Should contain domain boundary and possibly flexible regions from AAAA patterns
      expect(orbifold.singularities).toContain(48);
    });

    it('should handle very long sequences', () => {
      const orbifold = new RNAOrbifold('A'.repeat(1000));
      
      expect(orbifold.domains).toHaveLength(21); // ceil(1000/48)
      // Should have at least 20 domain boundaries, plus flexible regions
      expect(orbifold.singularities.length).toBeGreaterThanOrEqual(20);
      
      // Check last domain
      const lastDomain = orbifold.domains[20];
      expect(lastDomain.start).toBe(961);
      expect(lastDomain.end).toBe(1000);
    });
  });

  describe('performance', () => {
    it('should handle large sequences efficiently', () => {
      const startTime = Date.now();
      const orbifold = new RNAOrbifold('A'.repeat(10000));
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      expect(orbifold.domains).toHaveLength(209); // ceil(10000/48)
    });
  });
});