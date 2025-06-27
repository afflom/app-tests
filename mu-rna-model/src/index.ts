/**
 * MU:RNA Model - Public API
 *
 * Export all components of the Mathematical Universe RNA folding model
 */

// Core types
export * from './types';

// Mathematical structures
export { CliffordAlgebra } from './clifford-algebra';
export { RNAFiberBundle, RNAGaugeConnection } from './fiber-bundle';
export { E8Symmetry } from './e8-symmetry';
export { RNAOrbifold } from './orbifold';
export { RNAHomology } from './homology';

// Main model
export { MURNAModelImpl } from './mu-rna-model';

// Import for factory function
import { MURNAModelImpl } from './mu-rna-model';

// Convenience factory
export function createMURNAModel(sequence: string) {
  return new MURNAModelImpl(sequence);
}
