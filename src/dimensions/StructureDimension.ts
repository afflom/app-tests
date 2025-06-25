/**
 * Structure Dimension - handles secondary structure prediction and analysis
 */

import { 
  SecondaryStructure, 
  BasePair, 
  StructureDimension as IStructureDimension,
  RNABase 
} from '../types';
import { RNA_CONSTANTS } from '../constants';
import { BaseDimension } from './BaseDimension';

export class StructureDimension implements IStructureDimension {
  private baseDimension: BaseDimension;

  constructor() {
    this.baseDimension = new BaseDimension();
  }

  /**
   * Predict secondary structure using dynamic programming
   */
  predictSecondary(sequence: string): SecondaryStructure {
    const n = sequence.length;
    const dp: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const traceback: number[][] = Array(n).fill(null).map(() => Array(n).fill(-1));

    // Fill DP table
    for (let length = RNA_CONSTANTS.MIN_LOOP_SIZE + 2; length <= n; length++) {
      for (let i = 0; i <= n - length; i++) {
        const j = i + length - 1;
        let maxPairs = dp[i][j];

        // Try pairing i and j
        if (this.baseDimension.canPair(sequence[i] as RNABase, sequence[j] as RNABase)) {
          const pairScore = 1 + (i + 1 <= j - 1 ? dp[i + 1][j - 1] : 0);
          if (pairScore > maxPairs) {
            maxPairs = pairScore;
            traceback[i][j] = j; // Mark as paired
          }
        }

        // Try all possible splits
        for (let k = i; k < j; k++) {
          const splitScore = dp[i][k] + dp[k + 1][j];
          if (splitScore > maxPairs) {
            maxPairs = splitScore;
            traceback[i][j] = k; // Mark split point
          }
        }

        dp[i][j] = maxPairs;
      }
    }

    // Reconstruct structure
    const structure = '.'.repeat(n).split('');
    this.tracebackStructure(traceback, structure, 0, n - 1, sequence);
    
    return structure.join('');
  }

  /**
   * Traceback to reconstruct secondary structure
   */
  private tracebackStructure(
    traceback: number[][], 
    structure: string[], 
    i: number, 
    j: number,
    sequence: string
  ): void {
    if (i >= j) return;

    const k = traceback[i][j];
    if (k === -1) return;

    if (k === j) {
      // i and j are paired
      structure[i] = '(';
      structure[j] = ')';
      this.tracebackStructure(traceback, structure, i + 1, j - 1, sequence);
    } else {
      // Split at k
      this.tracebackStructure(traceback, structure, i, k, sequence);
      this.tracebackStructure(traceback, structure, k + 1, j, sequence);
    }
  }

  /**
   * Extract base pairs from secondary structure
   */
  extractPairs(secondary: SecondaryStructure): BasePair[] {
    const pairs: BasePair[] = [];
    const stack: number[] = [];

    for (let i = 0; i < secondary.length; i++) {
      if (secondary[i] === '(') {
        stack.push(i);
      } else if (secondary[i] === ')' && stack.length > 0) {
        const j = stack.pop()!;
        pairs.push({
          i: j,
          j: i,
          type: 'WC', // Simplified - would need sequence to determine actual type
          strength: 2.5 // Average strength
        });
      }
    }

    return pairs;
  }

  /**
   * Validate secondary structure
   */
  validateStructure(secondary: SecondaryStructure): boolean {
    let openCount = 0;

    for (const char of secondary) {
      if (char === '(') {
        openCount++;
      } else if (char === ')') {
        openCount--;
        if (openCount < 0) return false;
      } else if (char !== '.') {
        return false; // Invalid character
      }
    }

    return openCount === 0;
  }

  /**
   * Find structural motifs in secondary structure
   */
  findMotifs(secondary: SecondaryStructure): Array<{type: string, start: number, end: number}> {
    const motifs: Array<{type: string, start: number, end: number}> = [];
    const pairs = this.extractPairs(secondary);

    // Find hairpins
    for (const pair of pairs) {
      let isHairpin = true;
      for (let k = pair.i + 1; k < pair.j; k++) {
        if (secondary[k] !== '.') {
          isHairpin = false;
          break;
        }
      }
      if (isHairpin && pair.j - pair.i - 1 >= RNA_CONSTANTS.MIN_LOOP_SIZE) {
        motifs.push({
          type: 'hairpin',
          start: pair.i,
          end: pair.j
        });
      }
    }

    // Find stems (consecutive base pairs)
    let stemStart = -1;
    let stemLength = 0;
    
    for (let i = 0; i < secondary.length - 1; i++) {
      if (secondary[i] === '(' && secondary[i + 1] === '(') {
        if (stemStart === -1) stemStart = i;
        stemLength++;
      } else if (stemStart !== -1 && stemLength >= 2) {
        motifs.push({
          type: 'stem',
          start: stemStart,
          end: stemStart + stemLength
        });
        stemStart = -1;
        stemLength = 0;
      }
    }

    return motifs;
  }

  /**
   * Calculate base pair probability matrix
   */
  calculatePairProbabilities(sequence: string): number[][] {
    const n = sequence.length;
    const probMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Simple probability based on compatibility and distance
    for (let i = 0; i < n; i++) {
      for (let j = i + RNA_CONSTANTS.MIN_LOOP_SIZE + 1; j < n; j++) {
        if (this.baseDimension.canPair(sequence[i] as RNABase, sequence[j] as RNABase)) {
          const distance = j - i;
          // Probability decreases with distance
          probMatrix[i][j] = Math.exp(-distance / 50) * 
            this.baseDimension.getPairStrength(sequence[i] as RNABase, sequence[j] as RNABase) / 3;
          probMatrix[j][i] = probMatrix[i][j];
        }
      }
    }

    return probMatrix;
  }

  /**
   * Convert dot-bracket to pairs with type information
   */
  structureToPairs(secondary: SecondaryStructure, sequence: string): BasePair[] {
    const pairs: BasePair[] = [];
    const stack: number[] = [];

    for (let i = 0; i < secondary.length; i++) {
      if (secondary[i] === '(') {
        stack.push(i);
      } else if (secondary[i] === ')' && stack.length > 0) {
        const j = stack.pop()!;
        const base1 = sequence[j] as RNABase;
        const base2 = sequence[i] as RNABase;
        
        let type: 'WC' | 'wobble' | 'non-canonical' = 'non-canonical';
        if ((base1 === 'A' && base2 === 'U') || (base1 === 'U' && base2 === 'A') ||
            (base1 === 'G' && base2 === 'C') || (base1 === 'C' && base2 === 'G')) {
          type = 'WC';
        } else if ((base1 === 'G' && base2 === 'U') || (base1 === 'U' && base2 === 'G')) {
          type = 'wobble';
        }

        pairs.push({
          i: j,
          j: i,
          type,
          strength: this.baseDimension.getPairStrength(base1, base2)
        });
      }
    }

    return pairs;
  }

  /**
   * Calculate structure complexity
   */
  calculateComplexity(secondary: SecondaryStructure): number {
    const motifs = this.findMotifs(secondary);
    const pairs = this.extractPairs(secondary);
    
    // Complexity based on number of structural elements
    return motifs.length * 0.3 + pairs.length * 0.1;
  }
}