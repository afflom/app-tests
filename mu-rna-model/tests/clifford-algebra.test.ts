/**
 * Exhaustive tests for Clifford Algebra Cl(8,0) implementation
 */

import { CliffordAlgebra } from '../src/clifford-algebra';
import { ConformationalFields, CliffordElement } from '../src/types';

describe('CliffordAlgebra', () => {
  let algebra: CliffordAlgebra;

  beforeEach(() => {
    algebra = new CliffordAlgebra();
  });

  describe('initialization', () => {
    it('should create instance with correct dimension', () => {
      expect(algebra).toBeDefined();
      expect(algebra.getGradeKElements(0)).toContain('1');
    });

    it('should initialize all 256 basis blades', () => {
      let totalBlades = 0;
      for (let grade = 0; grade <= 8; grade++) {
        const blades = algebra.getGradeKElements(grade);
        totalBlades += blades.length;
        // Check binomial coefficient
        const expected = factorial(8) / (factorial(grade) * factorial(8 - grade));
        expect(blades.length).toBe(expected);
      }
      expect(totalBlades).toBe(256);
    });

    it('should correctly group blades by grade', () => {
      // Grade 0: scalar
      expect(algebra.getGradeKElements(0)).toEqual(['1']);
      
      // Grade 1: vectors
      const grade1 = algebra.getGradeKElements(1);
      expect(grade1).toHaveLength(8);
      expect(grade1).toContain('e0');
      expect(grade1).toContain('e7');
      
      // Grade 2: bivectors
      const grade2 = algebra.getGradeKElements(2);
      expect(grade2).toHaveLength(28);
      expect(grade2).toContain('e01');
      expect(grade2).toContain('e67');
      
      // Grade 8: pseudoscalar
      expect(algebra.getGradeKElements(8)).toEqual(['e01234567']);
    });
  });

  describe('fieldsToClifford', () => {
    it('should convert empty fields to scalar', () => {
      const fields: ConformationalFields = {
        e0: false, e1: false, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      };
      const clifford = algebra.fieldsToClifford(fields);
      
      expect(clifford.index).toBe(0);
      expect(clifford.grade).toBe(0);
      expect(clifford.components.get('1')).toBe(1);
      expect(clifford.components.size).toBe(1);
    });

    it('should convert single active field correctly', () => {
      const fields: ConformationalFields = {
        e0: true, e1: false, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      };
      const clifford = algebra.fieldsToClifford(fields);
      
      expect(clifford.index).toBe(1); // Binary: 00000001
      expect(clifford.grade).toBe(1);
      expect(clifford.components.get('e0')).toBe(1);
      expect(clifford.components.get('1')).toBe(1);
    });

    it('should convert multiple active fields correctly', () => {
      const fields: ConformationalFields = {
        e0: true, e1: true, e2: false, e3: false,
        e4: false, e5: false, e6: false, e7: false
      };
      const clifford = algebra.fieldsToClifford(fields);
      
      expect(clifford.index).toBe(3); // Binary: 00000011
      expect(clifford.grade).toBe(1);
      expect(clifford.components.get('e0')).toBe(1);
      expect(clifford.components.get('e1')).toBe(1);
    });

    it('should handle all fields active', () => {
      const fields: ConformationalFields = {
        e0: true, e1: true, e2: true, e3: true,
        e4: true, e5: true, e6: true, e7: true
      };
      const clifford = algebra.fieldsToClifford(fields);
      
      expect(clifford.index).toBe(255); // Binary: 11111111
      expect(clifford.components.size).toBe(9); // scalar + 8 vectors
    });

    it('should calculate correct index for various patterns', () => {
      const testCases = [
        { fields: { e0: true, e1: false, e2: false, e3: false, e4: false, e5: false, e6: false, e7: false }, index: 1 },
        { fields: { e0: false, e1: true, e2: false, e3: false, e4: false, e5: false, e6: false, e7: false }, index: 2 },
        { fields: { e0: true, e1: true, e2: false, e3: false, e4: false, e5: false, e6: false, e7: false }, index: 3 },
        { fields: { e0: false, e1: false, e2: false, e3: false, e4: false, e5: false, e6: false, e7: true }, index: 128 },
        { fields: { e0: true, e1: true, e2: true, e3: true, e4: false, e5: false, e6: false, e7: false }, index: 15 }
      ];

      testCases.forEach(({ fields, index }) => {
        const clifford = algebra.fieldsToClifford(fields as ConformationalFields);
        expect(clifford.index).toBe(index);
      });
    });
  });

  describe('cliffordToFields', () => {
    it('should convert scalar element to empty fields', () => {
      const element: CliffordElement = {
        grade: 0,
        components: new Map([['1', 1]]),
        index: 0
      };
      const fields = algebra.cliffordToFields(element);
      
      expect(fields.e0).toBe(false);
      expect(fields.e1).toBe(false);
      expect(fields.e2).toBe(false);
      expect(fields.e3).toBe(false);
      expect(fields.e4).toBe(false);
      expect(fields.e5).toBe(false);
      expect(fields.e6).toBe(false);
      expect(fields.e7).toBe(false);
    });

    it('should extract fields from vector components', () => {
      const element: CliffordElement = {
        grade: 1,
        components: new Map([['1', 1], ['e0', 1], ['e3', 1]]),
        index: 9
      };
      const fields = algebra.cliffordToFields(element);
      
      expect(fields.e0).toBe(true);
      expect(fields.e1).toBe(false);
      expect(fields.e2).toBe(false);
      expect(fields.e3).toBe(true);
      expect(fields.e4).toBe(false);
    });

    it('should ignore non-vector components', () => {
      const element: CliffordElement = {
        grade: 2,
        components: new Map([['1', 1], ['e0', 1], ['e01', 2], ['e012', 3]]),
        index: 1
      };
      const fields = algebra.cliffordToFields(element);
      
      expect(fields.e0).toBe(true);
      expect(fields.e1).toBe(false); // e01 and e012 are ignored
    });

    it('should handle zero coefficients', () => {
      const element: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 0], ['e1', 1], ['e2', 0.0001]]),
        index: 6
      };
      const fields = algebra.cliffordToFields(element);
      
      expect(fields.e0).toBe(false);
      expect(fields.e1).toBe(true);
      expect(fields.e2).toBe(true);
    });

    it('should round-trip conversion correctly', () => {
      const allPossibleFields: ConformationalFields[] = [];
      for (let i = 0; i < 256; i++) {
        const fields: ConformationalFields = {
          e0: (i & 1) !== 0,
          e1: (i & 2) !== 0,
          e2: (i & 4) !== 0,
          e3: (i & 8) !== 0,
          e4: (i & 16) !== 0,
          e5: (i & 32) !== 0,
          e6: (i & 64) !== 0,
          e7: (i & 128) !== 0
        };
        allPossibleFields.push(fields);
      }

      allPossibleFields.forEach(fields => {
        const clifford = algebra.fieldsToClifford(fields);
        const recovered = algebra.cliffordToFields(clifford);
        expect(recovered).toEqual(fields);
      });
    });
  });

  describe('geometricProduct', () => {
    it('should handle scalar multiplication', () => {
      const scalar: CliffordElement = {
        grade: 0,
        components: new Map([['1', 2]]),
        index: 0
      };
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 3]]),
        index: 1
      };
      
      const product = algebra.geometricProduct(scalar, vector);
      expect(product.components.get('e0')).toBe(6);
      expect(product.grade).toBe(1);
    });

    it('should compute e_i * e_i = 1 (Cl(8,0) signature)', () => {
      for (let i = 0; i < 8; i++) {
        const element: CliffordElement = {
          grade: 1,
          components: new Map([[`e${i}`, 1]]),
          index: 1 << i
        };
        
        const square = algebra.geometricProduct(element, element);
        expect(square.components.get('1')).toBe(1);
        expect(square.grade).toBe(0);
      }
    });

    it('should anticommute different basis vectors', () => {
      const e0: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      const e1: CliffordElement = {
        grade: 1,
        components: new Map([['e1', 1]]),
        index: 2
      };
      
      const prod01 = algebra.geometricProduct(e0, e1);
      const prod10 = algebra.geometricProduct(e1, e0);
      
      expect(prod01.components.get('e01')).toBe(1);
      expect(prod10.components.get('e01')).toBe(-1);
    });

    it('should handle complex products correctly', () => {
      const a: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 2], ['e1', 3]]),
        index: 3
      };
      const b: CliffordElement = {
        grade: 1,
        components: new Map([['e1', 1], ['e2', -1]]),
        index: 6
      };
      
      const product = algebra.geometricProduct(a, b);
      
      // e0 * e1 = e01
      expect(product.components.get('e01')).toBe(2);
      // e0 * e2 = e02
      expect(product.components.get('e02')).toBe(-2);
      // e1 * e1 = 1
      expect(product.components.get('1')).toBe(3);
      // e1 * e2 = e12
      expect(product.components.get('e12')).toBe(-3);
    });

    it('should remove zero components', () => {
      const a: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      const b: CliffordElement = {
        grade: 1,
        components: new Map([['e0', -1]]),
        index: 1
      };
      
      const sum: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1], ['e1', 1]]),
        index: 3
      };
      
      const product = algebra.geometricProduct(sum, b);
      expect(product.components.has('e0')).toBe(false); // Should be removed
    });

    it('should satisfy associativity', () => {
      const a: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 2]]),
        index: 1
      };
      const b: CliffordElement = {
        grade: 1,
        components: new Map([['e1', 3]]),
        index: 2
      };
      const c: CliffordElement = {
        grade: 1,
        components: new Map([['e2', 4]]),
        index: 4
      };
      
      const ab_c = algebra.geometricProduct(algebra.geometricProduct(a, b), c);
      const a_bc = algebra.geometricProduct(a, algebra.geometricProduct(b, c));
      
      expect(ab_c.components).toEqual(a_bc.components);
    });
  });

  describe('innerProduct', () => {
    it('should extract scalar part of geometric product', () => {
      const e0: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 2]]),
        index: 1
      };
      
      const inner = algebra.innerProduct(e0, e0);
      expect(inner).toBe(4); // 2 * 2 = 4
    });

    it('should return zero for orthogonal vectors', () => {
      const e0: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      const e1: CliffordElement = {
        grade: 1,
        components: new Map([['e1', 1]]),
        index: 2
      };
      
      const inner = algebra.innerProduct(e0, e1);
      expect(inner).toBe(0);
    });

    it('should handle mixed grade elements', () => {
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 3]]),
        index: 1
      };
      const bivector: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 2]]),
        index: 3
      };
      
      const inner = algebra.innerProduct(vector, bivector);
      expect(inner).toBe(0);
    });

    it('should compute correct inner product for compound elements', () => {
      const a: CliffordElement = {
        grade: 1,
        components: new Map([['1', 1], ['e0', 2], ['e1', 3]]),
        index: 3
      };
      const b: CliffordElement = {
        grade: 1,
        components: new Map([['1', 2], ['e0', 1], ['e1', -1]]),
        index: 3
      };
      
      const inner = algebra.innerProduct(a, b);
      // 1*2 + 2*1 + 3*(-1) = 2 + 2 - 3 = 1
      expect(inner).toBe(1);
    });
  });

  describe('outerProduct', () => {
    it('should compute wedge product correctly', () => {
      const e0: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      const e1: CliffordElement = {
        grade: 1,
        components: new Map([['e1', 1]]),
        index: 2
      };
      
      const wedge = algebra.outerProduct(e0, e1);
      expect(wedge.components.get('e01')).toBe(1);
      expect(wedge.grade).toBe(2);
    });

    it('should return zero for parallel vectors', () => {
      const e0: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 2]]),
        index: 1
      };
      
      const wedge = algebra.outerProduct(e0, e0);
      expect(wedge.components.size).toBe(0);
    });

    it('should be antisymmetric', () => {
      const e0: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      const e1: CliffordElement = {
        grade: 1,
        components: new Map([['e1', 1]]),
        index: 2
      };
      
      const wedge01 = algebra.outerProduct(e0, e1);
      const wedge10 = algebra.outerProduct(e1, e0);
      
      expect(wedge01.components.get('e01')).toBe(1);
      expect(wedge10.components.get('e01')).toBe(-1);
    });

    it('should handle grade addition correctly', () => {
      const bivector: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 1]]),
        index: 3
      };
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e2', 1]]),
        index: 4
      };
      
      const wedge = algebra.outerProduct(bivector, vector);
      expect(wedge.components.get('e012')).toBe(1);
      expect(wedge.grade).toBe(3);
    });

    it('should filter non-grade-increasing terms', () => {
      const mixed: CliffordElement = {
        grade: 2,
        components: new Map([['1', 1], ['e0', 2], ['e01', 3]]),
        index: 3
      };
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e2', 1]]),
        index: 4
      };
      
      const wedge = algebra.outerProduct(mixed, vector);
      expect(wedge.components.has('e2')).toBe(true); // 1 * e2
      expect(wedge.components.has('e02')).toBe(true); // e0 * e2
      expect(wedge.components.has('e012')).toBe(true); // e01 * e2
      expect(wedge.components.has('1')).toBe(false); // No scalar part
    });
  });

  describe('gradeProjection', () => {
    it('should extract specific grade components', () => {
      const mixed: CliffordElement = {
        grade: 3,
        components: new Map([
          ['1', 1],
          ['e0', 2],
          ['e01', 3],
          ['e012', 4]
        ]),
        index: 7
      };
      
      const grade0 = algebra.gradeProjection(mixed, 0);
      expect(grade0.components.get('1')).toBe(1);
      expect(grade0.components.size).toBe(1);
      
      const grade1 = algebra.gradeProjection(mixed, 1);
      expect(grade1.components.get('e0')).toBe(2);
      expect(grade1.components.size).toBe(1);
      
      const grade2 = algebra.gradeProjection(mixed, 2);
      expect(grade2.components.get('e01')).toBe(3);
      expect(grade2.components.size).toBe(1);
      
      const grade3 = algebra.gradeProjection(mixed, 3);
      expect(grade3.components.get('e012')).toBe(4);
      expect(grade3.components.size).toBe(1);
    });

    it('should return empty element for non-existent grade', () => {
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      
      const grade2 = algebra.gradeProjection(vector, 2);
      expect(grade2.components.size).toBe(0);
      expect(grade2.grade).toBe(2);
    });

    it('should handle all grades correctly', () => {
      // Create element with all grades
      const allGrades: CliffordElement = {
        grade: 8,
        components: new Map([
          ['1', 1],
          ['e0', 1],
          ['e01', 1],
          ['e012', 1],
          ['e0123', 1],
          ['e01234', 1],
          ['e012345', 1],
          ['e0123456', 1],
          ['e01234567', 1]
        ]),
        index: 255
      };
      
      for (let grade = 0; grade <= 8; grade++) {
        const proj = algebra.gradeProjection(allGrades, grade);
        expect(proj.components.size).toBeGreaterThan(0);
        expect(proj.grade).toBe(grade);
      }
    });
  });

  describe('reverse', () => {
    it('should not change scalars and vectors', () => {
      const scalar: CliffordElement = {
        grade: 0,
        components: new Map([['1', 5]]),
        index: 0
      };
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 3]]),
        index: 1
      };
      
      expect(algebra.reverse(scalar).components).toEqual(scalar.components);
      expect(algebra.reverse(vector).components).toEqual(vector.components);
    });

    it('should negate bivectors', () => {
      const bivector: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 2]]),
        index: 3
      };
      
      const reversed = algebra.reverse(bivector);
      expect(reversed.components.get('e01')).toBe(-2);
    });

    it('should apply correct signs for all grades', () => {
      const signs = [1, 1, -1, -1, 1, 1, -1, -1, 1]; // (-1)^(k(k-1)/2)
      
      for (let grade = 0; grade <= 8; grade++) {
        const blade = grade === 0 ? '1' : 'e' + Array.from({length: grade}, (_, i) => i).join('');
        const element: CliffordElement = {
          grade,
          components: new Map([[blade, 1]]),
          index: (1 << grade) - 1
        };
        
        const reversed = algebra.reverse(element);
        expect(reversed.components.get(blade)).toBe(signs[grade]);
      }
    });

    it('should satisfy reverse(AB) = reverse(B)reverse(A)', () => {
      const a: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 2]]),
        index: 1
      };
      const b: CliffordElement = {
        grade: 1,
        components: new Map([['e1', 3]]),
        index: 2
      };
      
      const ab = algebra.geometricProduct(a, b);
      const rev_ab = algebra.reverse(ab);
      
      const rev_b = algebra.reverse(b);
      const rev_a = algebra.reverse(a);
      const rev_b_rev_a = algebra.geometricProduct(rev_b, rev_a);
      
      expect(rev_ab.components).toEqual(rev_b_rev_a.components);
    });
  });

  describe('conjugate', () => {
    it('should apply correct signs for all grades', () => {
      const signs = [1, -1, -1, 1, 1, -1, -1, 1, 1]; // (-1)^(k(k+1)/2)
      
      for (let grade = 0; grade <= 8; grade++) {
        const blade = grade === 0 ? '1' : 'e' + Array.from({length: grade}, (_, i) => i).join('');
        const element: CliffordElement = {
          grade,
          components: new Map([[blade, 1]]),
          index: (1 << grade) - 1
        };
        
        const conjugated = algebra.conjugate(element);
        expect(conjugated.components.get(blade)).toBe(signs[grade]);
      }
    });

    it('should preserve index and grade', () => {
      const element: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 3], ['e23', -2]]),
        index: 12
      };
      
      const conjugated = algebra.conjugate(element);
      expect(conjugated.index).toBe(element.index);
      expect(conjugated.grade).toBe(element.grade);
    });
  });

  describe('normSquared', () => {
    it('should compute correct norm for vectors', () => {
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 3], ['e1', 4]]),
        index: 3
      };
      
      const norm2 = algebra.normSquared(vector);
      expect(norm2).toBe(25); // 3^2 + 4^2 = 25
    });

    it('should return square of scalar for scalar elements', () => {
      const scalar: CliffordElement = {
        grade: 0,
        components: new Map([['1', 5]]),
        index: 0
      };
      
      const norm2 = algebra.normSquared(scalar);
      expect(norm2).toBe(25);
    });

    it('should handle mixed grade elements', () => {
      const mixed: CliffordElement = {
        grade: 2,
        components: new Map([['1', 2], ['e0', 3], ['e01', 1]]),
        index: 3
      };
      
      const norm2 = algebra.normSquared(mixed);
      expect(norm2).toBeGreaterThan(0);
    });

    it('should return zero for zero element', () => {
      const zero: CliffordElement = {
        grade: 0,
        components: new Map(),
        index: 0
      };
      
      const norm2 = algebra.normSquared(zero);
      expect(norm2).toBe(0);
    });
  });

  describe('getBivectorInterpretation', () => {
    it('should extract bivector components with labels', () => {
      const element: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 0.8], ['e23', 0.6]]),
        index: 15
      };
      
      const interpretation = algebra.getBivectorInterpretation(element);
      expect(interpretation).toHaveLength(2);
      expect(interpretation[0]).toContain('Pairing ∧ Stacking');
      expect(interpretation[0]).toContain('0.80');
      expect(interpretation[1]).toContain('Sugar Pucker ∧ Backbone Torsion');
      expect(interpretation[1]).toContain('0.60');
    });

    it('should return empty array for non-bivector elements', () => {
      const vector: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      
      const interpretation = algebra.getBivectorInterpretation(vector);
      expect(interpretation).toHaveLength(0);
    });

    it('should ignore zero coefficients', () => {
      const element: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 0], ['e23', 1]]),
        index: 12
      };
      
      const interpretation = algebra.getBivectorInterpretation(element);
      expect(interpretation).toHaveLength(1);
      expect(interpretation[0]).toContain('Sugar Pucker ∧ Backbone Torsion');
    });

    it('should use correct field names', () => {
      const fieldNames = [
        'Pairing', 'Stacking', 'Sugar Pucker', 'Backbone Torsion',
        'Tertiary', 'Edge Access', 'Backbone Exposure', 'Ion Coordination'
      ];
      
      const element: CliffordElement = {
        grade: 2,
        components: new Map([['e67', 1]]),
        index: 192
      };
      
      const interpretation = algebra.getBivectorInterpretation(element);
      expect(interpretation[0]).toContain(`${fieldNames[6]} ∧ ${fieldNames[7]}`);
    });
  });

  describe('isStableConformation', () => {
    it('should identify helix pattern as stable', () => {
      const helix: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 0.9]]),
        index: 3
      };
      
      expect(algebra.isStableConformation(helix)).toBe(true);
    });

    it('should identify A-form pattern as stable', () => {
      const aform: CliffordElement = {
        grade: 2,
        components: new Map([['e23', 0.7]]),
        index: 12
      };
      
      expect(algebra.isStableConformation(aform)).toBe(true);
    });

    it('should identify combined patterns as stable', () => {
      const combined: CliffordElement = {
        grade: 2,
        components: new Map([['e01', 0.8], ['e23', 0.6]]),
        index: 15
      };
      
      expect(algebra.isStableConformation(combined)).toBe(true);
    });

    it('should reject unstable patterns', () => {
      const unstable: CliffordElement = {
        grade: 2,
        components: new Map([['e45', 0.5], ['e67', 0.3]]),
        index: 240
      };
      
      expect(algebra.isStableConformation(unstable)).toBe(false);
    });

    it('should require positive coefficients', () => {
      const negative: CliffordElement = {
        grade: 2,
        components: new Map([['e01', -0.5]]),
        index: 3
      };
      
      expect(algebra.isStableConformation(negative)).toBe(false);
    });

    it('should handle missing components', () => {
      const partial: CliffordElement = {
        grade: 1,
        components: new Map([['e0', 1]]),
        index: 1
      };
      
      expect(algebra.isStableConformation(partial)).toBe(false);
    });
  });
});

// Helper function
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}