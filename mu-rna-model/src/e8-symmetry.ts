/**
 * E8 Symmetry Implementation
 *
 * The E8 Lie group is the master symmetry of the RNA folding landscape.
 * Its 240 non-identity roots correspond to stable nucleotide conformations.
 */

import { E8Structure, WeylGroupElement, ConformationalFields } from './types';

/**
 * E8 Root System and Symmetry
 */
export class E8Symmetry implements E8Structure {
  roots: number[][];
  weylGroup: WeylGroupElement[];
  dynkinDiagram: number[][];

  // E8 has 240 roots in 8 dimensions
  private static readonly ROOT_COUNT = 240;
  private static readonly DIMENSION = 8;

  constructor() {
    this.roots = this.generateE8Roots();
    this.dynkinDiagram = this.generateDynkinDiagram();
    this.weylGroup = this.generateWeylGroupGenerators();
    this.verifyCartanMatrix();
  }

  /**
   * Generate the 240 roots of E8
   * E8 roots have the form:
   * 1) ±ei ± ej for i ≠ j (112 roots)
   * 2) ½(±e1 ± e2 ± ... ± e8) with even number of minus signs (128 roots)
   */
  private generateE8Roots(): number[][] {
    const roots: number[][] = [];

    // Type 1: ±ei ± ej for i ≠ j
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        // +ei + ej
        const root1 = Array(8).fill(0);
        root1[i] = 1;
        root1[j] = 1;
        roots.push(root1);

        // +ei - ej
        const root2 = Array(8).fill(0);
        root2[i] = 1;
        root2[j] = -1;
        roots.push(root2);

        // -ei + ej
        const root3 = Array(8).fill(0);
        root3[i] = -1;
        root3[j] = 1;
        roots.push(root3);

        // -ei - ej
        const root4 = Array(8).fill(0);
        root4[i] = -1;
        root4[j] = -1;
        roots.push(root4);
      }
    }

    // Type 2: ½(±e1 ± e2 ± ... ± e8) with even number of minus signs
    for (let mask = 0; mask < 256; mask++) {
      const minusCount = this.countBits(mask);

      // Only even number of minus signs
      if (minusCount % 2 === 0) {
        const root = Array(8).fill(0);

        for (let i = 0; i < 8; i++) {
          root[i] = mask & (1 << i) ? -0.5 : 0.5;
        }

        roots.push(root);
      }
    }

    return roots;
  }

  /**
   * Count number of set bits
   */
  private countBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  /**
   * Generate E8 Dynkin diagram
   * The E8 Dynkin diagram has a specific structure:
   *         7
   *         |
   * 1-2-3-4-5-6-8
   */
  private generateDynkinDiagram(): number[][] {
    const diagram = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0));

    // Linear chain 1-2-3-4-5-6
    for (let i = 0; i < 5; i++) {
      diagram[i][i + 1] = diagram[i + 1][i] = 1;
    }

    // Branch at node 4 (index 3) to node 7 (index 6)
    diagram[3][6] = diagram[6][3] = 1;

    // Continue chain 6-8 (indices 5-7)
    diagram[5][7] = diagram[7][5] = 1;

    return diagram;
  }

  /**
   * Generate Weyl group generators (simple reflections)
   */
  private generateWeylGroupGenerators(): WeylGroupElement[] {
    const generators: WeylGroupElement[] = [];

    // For each simple root, create the reflection
    const simpleRoots = this.getSimpleRoots();

    for (let i = 0; i < simpleRoots.length; i++) {
      const root = simpleRoots[i];
      const reflection = this.createReflection(root);

      generators.push({
        matrix: reflection,
        order: 2, // Reflections have order 2
        conjugacyClass: i
      });
    }

    return generators;
  }

  /**
   * Get the 8 simple roots of E8
   */
  private getSimpleRoots(): number[][] {
    return [
      [1, -1, 0, 0, 0, 0, 0, 0], // α1
      [0, 1, -1, 0, 0, 0, 0, 0], // α2
      [0, 0, 1, -1, 0, 0, 0, 0], // α3
      [0, 0, 0, 1, -1, 0, 0, 0], // α4
      [0, 0, 0, 0, 1, -1, 0, 0], // α5
      [0, 0, 0, 0, 0, 1, -1, 0], // α6
      [0, 0, 0, 0, 0, 1, 1, 0], // α7
      [0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5] // α8 (corrected)
    ];
  }

  /**
   * Create reflection matrix for a root
   */
  private createReflection(root: number[]): number[][] {
    const matrix = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0));

    // Reflection formula: v → v - 2(v·α)/(α·α) * α
    const rootNormSq = this.dot(root, root);

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        matrix[i][j] = (i === j ? 1 : 0) - (2 * root[i] * root[j]) / rootNormSq;
      }
    }

    return matrix;
  }

  /**
   * Dot product of two vectors
   */
  private dot(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  /**
   * Check if a conformational state corresponds to an E8 root
   */
  isE8Root(fields: ConformationalFields): boolean {
    // Convert fields to vector
    const vector = this.fieldsToVector(fields);

    // Check against all roots (with small tolerance)
    const tolerance = 0.01;

    return this.roots.some(root => {
      const diff = root.map((val, i) => Math.abs(val - vector[i]));
      return diff.every(d => d < tolerance);
    });
  }

  /**
   * Convert conformational fields to normalized vector
   */
  private fieldsToVector(fields: ConformationalFields): number[] {
    // Map fields to E8 root space with physical meaning
    const vector = Array(8).fill(0);

    // Paired and stacked states map to first coordinates
    if (fields.e0 && fields.e1) {
      vector[0] = 1;
      vector[1] = 1;
    } else if (fields.e0) {
      vector[0] = 1;
      vector[1] = -1;
    } else if (fields.e1) {
      vector[0] = -1;
      vector[1] = 1;
    } else {
      vector[0] = -1;
      vector[1] = -1;
    }

    // Sugar and backbone
    vector[2] = fields.e2 ? 1 : -1;
    vector[3] = fields.e3 ? 1 : -1;

    // Tertiary and accessibility
    vector[4] = fields.e4 ? 1 : -1;
    vector[5] = fields.e5 ? 1 : -1;

    // Exposure and ions
    vector[6] = fields.e6 ? 1 : -1;
    vector[7] = fields.e7 ? 1 : -1;

    // Normalize to E8 root length (norm squared = 2)
    const currentNorm = Math.sqrt(this.dot(vector, vector));
    const targetNorm = Math.sqrt(2);
    return vector.map(v => (v * targetNorm) / currentNorm);
  }

  /**
   * Find closest E8 root to a given state
   */
  closestRoot(fields: ConformationalFields): { root: number[]; distance: number } {
    const vector = this.fieldsToVector(fields);

    let minDistance = Infinity;
    let closestRoot = this.roots[0];

    for (const root of this.roots) {
      const distance = Math.sqrt(
        root.reduce((sum, val, i) => sum + Math.pow(val - vector[i], 2), 0)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestRoot = root;
      }
    }

    return { root: closestRoot, distance: minDistance };
  }

  /**
   * Apply Weyl group element to a state
   */
  applyWeylTransformation(
    fields: ConformationalFields,
    element: WeylGroupElement
  ): ConformationalFields {
    const vector = this.fieldsToVector(fields);
    const transformed = this.matrixVectorMultiply(element.matrix, vector);

    // Convert back to fields (threshold at 0)
    return {
      e0: transformed[0] > 0,
      e1: transformed[1] > 0,
      e2: transformed[2] > 0,
      e3: transformed[3] > 0,
      e4: transformed[4] > 0,
      e5: transformed[5] > 0,
      e6: transformed[6] > 0,
      e7: transformed[7] > 0
    };
  }

  /**
   * Matrix-vector multiplication
   */
  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => this.dot(row, vector));
  }

  /**
   * Find the orbit of a state under Weyl group action
   */
  weylOrbit(fields: ConformationalFields): ConformationalFields[] {
    const orbit = new Set<string>();
    const toProcess = [fields];

    while (toProcess.length > 0) {
      const current = toProcess.pop()!;
      const key = this.fieldsToKey(current);

      if (orbit.has(key)) continue;
      orbit.add(key);

      // Apply all generators
      for (const generator of this.weylGroup) {
        const transformed = this.applyWeylTransformation(current, generator);
        const transformedKey = this.fieldsToKey(transformed);

        if (!orbit.has(transformedKey)) {
          toProcess.push(transformed);
        }
      }

      // Limit orbit size to prevent infinite loops
      if (orbit.size > 1000) break;
    }

    // Convert back to array
    return Array.from(orbit).map(key => this.keyToFields(key));
  }

  /**
   * Convert fields to string key
   */
  private fieldsToKey(fields: ConformationalFields): string {
    return (
      `${fields.e0 ? '1' : '0'}${fields.e1 ? '1' : '0'}${fields.e2 ? '1' : '0'}` +
      `${fields.e3 ? '1' : '0'}${fields.e4 ? '1' : '0'}${fields.e5 ? '1' : '0'}` +
      `${fields.e6 ? '1' : '0'}${fields.e7 ? '1' : '0'}`
    );
  }

  /**
   * Convert string key to fields
   */
  private keyToFields(key: string): ConformationalFields {
    return {
      e0: key[0] === '1',
      e1: key[1] === '1',
      e2: key[2] === '1',
      e3: key[3] === '1',
      e4: key[4] === '1',
      e5: key[5] === '1',
      e6: key[6] === '1',
      e7: key[7] === '1'
    };
  }

  /**
   * Get the stability score based on E8 proximity
   */
  stabilityScore(fields: ConformationalFields): number {
    const { distance } = this.closestRoot(fields);

    // Convert distance to stability score (closer = more stable)
    // Use exponential decay
    return Math.exp(-distance * 2);
  }

  /**
   * Find all stable conformations (close to E8 roots)
   */
  getStableConformations(threshold: number = 0.1): ConformationalFields[] {
    const stable: ConformationalFields[] = [];

    // Check all 256 possible states
    for (let i = 0; i < 256; i++) {
      const fields: ConformationalFields = {
        e0: (i & 0b00000001) !== 0,
        e1: (i & 0b00000010) !== 0,
        e2: (i & 0b00000100) !== 0,
        e3: (i & 0b00001000) !== 0,
        e4: (i & 0b00010000) !== 0,
        e5: (i & 0b00100000) !== 0,
        e6: (i & 0b01000000) !== 0,
        e7: (i & 0b10000000) !== 0
      };

      const { distance } = this.closestRoot(fields);

      if (distance < threshold) {
        stable.push(fields);
      }
    }

    return stable;
  }

  /**
   * Get root system statistics
   */
  getRootSystemStats(): {
    totalRoots: number;
    positiveRoots: number;
    rootLengths: Set<number>;
    maximalRoot: number[];
  } {
    const lengths = new Set<number>();
    let positiveCount = 0;
    let maxLength = 0;
    let maximalRoot = this.roots[0];

    for (const root of this.roots) {
      const length = Math.sqrt(this.dot(root, root));
      lengths.add(Number(length.toFixed(6)));

      // Count positive roots (first non-zero coordinate is positive)
      const firstNonZero = root.find(x => x !== 0);
      if (firstNonZero && firstNonZero > 0) {
        positiveCount++;
      }

      if (length > maxLength) {
        maxLength = length;
        maximalRoot = root;
      }
    }

    return {
      totalRoots: this.roots.length,
      positiveRoots: positiveCount,
      rootLengths: lengths,
      maximalRoot
    };
  }

  /**
   * Verify the Cartan matrix is correct for E8
   */
  private verifyCartanMatrix(): void {
    const simpleRoots = this.getSimpleRoots();
    const cartan = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0));

    // Compute Cartan matrix: A_ij = 2(αi·αj)/(αi·αi)
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const innerProduct = this.dot(simpleRoots[i], simpleRoots[j]);
        const normSquared = this.dot(simpleRoots[i], simpleRoots[i]);
        cartan[i][j] = Math.round((2 * innerProduct) / normSquared);
      }
    }

    // Expected E8 Cartan matrix
    const expected = [
      [2, -1, 0, 0, 0, 0, 0, 0],
      [-1, 2, -1, 0, 0, 0, 0, 0],
      [0, -1, 2, -1, 0, 0, 0, 0],
      [0, 0, -1, 2, -1, 0, 0, 0],
      [0, 0, 0, -1, 2, -1, 0, 0],
      [0, 0, 0, 0, -1, 2, -1, 0],
      [0, 0, 0, 0, 0, -1, 2, -1],
      [0, 0, 0, -1, 0, 0, -1, 2]
    ];

    // Verify
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (cartan[i][j] !== expected[i][j]) {
          console.warn(
            `Cartan matrix mismatch at (${i},${j}): expected ${expected[i][j]}, got ${cartan[i][j]}`
          );
        }
      }
    }
  }
}
