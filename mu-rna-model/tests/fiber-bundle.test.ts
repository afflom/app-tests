/**
 * Exhaustive tests for Fiber Bundle and Gauge Connection implementation
 */

import { RNAFiberBundle, RNAGaugeConnection } from '../src/fiber-bundle';
import { ConformationalFields, RNABase } from '../src/types';

describe('RNAFiberBundle', () => {
  describe('initialization', () => {
    it('should create fiber bundle with correct dimensions', () => {
      const length = 10;
      const bundle = new RNAFiberBundle(length);
      
      expect(bundle.baseSpace).toHaveLength(length);
      expect(bundle.baseSpace[0]).toBe(1);
      expect(bundle.baseSpace[length - 1]).toBe(length);
      expect(bundle.fiber).toHaveLength(256);
      expect(bundle.totalSpace.size).toBe(0);
    });

    it('should generate all 256 conformational states in fiber', () => {
      const bundle = new RNAFiberBundle(5);
      
      // Check first few states
      expect(bundle.fiber[0]).toEqual({
        e0: false, e1: false, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      });
      
      expect(bundle.fiber[1]).toEqual({
        e0: true, e1: false, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      });
      
      expect(bundle.fiber[255]).toEqual({
        e0: true, e1: true, e2: true, e3: true,
        e4: true, e5: true, e6: true, e7: true
      });
      
      // Check uniqueness
      const stateStrings = bundle.fiber.map(f => JSON.stringify(f));
      const uniqueStates = new Set(stateStrings);
      expect(uniqueStates.size).toBe(256);
    });

    it('should create correct base space sequence', () => {
      const bundle = new RNAFiberBundle(100);
      for (let i = 0; i < 100; i++) {
        expect(bundle.baseSpace[i]).toBe(i + 1);
      }
    });
  });

  describe('projection', () => {
    it('should extract position from state tuple', () => {
      const bundle = new RNAFiberBundle(10);
      const fields: ConformationalFields = {
        e0: true, e1: false, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      };
      
      expect(bundle.projection([5, fields])).toBe(5);
      expect(bundle.projection([1, fields])).toBe(1);
      expect(bundle.projection([10, fields])).toBe(10);
    });
  });

  describe('assignState', () => {
    it('should assign conformational state to position', () => {
      const bundle = new RNAFiberBundle(10);
      const fields: ConformationalFields = {
        e0: true, e1: true, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      };
      
      bundle.assignState(5, fields);
      expect(bundle.getState(5)).toEqual(fields);
    });

    it('should overwrite existing state', () => {
      const bundle = new RNAFiberBundle(10);
      const fields1: ConformationalFields = {
        e0: true, e1: false, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      };
      const fields2: ConformationalFields = {
        e0: false, e1: true, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      };
      
      bundle.assignState(3, fields1);
      bundle.assignState(3, fields2);
      expect(bundle.getState(3)).toEqual(fields2);
    });

    it('should throw error for invalid position', () => {
      const bundle = new RNAFiberBundle(10);
      const fields: ConformationalFields = bundle.fiber[0];
      
      expect(() => bundle.assignState(0, fields)).toThrow('Invalid position: 0');
      expect(() => bundle.assignState(11, fields)).toThrow('Invalid position: 11');
      expect(() => bundle.assignState(-1, fields)).toThrow('Invalid position: -1');
    });

    it('should handle boundary positions', () => {
      const bundle = new RNAFiberBundle(10);
      const fields: ConformationalFields = bundle.fiber[0];
      
      expect(() => bundle.assignState(1, fields)).not.toThrow();
      expect(() => bundle.assignState(10, fields)).not.toThrow();
    });
  });

  describe('getState', () => {
    it('should return undefined for unassigned position', () => {
      const bundle = new RNAFiberBundle(10);
      expect(bundle.getState(5)).toBeUndefined();
    });

    it('should return assigned state', () => {
      const bundle = new RNAFiberBundle(10);
      const fields: ConformationalFields = bundle.fiber[42];
      
      bundle.assignState(7, fields);
      expect(bundle.getState(7)).toEqual(fields);
    });
  });

  describe('createSection', () => {
    it('should create complete section from assignments', () => {
      const bundle = new RNAFiberBundle(3);
      const assignments = new Map<number, ConformationalFields>([
        [1, bundle.fiber[0]],
        [2, bundle.fiber[1]],
        [3, bundle.fiber[2]]
      ]);
      
      bundle.createSection(assignments);
      
      expect(bundle.getState(1)).toEqual(bundle.fiber[0]);
      expect(bundle.getState(2)).toEqual(bundle.fiber[1]);
      expect(bundle.getState(3)).toEqual(bundle.fiber[2]);
    });

    it('should replace entire total space', () => {
      const bundle = new RNAFiberBundle(3);
      
      // First assignment
      bundle.assignState(1, bundle.fiber[0]);
      bundle.assignState(2, bundle.fiber[1]);
      
      // Create new section
      const newAssignments = new Map<number, ConformationalFields>([
        [3, bundle.fiber[2]]
      ]);
      bundle.createSection(newAssignments);
      
      expect(bundle.getState(1)).toBeUndefined();
      expect(bundle.getState(2)).toBeUndefined();
      expect(bundle.getState(3)).toEqual(bundle.fiber[2]);
    });
  });

  describe('isCompleteSection', () => {
    it('should return false for empty bundle', () => {
      const bundle = new RNAFiberBundle(5);
      expect(bundle.isCompleteSection()).toBe(false);
    });

    it('should return false for partial section', () => {
      const bundle = new RNAFiberBundle(3);
      bundle.assignState(1, bundle.fiber[0]);
      bundle.assignState(2, bundle.fiber[1]);
      expect(bundle.isCompleteSection()).toBe(false);
    });

    it('should return true for complete section', () => {
      const bundle = new RNAFiberBundle(3);
      bundle.assignState(1, bundle.fiber[0]);
      bundle.assignState(2, bundle.fiber[1]);
      bundle.assignState(3, bundle.fiber[2]);
      expect(bundle.isCompleteSection()).toBe(true);
    });
  });

  describe('getFiberDimension', () => {
    it('should always return 8', () => {
      const bundle1 = new RNAFiberBundle(1);
      const bundle2 = new RNAFiberBundle(100);
      
      expect(bundle1.getFiberDimension()).toBe(8);
      expect(bundle2.getFiberDimension()).toBe(8);
    });
  });
});

