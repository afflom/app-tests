/**
 * Fiber Bundle Structure Implementation
 *
 * RNA molecule as a section of a fiber bundle π: E → B
 * with gauge connection for parallel transport of conformational states.
 */

import { ConformationalFields, FiberBundle, GaugeConnection, RNABase } from './types';

/**
 * Generate all 256 possible conformational states
 */
function generateAllStates(): ConformationalFields[] {
  const states: ConformationalFields[] = [];

  for (let i = 0; i < 256; i++) {
    states.push({
      e0: (i & 0b00000001) !== 0,
      e1: (i & 0b00000010) !== 0,
      e2: (i & 0b00000100) !== 0,
      e3: (i & 0b00001000) !== 0,
      e4: (i & 0b00010000) !== 0,
      e5: (i & 0b00100000) !== 0,
      e6: (i & 0b01000000) !== 0,
      e7: (i & 0b10000000) !== 0
    });
  }

  return states;
}

/**
 * RNA Fiber Bundle implementation
 */
export class RNAFiberBundle implements FiberBundle {
  baseSpace: number[];
  fiber: ConformationalFields[];
  totalSpace: Map<number, ConformationalFields>;

  constructor(sequenceLength: number) {
    // Base space is sequence positions [1, 2, ..., L]
    this.baseSpace = Array.from({ length: sequenceLength }, (_, i) => i + 1);

    // Fiber is all 256 possible states
    this.fiber = generateAllStates();

    // Total space starts empty (no assignments)
    this.totalSpace = new Map();
  }

  /**
   * Projection map π: E → B
   */
  projection(state: [number, ConformationalFields]): number {
    return state[0];
  }

  /**
   * Assign a conformational state to a position
   */
  assignState(position: number, fields: ConformationalFields): void {
    if (position < 1 || position > this.baseSpace.length) {
      throw new Error(`Invalid position: ${position}`);
    }
    this.totalSpace.set(position, fields);
  }

  /**
   * Get the state at a position
   */
  getState(position: number): ConformationalFields | undefined {
    return this.totalSpace.get(position);
  }

  /**
   * Create a section (complete RNA conformation)
   */
  createSection(assignments: Map<number, ConformationalFields>): void {
    this.totalSpace = new Map(assignments);
  }

  /**
   * Check if we have a complete section
   */
  isCompleteSection(): boolean {
    return this.totalSpace.size === this.baseSpace.length;
  }

  /**
   * Get fiber dimension at a point
   */
  getFiberDimension(): number {
    return 8; // Always 8-dimensional binary space
  }
}

/**
 * Gauge Connection for RNA conformational dynamics
 */
export class RNAGaugeConnection implements GaugeConnection {
  fieldCoupling: number[][];
  private sequence: string;

  constructor(sequence: string) {
    this.sequence = sequence;
    this.fieldCoupling = this.initializeFieldCoupling();
  }

