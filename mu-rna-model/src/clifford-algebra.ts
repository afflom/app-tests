/**
 * Clifford Algebra Cl(8,0) Implementation
 *
 * This implements the real Clifford algebra with 8 generators,
 * representing the algebra of nucleotide conformations.
 */

import { ConformationalFields, CliffordElement } from './types';

/**
 * Basis blade representation
 */
interface BasisBlade {
  indices: number[]; // Which generators are included
  sign: number; // +1 or -1
}

/**
 * Clifford Algebra Cl(8,0)
 */
export class CliffordAlgebra {
  private readonly dimension = 8;
  private readonly basisBlades: Map<string, BasisBlade>;
  private readonly gradeMap: Map<number, string[]>;

  constructor() {
    this.basisBlades = new Map();
    this.gradeMap = new Map();
    this.initializeBasis();
  }

  /**
   * Initialize all 256 basis blades
   */
  private initializeBasis(): void {
    // Generate all 2^8 = 256 basis blades
    for (let i = 0; i < 256; i++) {
      const indices: number[] = [];

      // Extract which generators are in this blade
      for (let j = 0; j < 8; j++) {
        if (i & (1 << j)) {
          indices.push(j);
        }
      }

      const key = this.bladeName(indices);
      this.basisBlades.set(key, { indices, sign: 1 });

      // Group by grade
      const grade = indices.length;
      if (!this.gradeMap.has(grade)) {
        this.gradeMap.set(grade, []);
      }
      this.gradeMap.get(grade)!.push(key);
    }
  }

  /**
   * Generate blade name from indices
   */
  private bladeName(indices: number[]): string {
    if (indices.length === 0) return '1'; // Scalar
    return 'e' + indices.join('');
  }

  /**
   * Convert conformational fields to Clifford element
   */
  fieldsToClifford(fields: ConformationalFields): CliffordElement {
    const components = new Map<string, number>();

    // Start with scalar part
    components.set('1', 1);

    // Add vector parts for active fields
    const fieldArray = [
      fields.e0,
      fields.e1,
      fields.e2,
      fields.e3,
      fields.e4,
      fields.e5,
      fields.e6,
      fields.e7
    ];

    fieldArray.forEach((active, i) => {
      if (active) {
        components.set(`e${i}`, 1);
      }
    });

    // Calculate index (0-255)
    let index = 0;
    fieldArray.forEach((active, i) => {
      if (active) index |= 1 << i;
    });

    return {
      grade: this.calculateGrade(components),
      components,
      index
    };
  }

  /**
   * Convert Clifford element to conformational fields
   */
  cliffordToFields(element: CliffordElement): ConformationalFields {
    const fields: ConformationalFields = {
      e0: false,
      e1: false,
      e2: false,
      e3: false,
      e4: false,
      e5: false,
      e6: false,
      e7: false
    };

    // Extract active fields from components
    for (const [blade, coeff] of element.components) {
      if (blade.startsWith('e') && blade.length === 2 && coeff !== 0) {
        const index = parseInt(blade[1]);
        const fieldKey = `e${index}` as keyof ConformationalFields;
        fields[fieldKey] = true;
      }
    }

    return fields;
  }

  /**
   * Geometric product of two Clifford elements
   */
  geometricProduct(a: CliffordElement, b: CliffordElement): CliffordElement {
    const result = new Map<string, number>();

    // Multiply all component pairs
    for (const [bladeA, coeffA] of a.components) {
      for (const [bladeB, coeffB] of b.components) {
        const { blade, sign } = this.multiplyBlades(bladeA, bladeB);
        const coeff = coeffA * coeffB * sign;

        result.set(blade, (result.get(blade) || 0) + coeff);
      }
    }

    // Remove zero components
    for (const [blade, coeff] of result) {
      if (Math.abs(coeff) < 1e-10) {
        result.delete(blade);
      }
    }

    return {
      grade: this.calculateGrade(result),
      components: result,
      index: this.calculateIndex(result)
    };
  }

  /**
   * Multiply two basis blades
   */
  private multiplyBlades(a: string, b: string): { blade: string; sign: number } {
    // Handle scalar multiplication
    if (a === '1') return { blade: b, sign: 1 };
    if (b === '1') return { blade: a, sign: 1 };

    // Extract indices
    const indicesA = a.slice(1).split('').map(Number);
    const indicesB = b.slice(1).split('').map(Number);

    // Compute the product with sign from anticommutation
    let sign = 1;
    const resultIndices: number[] = [];

    // Process indices from A
    for (const i of indicesA) {
      resultIndices.push(i);
    }

    // Process indices from B, handling anticommutation
    for (const j of indicesB) {
      const pos = resultIndices.indexOf(j);

      if (pos === -1) {
        // j not in result, add it
        let insertPos = resultIndices.length;
        for (let k = 0; k < resultIndices.length; k++) {
          if (resultIndices[k] > j) {
            insertPos = k;
            break;
          }
        }
        resultIndices.splice(insertPos, 0, j);

        // Count swaps needed
        const swaps = resultIndices.length - 1 - insertPos;
        if (swaps % 2 === 1) sign *= -1;
      } else {
        // j already in result, it squares to 1 (Cl(8,0))
        resultIndices.splice(pos, 1);

        // Count swaps to bring together
        const swaps = resultIndices.length - pos;
        if (swaps % 2 === 1) sign *= -1;
      }
    }

    const blade = resultIndices.length === 0 ? '1' : this.bladeName(resultIndices);
    return { blade, sign };
  }

