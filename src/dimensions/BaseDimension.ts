/**
 * Base Dimension - handles nucleotide properties and pairing
 */

import { RNABase, BaseType, BaseDimension as IBaseDimension } from '../types';
import { BASE_PAIRS, PAIR_STRENGTHS } from '../constants';

export class BaseDimension implements IBaseDimension {
  /**
   * Get the type of a base (purine or pyrimidine)
   */
  getType(base: RNABase): BaseType {
    return (base === 'A' || base === 'G') ? 'purine' : 'pyrimidine';
  }

  /**
   * Check if two bases can form a pair
   */
  canPair(base1: RNABase, base2: RNABase): boolean {
    return BASE_PAIRS[base1]?.includes(base2) || false;
  }

  /**
   * Get the strength of a base pair (number of hydrogen bonds)
   */
  getPairStrength(base1: RNABase, base2: RNABase): number {
    const key = base1 + base2;
    return PAIR_STRENGTHS[key] || 0;
  }

  /**
   * Calculate GC content of a sequence
   */
  calculateGCContent(sequence: string): number {
    const gcCount = (sequence.match(/[GC]/g) || []).length;
    return gcCount / sequence.length;
  }

  /**
   * Check if a sequence position is in a GC-rich region
   */
  isGCRich(sequence: string, position: number, windowSize: number = 10): boolean {
    const start = Math.max(0, position - Math.floor(windowSize / 2));
    const end = Math.min(sequence.length, position + Math.floor(windowSize / 2));
    const window = sequence.substring(start, end);
    return this.calculateGCContent(window) > 0.6;
  }

  /**
   * Find all possible pairing positions for a base
   */
  findPairingPartners(sequence: string, position: number, minDistance: number = 4): number[] {
    const base = sequence[position] as RNABase;
    const partners: number[] = [];

    for (let i = 0; i < sequence.length; i++) {
      if (Math.abs(i - position) >= minDistance) {
        const targetBase = sequence[i] as RNABase;
        if (this.canPair(base, targetBase)) {
          partners.push(i);
        }
      }
    }

    return partners;
  }

  /**
   * Calculate base stacking potential
   */
  getStackingPotential(base1: RNABase, base2: RNABase): number {
    // Purine-purine stacking is strongest
    if (this.getType(base1) === 'purine' && this.getType(base2) === 'purine') {
      return 1.0;
    }
    // Purine-pyrimidine is intermediate
    else if (this.getType(base1) !== this.getType(base2)) {
      return 0.7;
    }
    // Pyrimidine-pyrimidine is weakest
    else {
      return 0.4;
    }
  }

  /**
   * Validate RNA sequence
   */
  isValidSequence(sequence: string): boolean {
    return /^[AUGC]+$/.test(sequence);
  }

  /**
   * Convert DNA to RNA (T to U)
   */
  dnaToRna(sequence: string): string {
    return sequence.replace(/T/g, 'U');
  }

  /**
   * Get complementary base
   */
  getComplement(base: RNABase): RNABase | null {
    switch (base) {
      case 'A': return 'U';
      case 'U': return 'A';
      case 'G': return 'C';
      case 'C': return 'G';
      default: return null;
    }
  }
}