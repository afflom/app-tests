/**
 * Validation utilities for RNA structures
 */

import { Coordinate3D, FoldingResult } from '../types';
import { RNA_CONSTANTS } from '../constants';
import { GeometryDimension } from '../dimensions/GeometryDimension';

export class ValidationUtils {
  private static geometryDim = new GeometryDimension();

  /**
   * Calculate RMSD between predicted and actual coordinates
   */
  static calculateRMSD(predicted: Coordinate3D[], actual: Coordinate3D[]): number {
    return this.geometryDim.rmsd(predicted, actual);
  }

  /**
   * Validate backbone connectivity
   */
  static validateBackbone(coordinates: Coordinate3D[]): {
    valid: boolean;
    errors: number;
    averageDistance: number;
  } {
    let errors = 0;
    let totalDistance = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const dist = this.geometryDim.distance(coordinates[i], coordinates[i-1]);
      totalDistance += dist;
      
      if (Math.abs(dist - RNA_CONSTANTS.BACKBONE_DISTANCE) > 1.0) {
        errors++;
      }
    }
    
    return {
      valid: errors === 0,
      errors,
      averageDistance: coordinates.length > 1 ? totalDistance / (coordinates.length - 1) : 0
    };
  }

  /**
   * Check for steric clashes
   */
  static checkStericClashes(coordinates: Coordinate3D[], threshold: number = 3.5): {
    clashes: number;
    pairs: Array<[number, number]>;
  } {
    const clashes: Array<[number, number]> = [];
    
    for (let i = 0; i < coordinates.length; i++) {
      for (let j = i + 4; j < coordinates.length; j++) {
        const dist = this.geometryDim.distance(coordinates[i], coordinates[j]);
        
        if (dist < threshold) {
          clashes.push([i, j]);
        }
      }
    }
    
    return {
      clashes: clashes.length,
      pairs: clashes
    };
  }

  /**
   * Validate base pair distances
   */
  static validateBasePairs(result: FoldingResult): {
    valid: boolean;
    errors: number;
    averageDistance: number;
  } {
    let errors = 0;
    let totalDistance = 0;
    
    for (const pair of result.pairs) {
      const dist = this.geometryDim.distance(
        result.coordinates[pair.i],
        result.coordinates[pair.j]
      );
      totalDistance += dist;
      
      if (Math.abs(dist - RNA_CONSTANTS.BASE_PAIR_DISTANCE) > 2.0) {
        errors++;
      }
    }
    
    return {
      valid: errors === 0,
      errors,
      averageDistance: result.pairs.length > 0 ? 
        totalDistance / result.pairs.length : 0
    };
  }

  /**
   * Calculate structure quality score
   */
  static calculateQualityScore(result: FoldingResult): number {
    const backboneValidation = this.validateBackbone(result.coordinates);
    const pairValidation = this.validateBasePairs(result);
    const clashCheck = this.checkStericClashes(result.coordinates);
    
    // Quality components
    const backboneQuality = 1.0 - (backboneValidation.errors / result.coordinates.length);
    const pairQuality = 1.0 - (pairValidation.errors / Math.max(1, result.pairs.length));
    const clashQuality = 1.0 - Math.min(1, clashCheck.clashes / result.coordinates.length);
    
    // Weighted average
    return 0.4 * backboneQuality + 0.4 * pairQuality + 0.2 * clashQuality;
  }

  /**
   * Generate validation report
   */
  static generateReport(result: FoldingResult): string {
    const backbone = this.validateBackbone(result.coordinates);
    const pairs = this.validateBasePairs(result);
    const clashes = this.checkStericClashes(result.coordinates);
    const quality = this.calculateQualityScore(result);
    
    return `
RNA Structure Validation Report
==============================
Sequence Length: ${result.sequence.length}
Base Pairs: ${result.pairs.length}
Energy: ${result.energy.toFixed(2)} kcal/mol

Backbone Validation:
  Valid: ${backbone.valid}
  Errors: ${backbone.errors}
  Average Distance: ${backbone.averageDistance.toFixed(2)}Å
  Target Distance: ${RNA_CONSTANTS.BACKBONE_DISTANCE}Å

Base Pair Validation:
  Valid: ${pairs.valid}
  Errors: ${pairs.errors}
  Average Distance: ${pairs.averageDistance.toFixed(2)}Å
  Target Distance: ${RNA_CONSTANTS.BASE_PAIR_DISTANCE}Å

Steric Clashes:
  Count: ${clashes.clashes}
  Affected Positions: ${clashes.pairs.length > 0 ? 
    clashes.pairs.slice(0, 5).map(p => `(${p[0]},${p[1]})`).join(', ') + 
    (clashes.pairs.length > 5 ? '...' : '') : 'None'}

Overall Quality Score: ${(quality * 100).toFixed(1)}%
    `.trim();
  }

  /**
   * Check if structure is biologically plausible
   */
  static isBiologicallyPlausible(result: FoldingResult): boolean {
    const backbone = this.validateBackbone(result.coordinates);
    const pairs = this.validateBasePairs(result);
    const clashes = this.checkStericClashes(result.coordinates);
    
    // Criteria for biological plausibility
    return backbone.errors < result.coordinates.length * 0.1 && // <10% backbone errors
           pairs.errors < result.pairs.length * 0.2 && // <20% pair errors
           clashes.clashes < result.coordinates.length * 0.05; // <5% clashes
  }
}