  /**
   * Calculate the grade of a Clifford element
   */
  private calculateGrade(components: Map<string, number>): number {
    let maxGrade = 0;

    for (const blade of components.keys()) {
      if (blade === '1') continue;
      const grade = blade.slice(1).length;
      maxGrade = Math.max(maxGrade, grade);
    }

    return maxGrade;
  }

  /**
   * Calculate index from components
   */
  private calculateIndex(components: Map<string, number>): number {
    let index = 0;

    for (const [blade, coeff] of components) {
      if (blade !== '1' && coeff !== 0) {
        const indices = blade.slice(1).split('').map(Number);
        for (const i of indices) {
          index |= 1 << i;
        }
      }
    }

    return index;
  }

  /**
   * Inner product (scalar part of geometric product)
   */
  innerProduct(a: CliffordElement, b: CliffordElement): number {
    const product = this.geometricProduct(a, b);
    return product.components.get('1') || 0;
  }

  /**
   * Outer product (wedge product)
   */
  outerProduct(a: CliffordElement, b: CliffordElement): CliffordElement {
    const result = new Map<string, number>();

    for (const [bladeA, coeffA] of a.components) {
      for (const [bladeB, coeffB] of b.components) {
        const gradeA = bladeA === '1' ? 0 : bladeA.slice(1).length;
        const gradeB = bladeB === '1' ? 0 : bladeB.slice(1).length;

        const { blade, sign } = this.multiplyBlades(bladeA, bladeB);
        const gradeResult = blade === '1' ? 0 : blade.slice(1).length;

        // Outer product only keeps terms where grade adds
        if (gradeResult === gradeA + gradeB) {
          const coeff = coeffA * coeffB * sign;
          result.set(blade, (result.get(blade) || 0) + coeff);
        }
      }
    }

    return {
      grade: this.calculateGrade(result),
      components: result,
      index: this.calculateIndex(result)
    };
  }

  /**
   * Get bivector interpretation of paired states
   */
  getBivectorInterpretation(element: CliffordElement): string[] {
    const interpretations: string[] = [];

    for (const [blade, coeff] of element.components) {
      if (blade.length === 3 && coeff !== 0) {
        // Bivectors have 2 indices
        const i1 = parseInt(blade[1]);
        const i2 = parseInt(blade[2]);

        const fieldNames = [
          'Pairing',
          'Stacking',
          'Sugar Pucker',
          'Backbone Torsion',
          'Tertiary',
          'Edge Access',
          'Backbone Exposure',
          'Ion Coordination'
        ];

        interpretations.push(
          `${fieldNames[i1]} ∧ ${fieldNames[i2]} (strength: ${coeff.toFixed(2)})`
        );
      }
    }

    return interpretations;
  }

  /**
   * Check if element represents a stable conformation
   */
  isStableConformation(element: CliffordElement): boolean {
    // Stable conformations have specific patterns
    // e.g., paired AND stacked (e0 ∧ e1)
    const hasHelixPattern =
      element.components.has('e01') && (element.components.get('e01') || 0) > 0;

    // C3'-endo AND canonical torsion (e2 ∧ e3)
    const hasAFormPattern =
      element.components.has('e23') && (element.components.get('e23') || 0) > 0;

    return hasHelixPattern || hasAFormPattern;
  }

  /**
   * Grade projection
   */
  gradeProjection(element: CliffordElement, grade: number): CliffordElement {
    const components = new Map<string, number>();

    const bladesOfGrade = this.gradeMap.get(grade) || [];
    for (const blade of bladesOfGrade) {
      const coeff = element.components.get(blade);
      if (coeff !== undefined && coeff !== 0) {
        components.set(blade, coeff);
      }
    }

    return {
      grade,
      components,
      index: this.calculateIndex(components)
    };
  }

  /**
   * Reverse operation (reverses order of basis vectors)
   */
  reverse(element: CliffordElement): CliffordElement {
    const components = new Map<string, number>();

    for (const [blade, coeff] of element.components) {
      const grade = blade === '1' ? 0 : blade.slice(1).length;
      // Reverse introduces sign (-1)^(k(k-1)/2) for grade k
      const sign = Math.pow(-1, (grade * (grade - 1)) / 2);
      components.set(blade, coeff * sign);
    }

    return {
      grade: element.grade,
      components,
      index: element.index
    };
  }

  /**
   * Clifford conjugation
   */
  conjugate(element: CliffordElement): CliffordElement {
    const components = new Map<string, number>();

    for (const [blade, coeff] of element.components) {
      const grade = blade === '1' ? 0 : blade.slice(1).length;
      // Conjugation introduces sign (-1)^(k(k+1)/2) for grade k
      const sign = Math.pow(-1, (grade * (grade + 1)) / 2);
      components.set(blade, coeff * sign);
    }

    return {
      grade: element.grade,
      components,
      index: element.index
    };
  }

  /**
   * Norm squared of element
   */
  normSquared(element: CliffordElement): number {
    const reversed = this.reverse(element);
    const product = this.geometricProduct(reversed, element);
    return product.components.get('1') || 0;
  }

  /**
   * Get all grade-k elements
   */
  getGradeKElements(k: number): string[] {
    return this.gradeMap.get(k) || [];
  }
}
