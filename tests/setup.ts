/**
 * Test setup and utilities
 */

import { Coordinate3D, FoldingResult, BasePair } from '../src/types';

// Mock Mathematical Universe for testing
export class MockMathematicalUniverse {
  analyze(value: bigint) {
    const num = Number(value);
    return {
      resonance: Math.sin(num * 0.1) * 5 + 5,
      fields: ['prime', 'fibonacci'].filter(() => Math.random() > 0.5),
      consciousness: Math.random(),
      stability: 0.5 + 0.5 * Math.cos(num * 0.05)
    };
  }
}

// Test data generators
export const TestData = {
  // Generate random RNA sequence
  randomSequence(length: number): string {
    const bases = ['A', 'U', 'G', 'C'];
    return Array.from({ length }, () => bases[Math.floor(Math.random() * 4)]).join('');
  },

  // Generate valid secondary structure
  validSecondary(length: number): string {
    const structure = Array(length).fill('.');
    let openCount = 0;
    
    for (let i = 0; i < length - 4; i++) {
      if (Math.random() < 0.3 && openCount < 10) {
        structure[i] = '(';
        openCount++;
      } else if (openCount > 0 && Math.random() < 0.3) {
        structure[i] = ')';
        openCount--;
      }
    }
    
    // Close all remaining
    for (let i = length - 1; i >= 0 && openCount > 0; i--) {
      if (structure[i] === '.') {
        structure[i] = ')';
        openCount--;
      }
    }
    
    return structure.join('');
  },

  // Create sample folding result
  sampleFoldingResult(sequence?: string): FoldingResult {
    const seq = sequence || 'AUGCAUGCAUGC';
    const n = seq.length;
    
    const coordinates: Coordinate3D[] = [];
    for (let i = 0; i < n; i++) {
      coordinates.push([i * 5.91, 0, 0]);
    }
    
    const pairs: BasePair[] = [
      { i: 0, j: 11, type: 'WC', strength: 2.0 },
      { i: 1, j: 10, type: 'WC', strength: 2.0 },
      { i: 2, j: 9, type: 'WC', strength: 3.0 }
    ];
    
    return {
      sequence: seq,
      secondary: '(((......)))',
      coordinates,
      pairs,
      energy: -5.5,
      metadata: {
        foldTime: 100,
        method: 'test',
        parameters: {}
      }
    };
  }
};

// Assertion helpers
export const Assertions = {
  // Check if coordinates are valid
  validCoordinates(coords: Coordinate3D[]): boolean {
    return coords.every(c => 
      c && c.length === 3 && 
      c.every(v => typeof v === 'number' && !isNaN(v))
    );
  },

  // Check if secondary structure is balanced
  balancedStructure(secondary: string): boolean {
    let count = 0;
    for (const char of secondary) {
      if (char === '(') count++;
      else if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  },

  // Check distance between coordinates
  distance(c1: Coordinate3D, c2: Coordinate3D): number {
    const dx = c1[0] - c2[0];
    const dy = c1[1] - c2[1];
    const dz = c1[2] - c2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // Check if value is within tolerance
  withinTolerance(actual: number, expected: number, tolerance: number = 0.01): boolean {
    return Math.abs(actual - expected) <= tolerance;
  }
};

// Test sequences from validation data
export const VALIDATION_SEQUENCES = {
  small: {
    seq1: 'GGGAAACCC',
    seq2: 'AUGCGCAU',
    seq3: 'GCGCAAGCGC'
  },
  medium: {
    seq1: 'GGGAAAUUUCCCGGGAAAUUUCCCGGGAAAUUUCCC',
    seq2: 'AUGCAUGCAUGCAUGCAUGCAUGCAUGCAUGCAUGC'
  },
  structured: {
    hairpin: 'GGGCAAAAAGCCC',
    stem: 'GGGGAAAACCCC',
    multiloop: 'GGGAAACCCCGGAAAACCCGGGAAACCCC'
  }
};

// Mock timers for testing
export function mockTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    reset: () => Date.now()
  };
}

// Environment setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(30000);