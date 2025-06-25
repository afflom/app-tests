/**
 * 3D RNA Folding Library
 * 
 * Main entry point exposing all public APIs
 */

// Export types
export * from './types';
export * from './constants';

// Export dimensions
export { BaseDimension } from './dimensions/BaseDimension';
export { StructureDimension } from './dimensions/StructureDimension';
export { GeometryDimension } from './dimensions/GeometryDimension';
export { EnergyDimension } from './dimensions/EnergyDimension';
export { QuantumDimension } from './dimensions/QuantumDimension';

// Export core folder
export { RNAFolder } from './core/RNAFolder';

// Export utilities
export { ValidationUtils } from './utils/ValidationUtils';
export { VisualizationUtils } from './utils/VisualizationUtils';
export { DiagnosticUtils } from './utils/DiagnosticUtils';

// Convenience function for quick folding
import { RNAFolder } from './core/RNAFolder';
import { FoldingResult, FoldingParameters } from './types';

export async function foldRNA(
  sequence: string, 
  parameters?: Partial<FoldingParameters>
): Promise<FoldingResult> {
  const folder = new RNAFolder(parameters);
  return folder.fold(sequence);
}

// Version
export const VERSION = '1.0.0';