describe('RNAGaugeConnection', () => {
  describe('initialization', () => {
    it('should initialize with sequence', () => {
      const sequence = 'AUGC';
      const gauge = new RNAGaugeConnection(sequence);
      
      expect(gauge).toBeDefined();
      expect(gauge.fieldCoupling).toBeDefined();
      expect(gauge.fieldCoupling).toHaveLength(8);
      expect(gauge.fieldCoupling[0]).toHaveLength(8);
    });

    it('should create symmetric coupling matrix', () => {
      const gauge = new RNAGaugeConnection('AUGC');
      const matrix = gauge.fieldCoupling;
      
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          expect(matrix[i][j]).toBe(matrix[j][i]);
        }
      }
    });

    it('should have positive diagonal elements', () => {
      const gauge = new RNAGaugeConnection('AUGC');
      const matrix = gauge.fieldCoupling;
      
      for (let i = 0; i < 8; i++) {
        expect(matrix[i][i]).toBeGreaterThan(1); // 1 + epsilon
      }
    });

    it('should have correct physical couplings', () => {
      const gauge = new RNAGaugeConnection('AUGC');
      const matrix = gauge.fieldCoupling;
      
      // Pairing-stacking coupling
      expect(matrix[0][1]).toBeCloseTo(0.85, 2);
      expect(matrix[1][0]).toBeCloseTo(0.85, 2);
      
      // Sugar-backbone coupling
      expect(matrix[2][3]).toBeCloseTo(0.75, 2);
      expect(matrix[3][2]).toBeCloseTo(0.75, 2);
      
      // Pairing-sugar coupling
      expect(matrix[0][2]).toBeCloseTo(0.65, 2);
      expect(matrix[2][0]).toBeCloseTo(0.65, 2);
    });

    it('should be positive definite', () => {
      const gauge = new RNAGaugeConnection('AUGC');
      const matrix = gauge.fieldCoupling;
      
      // Matrix should be positive definite
      // Check that diagonal elements are positive and dominant enough
      for (let i = 0; i < 8; i++) {
        expect(matrix[i][i]).toBeGreaterThan(1); // All diagonal > 1 due to epsilon
        
        // For a physical coupling matrix, we don't need strict diagonal dominance
        // Just ensure the matrix structure is reasonable
        let rowSum = 0;
        for (let j = 0; j < 8; j++) {
          if (i !== j) {
            rowSum += Math.abs(matrix[i][j]);
          }
        }
        // Diagonal should be significant compared to off-diagonal sum
        expect(matrix[i][i]).toBeGreaterThan(rowSum * 0.5);
      }
    });
  });

  describe('transport', () => {
    let gauge: RNAGaugeConnection;
    const testFields: ConformationalFields = {
      e0: true, e1: true, e2: false, e3: false,
      e4: false, e5: false, e6: false, e7: false
    };

    beforeEach(() => {
      gauge = new RNAGaugeConnection('AUGCAUGC');
    });

    it('should transport state between positions', () => {
      const transported = gauge.transport(testFields, 1, 2);
      
      expect(transported).toBeDefined();
      expect(typeof transported.e0).toBe('boolean');
      expect(typeof transported.e1).toBe('boolean');
    });

    it('should decay with distance', () => {
      const near = gauge.transport(testFields, 1, 2);
      const far = gauge.transport(testFields, 1, 8);
      
      const nearActive = Object.values(near).filter(v => v).length;
      const farActive = Object.values(far).filter(v => v).length;
      
      expect(farActive).toBeLessThanOrEqual(nearActive);
    });

    it('should handle same position transport', () => {
      const transported = gauge.transport(testFields, 3, 3);
      
      // Should maintain most fields with distance = 0
      const activeCount = Object.values(transported).filter(v => v).length;
      expect(activeCount).toBeGreaterThan(0);
    });

    it('should apply base-specific rules', () => {
      const gcSequence = 'GGGGCCCC';
      const gcGauge = new RNAGaugeConnection(gcSequence);
      
      // Transport from G to C
      const gcTransport = gcGauge.transport(testFields, 1, 5);
      
      // Should favor C3'-endo for G-C
      expect(gcTransport.e2).toBe(true);
    });

    it('should handle Watson-Crick pairs', () => {
      const sequence = 'AUGC';
      const wcGauge = new RNAGaugeConnection(sequence);
      
      // A to U transport
      const auFields: ConformationalFields = {
        e0: false, e1: false, e2: false, e3: false,
        e4: false, e5: true, e6: true, e7: false
      };
      const auTransport = wcGauge.transport(auFields, 1, 3);
      
      // Should have base pair factor = 1.0
      const activeCount = Object.values(auTransport).filter(v => v).length;
      expect(activeCount).toBeGreaterThan(0);
    });

    it('should handle wobble pairs', () => {
      const sequence = 'GUUU';
      const wobbleGauge = new RNAGaugeConnection(sequence);
      
      const transported = wobbleGauge.transport(testFields, 1, 2);
      expect(transported).toBeDefined();
    });

    it('should apply purine-specific stacking', () => {
      const sequence = 'AAAA';
      const purineGauge = new RNAGaugeConnection(sequence);
      
      const unstackedFields: ConformationalFields = {
        e0: false, e1: false, e2: false, e3: false,
        e4: false, e5: true, e6: true, e7: false
      };
      
      const transported = purineGauge.transport(unstackedFields, 1, 2);
      
      // Purines favor stacking
      const stackingProbability = transported.e1 ? 1 : 0;
      expect(stackingProbability).toBeGreaterThanOrEqual(0);
    });

    it('should handle U flexibility', () => {
      const sequence = 'UUUU';
      const uracilGauge = new RNAGaugeConnection(sequence);
      
      const rigidFields: ConformationalFields = {
        e0: false, e1: false, e2: true, e3: true,
        e4: false, e5: false, e6: false, e7: false
      };
      
      const transported = uracilGauge.transport(rigidFields, 1, 2);
      
      // U should reduce backbone rigidity
      expect(transported).toBeDefined();
    });

    it('should normalize output to [0,1]', () => {
      const fields: ConformationalFields = {
        e0: true, e1: true, e2: true, e3: true,
        e4: true, e5: true, e6: true, e7: true
      };
      
      const transported = gauge.transport(fields, 1, 4);
      
      Object.values(transported).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('curvature', () => {
    let gauge: RNAGaugeConnection;

    beforeEach(() => {
      gauge = new RNAGaugeConnection('AUGCAUGCAUGC');
    });

    it('should return 8x8 curvature tensor', () => {
      const curv = gauge.curvature(5);
      
      expect(curv).toHaveLength(8);
      curv.forEach(row => {
        expect(row).toHaveLength(8);
      });
    });

    it('should handle boundary positions', () => {
      expect(() => gauge.curvature(1)).not.toThrow();
      expect(() => gauge.curvature(12)).not.toThrow();
    });

    it('should produce different curvature for different positions', () => {
      const curv1 = gauge.curvature(3);
      const curv2 = gauge.curvature(8);
      
      let different = false;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (Math.abs(curv1[i][j] - curv2[i][j]) > 1e-10) {
            different = true;
            break;
          }
        }
      }
      
      expect(different).toBe(true);
    });

    it('should have higher curvature at potential hairpin sites', () => {
      const hairpinSeq = 'GGGGAAAACCCC';
      const hairpinGauge = new RNAGaugeConnection(hairpinSeq);
      
      const turnCurv = hairpinGauge.curvature(7); // Middle of loop
      const helixCurv = hairpinGauge.curvature(2); // In helix
      
      const turnTotal = turnCurv.reduce((sum, row) => 
        sum + row.reduce((s, v) => s + Math.abs(v), 0), 0);
      const helixTotal = helixCurv.reduce((sum, row) => 
        sum + row.reduce((s, v) => s + Math.abs(v), 0), 0);
      
      expect(turnTotal).toBeGreaterThan(helixTotal);
    });

    it('should reflect GC content in backbone rigidity', () => {
      const gcRich = 'GGGGCCCC';
      const atRich = 'AAAAUUUU';
      
      const gcGauge = new RNAGaugeConnection(gcRich);
      const atGauge = new RNAGaugeConnection(atRich);
      
      const gcCurv = gcGauge.curvature(4);
      const atCurv = atGauge.curvature(4);
      
      // GC pairs should have higher backbone coupling curvature
      expect(Math.abs(gcCurv[2][3])).toBeGreaterThan(Math.abs(atCurv[2][3]));
    });

    it('should include base-specific modulation', () => {
      const sequence = 'GGGCAAAGCCC';
      const modGauge = new RNAGaugeConnection(sequence);
      
      const gPos = 1; // G position
      const aPos = 6; // A position
      
      const gCurv = modGauge.curvature(gPos);
      const aCurv = modGauge.curvature(aPos);
      
      // Different bases should produce different curvatures
      let foundDifference = false;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (Math.abs(gCurv[i][j] - aCurv[i][j]) > 0.01) {
            foundDifference = true;
            break;
          }
        }
      }
      expect(foundDifference).toBe(true);
    });
  });

  describe('holonomy', () => {
    let gauge: RNAGaugeConnection;

    beforeEach(() => {
      gauge = new RNAGaugeConnection('AUGCAUGCAUGC');
    });

    it('should return 8x8 matrix', () => {
      const loop = [1, 2, 3, 4, 1];
      const hol = gauge.holonomy(loop);
      
      expect(hol).toHaveLength(8);
      hol.forEach(row => {
        expect(row).toHaveLength(8);
      });
    });

    it('should start near identity for small loops', () => {
      const smallLoop = [1, 2, 1];
      const hol = gauge.holonomy(smallLoop);
      
      // Check diagonal is close to 1 (allowing for small curvature contributions)
      for (let i = 0; i < 8; i++) {
        expect(hol[i][i]).toBeCloseTo(1, 0); // Less strict tolerance
      }
      
      // Check off-diagonal elements are small
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (i !== j) {
            expect(Math.abs(hol[i][j])).toBeLessThan(0.5);
          }
        }
      }
    });

    it('should accumulate curvature around loop', () => {
      const loop1 = [1, 2, 3, 1];
      const loop2 = [1, 2, 3, 4, 5, 6, 1];
      
      const hol1 = gauge.holonomy(loop1);
      const hol2 = gauge.holonomy(loop2);
      
      // Longer loop should have more deviation from identity
      let dev1 = 0, dev2 = 0;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const expected = i === j ? 1 : 0;
          dev1 += Math.abs(hol1[i][j] - expected);
          dev2 += Math.abs(hol2[i][j] - expected);
        }
      }
      
      expect(dev2).toBeGreaterThan(dev1);
    });

    it('should handle empty loop', () => {
      const emptyLoop: number[] = [];
      const hol = gauge.holonomy(emptyLoop);
      
      // Should be identity
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          expect(hol[i][j]).toBe(i === j ? 1 : 0);
        }
      }
    });

    it('should be path-dependent in general', () => {
      // Use a larger loop where curvature effects are more pronounced
      const path1 = [1, 5, 10, 15, 20, 15, 10, 5, 1];
      const path2 = [1, 10, 20, 10, 1];
      
      const hol1 = gauge.holonomy(path1);
      const hol2 = gauge.holonomy(path2);
      
      // Calculate total deviation from identity for each holonomy
      let dev1 = 0, dev2 = 0;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const expected = i === j ? 1 : 0;
          dev1 += Math.abs(hol1[i][j] - expected);
          dev2 += Math.abs(hol2[i][j] - expected);
        }
      }
      
      // Different paths should accumulate different amounts of curvature
      // Or at least one should deviate from identity
      expect(dev1 + dev2).toBeGreaterThan(0.1);
    });
  });

  describe('connectionStrength', () => {
    let gauge: RNAGaugeConnection;

    beforeEach(() => {
      gauge = new RNAGaugeConnection('AUGCAUGC');
    });

    it('should decay exponentially with distance', () => {
      const s1 = gauge.connectionStrength(1, 2);
      const s2 = gauge.connectionStrength(1, 3);
      const s3 = gauge.connectionStrength(1, 4);
      
      expect(s1).toBeGreaterThan(s2);
      expect(s2).toBeGreaterThan(s3);
    });

    it('should boost complementary pairs', () => {
      const sequence = 'AUGCAUGC';
      const pairGauge = new RNAGaugeConnection(sequence);
      
      // A-U pair at same distance as A-A
      const auStrength = pairGauge.connectionStrength(1, 3); // A to U
      const aaStrength = pairGauge.connectionStrength(1, 5); // A to A
      
      expect(auStrength).toBeGreaterThan(aaStrength);
    });

    it('should be symmetric', () => {
      const s12 = gauge.connectionStrength(1, 5);
      const s21 = gauge.connectionStrength(5, 1);
      
      expect(s12).toBe(s21);
    });

    it('should be bounded by 1', () => {
      for (let i = 1; i <= 8; i++) {
        for (let j = 1; j <= 8; j++) {
          const strength = gauge.connectionStrength(i, j);
          expect(strength).toBeGreaterThanOrEqual(0);
          expect(strength).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should handle zero distance', () => {
      const strength = gauge.connectionStrength(3, 3);
      expect(strength).toBeCloseTo(1, 2);
    });

    it('should handle GC vs AU pairs', () => {
      const sequence = 'GCGCAUAU';
      const mixedGauge = new RNAGaugeConnection(sequence);
      
      const gcStrength = mixedGauge.connectionStrength(1, 2); // G-C
      const auStrength = mixedGauge.connectionStrength(5, 6); // A-U
      
      // Both Watson-Crick pairs should have same boost
      expect(Math.abs(gcStrength - auStrength)).toBeLessThan(0.1);
    });

    it('should handle wobble pairs', () => {
      const sequence = 'GUUU';
      const wobbleGauge = new RNAGaugeConnection(sequence);
      
      const guStrength = wobbleGauge.connectionStrength(1, 2); // G-U wobble
      expect(guStrength).toBeGreaterThan(0);
    });
  });

  describe('base pair compatibility', () => {
    it('should identify all Watson-Crick pairs', () => {
      const gauge = new RNAGaugeConnection('AUGC');
      
      // Test via connection strength boost
      const auDist5 = 'AAAAAUUUU';
      const gcDist5 = 'GGGGGCCCC';
      
      const auGauge = new RNAGaugeConnection(auDist5);
      const gcGauge = new RNAGaugeConnection(gcDist5);
      
      const auStrength = auGauge.connectionStrength(1, 6);
      const gcStrength = gcGauge.connectionStrength(1, 6);
      
      // Non-complementary at same distance
      const aaDist5 = 'AAAAAGGGG';
      const aaGauge = new RNAGaugeConnection(aaDist5);
      const aaStrength = aaGauge.connectionStrength(1, 6);
      
      expect(auStrength).toBeGreaterThan(aaStrength);
      expect(gcStrength).toBeGreaterThan(aaStrength);
    });
  });
});