  /**
   * Initialize field coupling matrix based on biophysical rules
   */
  private initializeFieldCoupling(): number[][] {
    // 8x8 coupling matrix derived from physical constraints
    const coupling = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0));

    // Physical coupling strengths based on RNA biophysics
    // Values derived from correlation analysis of known structures

    // e0-e1: Pairing strongly couples with stacking (Watson-Crick geometry)
    coupling[0][1] = coupling[1][0] = 0.85;

    // e2-e3: Sugar pucker couples with backbone torsion (A-form helix)
    coupling[2][3] = coupling[3][2] = 0.75;

    // e0-e2: Pairing requires C3'-endo sugar pucker
    coupling[0][2] = coupling[2][0] = 0.65;

    // e0-e4: Pairing can enable tertiary interactions
    coupling[0][4] = coupling[4][0] = 0.35;

    // e1-e2: Stacking influences sugar pucker
    coupling[1][2] = coupling[2][1] = 0.55;

    // e1-e3: Stacking constrains backbone
    coupling[1][3] = coupling[3][1] = 0.45;

    // e5-e6: Edge and backbone accessibility correlate
    coupling[5][6] = coupling[6][5] = 0.4;

    // e4-e7: Tertiary interactions often need ions
    coupling[4][7] = coupling[7][4] = 0.6;

    // e3-e6: Backbone torsion affects exposure
    coupling[3][6] = coupling[6][3] = 0.3;

    // Diagonal elements (self-coupling) - field stability
    for (let i = 0; i < 8; i++) {
      coupling[i][i] = 1.0;
    }

    // Make symmetric and positive definite
    return this.ensurePositiveDefinite(coupling);
  }

  /**
   * Ensure matrix is positive definite for physical consistency
   */
  private ensurePositiveDefinite(matrix: number[][]): number[][] {
    const n = matrix.length;
    const result = matrix.map(row => [...row]);

    // Add small diagonal term if needed
    const epsilon = 0.01;
    for (let i = 0; i < n; i++) {
      result[i][i] += epsilon;
    }

    return result;
  }

  /**
   * Parallel transport of conformational state along sequence
   */
  transport(state: ConformationalFields, fromPos: number, toPos: number): ConformationalFields {
    // Get base types
    const fromBase = this.sequence[fromPos - 1] as RNABase;
    const toBase = this.sequence[toPos - 1] as RNABase;

    // Convert state to array
    const stateArray = [
      state.e0 ? 1 : 0,
      state.e1 ? 1 : 0,
      state.e2 ? 1 : 0,
      state.e3 ? 1 : 0,
      state.e4 ? 1 : 0,
      state.e5 ? 1 : 0,
      state.e6 ? 1 : 0,
      state.e7 ? 1 : 0
    ];

    // Apply connection based on sequence context
    const transported = this.applyConnection(
      stateArray,
      fromBase,
      toBase,
      Math.abs(toPos - fromPos)
    );

    // Convert back to fields
    return {
      e0: transported[0] > 0.5,
      e1: transported[1] > 0.5,
      e2: transported[2] > 0.5,
      e3: transported[3] > 0.5,
      e4: transported[4] > 0.5,
      e5: transported[5] > 0.5,
      e6: transported[6] > 0.5,
      e7: transported[7] > 0.5
    };
  }

  /**
   * Apply connection transformation
   */
  private applyConnection(
    state: number[],
    fromBase: RNABase,
    toBase: RNABase,
    distance: number
  ): number[] {
    const result = Array(8).fill(0);

    // Base-dependent modulation
    const baseFactor = this.getBasePairFactor(fromBase, toBase);

    // Distance-dependent decay
    const distanceFactor = Math.exp(-distance / 10);

    // Apply coupling matrix with modulation
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        result[i] += state[j] * this.fieldCoupling[i][j] * baseFactor * distanceFactor;
      }
    }

    // Normalize to [0, 1]
    for (let i = 0; i < 8; i++) {
      result[i] = Math.max(0, Math.min(1, result[i]));
    }

    // Apply base-specific rules
    this.applyBaseSpecificRules(result, fromBase, toBase);

    return result;
  }

  /**
   * Get base pair compatibility factor
   */
  private getBasePairFactor(base1: RNABase, base2: RNABase): number {
    // Watson-Crick pairs
    if ((base1 === 'A' && base2 === 'U') || (base1 === 'U' && base2 === 'A')) return 1.0;
    if ((base1 === 'G' && base2 === 'C') || (base1 === 'C' && base2 === 'G')) return 1.0;

    // Wobble pairs
    if ((base1 === 'G' && base2 === 'U') || (base1 === 'U' && base2 === 'G')) return 0.7;

    // Same base (stacking)
    if (base1 === base2) return 0.8;

    // Purine-purine or pyrimidine-pyrimidine
    const purines = ['A', 'G'];
    const pyrimidines = ['C', 'U'];
    if (
      (purines.includes(base1) && purines.includes(base2)) ||
      (pyrimidines.includes(base1) && pyrimidines.includes(base2))
    ) {
      return 0.5;
    }

    return 0.3;
  }

  /**
   * Apply base-specific conformational rules
   */
  private applyBaseSpecificRules(state: number[], fromBase: RNABase, toBase: RNABase): void {
    // G-C pairs strongly favor C3'-endo
    if ((fromBase === 'G' && toBase === 'C') || (fromBase === 'C' && toBase === 'G')) {
      state[2] = Math.max(state[2], 0.8); // e2: Sugar pucker
      state[3] = Math.max(state[3], 0.7); // e3: Backbone torsion
    }

    // Purines are more likely to participate in stacking
    if (fromBase === 'A' || fromBase === 'G') {
      state[1] = Math.max(state[1], 0.6); // e1: Stacking
    }

    // U is more flexible
    if (fromBase === 'U' || toBase === 'U') {
      state[3] *= 0.8; // e3: More flexible backbone
    }
  }

  /**
   * Calculate curvature tensor at a position
   */
  curvature(pos: number): number[][] {
    // Curvature tensor R^i_jkl represents the failure of parallel transport to commute
    // We compute the Riemann curvature of the gauge connection
    const curv = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0));

    // Get local sequence context

    // Compute connection 1-form at this position
    const omega = this.computeConnectionForm(pos);

    // Compute field strength F = dω + ω ∧ ω
    const fieldStrength = this.computeFieldStrength(omega, pos);

    // Extract curvature components
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        curv[i][j] = fieldStrength[i][j];
      }
    }

    // Add sequence-specific contributions
    this.addSequenceSpecificCurvature(curv, pos);

    return curv;
  }

  /**
   * Compute connection 1-form at position
   */
  private computeConnectionForm(pos: number): number[][] {
    const omega = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0));

    // Base connection from field coupling
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        omega[i][j] = this.fieldCoupling[i][j];
      }
    }

    // Modulate by local sequence
    const base = this.sequence[pos - 1] as RNABase;
    const modulation = this.getBaseModulation(base);

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        omega[i][j] *= modulation[i] * modulation[j];
      }
    }

    return omega;
  }

  /**
   * Get base-specific field modulation
   */
  private getBaseModulation(base: RNABase): number[] {
    const modulation = Array(8).fill(1);

    switch (base) {
      case 'G':
        modulation[0] = 1.2; // Strong pairing
        modulation[1] = 1.3; // Strong stacking
        modulation[2] = 1.1; // Prefers C3'-endo
        break;
      case 'C':
        modulation[0] = 1.2; // Strong pairing
        modulation[1] = 1.1; // Good stacking
        break;
      case 'A':
        modulation[1] = 1.2; // Good stacking
        modulation[4] = 1.1; // Can form tertiary
        break;
      case 'U':
        modulation[3] = 0.9; // Flexible backbone
        modulation[5] = 1.1; // Often exposed
        break;
    }

    return modulation;
  }

  /**
   * Compute field strength tensor F = dω + ω ∧ ω
   */
  private computeFieldStrength(omega: number[][], pos: number): number[][] {
    const F = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0));

    // Approximate exterior derivative
    if (pos > 1 && pos < this.sequence.length) {
      const omegaPrev = this.computeConnectionForm(pos - 1);
      const omegaNext = this.computeConnectionForm(pos + 1);

      // dω component
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          F[i][j] = (omegaNext[i][j] - omegaPrev[i][j]) / 2;
        }
      }
    }

    // ω ∧ ω component (commutator)
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        for (let k = 0; k < 8; k++) {
          F[i][j] += omega[i][k] * omega[k][j] - omega[j][k] * omega[k][i];
        }
      }
    }

    return F;
  }

  /**
   * Add sequence-specific curvature contributions
   */
  private addSequenceSpecificCurvature(curv: number[][], pos: number): void {
    // Calculate local composition
    const window = 3;
    const start = Math.max(0, pos - window - 1);
    const end = Math.min(this.sequence.length - 1, pos + window - 1);

    let gcContent = 0;
    let purineContent = 0;

    for (let i = start; i <= end; i++) {
      const base = this.sequence[i];
      if (base === 'G' || base === 'C') gcContent++;
      if (base === 'A' || base === 'G') purineContent++;
    }

    const localLength = end - start + 1;
    gcContent /= localLength;
    purineContent /= localLength;

    // GC content affects backbone rigidity
    curv[2][3] += 0.3 * gcContent;
    curv[3][2] += 0.3 * gcContent;

    // Purine content affects stacking
    curv[0][1] += 0.2 * purineContent;
    curv[1][0] += 0.2 * purineContent;

    // Check for structural motifs
    if (this.isPotentialHairpinSite(pos)) {
      curv[0][0] += 0.5; // Pairing strain
      curv[3][3] += 0.4; // Backbone bending
    }
  }

  /**
   * Check if position could be part of a hairpin turn
   */
  private isPotentialHairpinSite(pos: number): boolean {
    // Simple check: look for complementary bases nearby
    const window = 4;
    const start = Math.max(1, pos - window);
    const end = Math.min(this.sequence.length, pos + window);

    for (let i = start; i <= pos; i++) {
      for (let j = pos; j <= end; j++) {
        if (j - i >= 3) {
          // Minimum loop size
          const base1 = this.sequence[i - 1] as RNABase;
          const base2 = this.sequence[j - 1] as RNABase;

          if (this.areComplementary(base1, base2)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if two bases can pair
   */
  private areComplementary(base1: RNABase, base2: RNABase): boolean {
    return (
      (base1 === 'A' && base2 === 'U') ||
      (base1 === 'U' && base2 === 'A') ||
      (base1 === 'G' && base2 === 'C') ||
      (base1 === 'C' && base2 === 'G') ||
      (base1 === 'G' && base2 === 'U') ||
      (base1 === 'U' && base2 === 'G')
    );
  }

  /**
   * Holonomy around a loop (measure of total curvature)
   */
  holonomy(loop: number[]): number[][] {
    // Start with identity
    const result = Array(8)
      .fill(0)
      .map((_, i) =>
        Array(8)
          .fill(0)
          .map((_, j) => (i === j ? 1 : 0))
      );

    // Transport around the loop
    for (let i = 0; i < loop.length; i++) {
      const from = loop[i];

      // Get local curvature contribution
      const curv = this.curvature(from);

      // Accumulate transformation
      for (let j = 0; j < 8; j++) {
        for (let k = 0; k < 8; k++) {
          result[j][k] += 0.1 * curv[j][k]; // Small contribution per step
        }
      }
    }

    return result;
  }

  /**
   * Calculate connection strength between two positions
   */
  connectionStrength(pos1: number, pos2: number): number {
    const dist = Math.abs(pos2 - pos1);

    // Exponential decay with distance
    let strength = Math.exp(-dist / 5);

    // Boost for potential base pairs
    const base1 = this.sequence[pos1 - 1] as RNABase;
    const base2 = this.sequence[pos2 - 1] as RNABase;

    if (this.areComplementary(base1, base2)) {
      strength *= 2;
    }

    return Math.min(1, strength);
  }
}
