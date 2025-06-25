/**
 * Diagnostic utilities for RNA folding analysis and tuning
 */

import { FoldingResult, Coordinate3D, BasePair } from '../types';
import { GeometryDimension } from '../dimensions/GeometryDimension';
import { StructureDimension } from '../dimensions/StructureDimension';
import * as fs from 'fs';
import * as path from 'path';

export class DiagnosticUtils {
  private static geometryDim = new GeometryDimension();
  private static structureDim = new StructureDimension();

  /**
   * Generate comprehensive diagnostic report
   */
  static generateDiagnosticReport(result: FoldingResult): {
    summary: any;
    structuralMetrics: any;
    geometricMetrics: any;
    energyBreakdown: any;
    issues: string[];
  } {
    const summary = {
      sequenceLength: result.sequence.length,
      basePairs: result.pairs.length,
      totalEnergy: result.energy,
      foldTime: result.metadata.foldTime,
      method: result.metadata.method
    };

    const structuralMetrics = this.analyzeStructure(result);
    const geometricMetrics = this.analyzeGeometry(result);
    const energyBreakdown = this.analyzeEnergy(result);
    const issues = this.identifyIssues(result, structuralMetrics, geometricMetrics);

    return {
      summary,
      structuralMetrics,
      geometricMetrics,
      energyBreakdown,
      issues
    };
  }

  /**
   * Analyze structural properties
   */
  private static analyzeStructure(result: FoldingResult) {
    const motifs = this.structureDim.findMotifs(result.secondary);
    const stems = motifs.filter(m => m.type === 'stem');
    const hairpins = motifs.filter(m => m.type === 'hairpin');
    
    // Calculate pairing statistics
    const pairStats = this.calculatePairStatistics(result.pairs);
    
    // Analyze secondary structure balance
    const unpaired = result.secondary.split('').filter(c => c === '.').length;
    const leftParen = result.secondary.split('').filter(c => c === '(').length;
    const rightParen = result.secondary.split('').filter(c => c === ')').length;

    return {
      motifs: {
        total: motifs.length,
        stems: stems.length,
        hairpins: hairpins.length,
        avgStemLength: stems.length > 0 ? 
          stems.reduce((sum, s) => sum + (s.end - s.start), 0) / stems.length : 0
      },
      pairing: {
        totalPairs: result.pairs.length,
        pairingRatio: result.pairs.length / (result.sequence.length / 2),
        unpaired: unpaired,
        balanced: leftParen === rightParen,
        wcPairs: pairStats.wcPairs,
        wobblePairs: pairStats.wobblePairs,
        nonCanonical: pairStats.nonCanonical
      },
      complexity: this.calculateStructuralComplexity(result.secondary)
    };
  }

  /**
   * Analyze geometric properties
   */
  private static analyzeGeometry(result: FoldingResult) {
    const coords = result.coordinates;
    const n = coords.length;
    
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    coords.forEach(coord => {
      minX = Math.min(minX, coord[0]);
      maxX = Math.max(maxX, coord[0]);
      minY = Math.min(minY, coord[1]);
      maxY = Math.max(maxY, coord[1]);
      minZ = Math.min(minZ, coord[2]);
      maxZ = Math.max(maxZ, coord[2]);
    });

    // Calculate radius of gyration
    const centerOfMass = this.geometryDim.centerOfMass(coords);
    let sumSquaredDist = 0;
    coords.forEach(coord => {
      const dist = this.geometryDim.distance(coord, centerOfMass);
      sumSquaredDist += dist * dist;
    });
    const radiusOfGyration = Math.sqrt(sumSquaredDist / n);

    // Analyze backbone distances
    const backboneDistances: number[] = [];
    for (let i = 1; i < n; i++) {
      backboneDistances.push(this.geometryDim.distance(coords[i], coords[i-1]));
    }

    // Analyze base pair distances
    const pairDistances = result.pairs.map(pair => 
      this.geometryDim.distance(coords[pair.i], coords[pair.j])
    );

    // Analyze angles
    const angles: number[] = [];
    for (let i = 1; i < n - 1; i++) {
      angles.push(this.geometryDim.angle(coords[i-1], coords[i], coords[i+1]));
    }

    return {
      boundingBox: {
        dimensions: [maxX - minX, maxY - minY, maxZ - minZ],
        volume: (maxX - minX) * (maxY - minY) * (maxZ - minZ)
      },
      radiusOfGyration,
      centerOfMass,
      backbone: {
        avgDistance: backboneDistances.length > 0 ?
          backboneDistances.reduce((a, b) => a + b, 0) / backboneDistances.length : 0,
        minDistance: Math.min(...backboneDistances),
        maxDistance: Math.max(...backboneDistances),
        stdDev: this.calculateStdDev(backboneDistances)
      },
      basePairs: {
        avgDistance: pairDistances.length > 0 ?
          pairDistances.reduce((a, b) => a + b, 0) / pairDistances.length : 0,
        minDistance: pairDistances.length > 0 ? Math.min(...pairDistances) : 0,
        maxDistance: pairDistances.length > 0 ? Math.max(...pairDistances) : 0,
        stdDev: this.calculateStdDev(pairDistances)
      },
      angles: {
        avgAngle: angles.length > 0 ?
          angles.reduce((a, b) => a + b, 0) / angles.length : 0,
        minAngle: angles.length > 0 ? Math.min(...angles) : 0,
        maxAngle: angles.length > 0 ? Math.max(...angles) : 0
      }
    };
  }

  /**
   * Analyze energy components
   */
  private static analyzeEnergy(result: FoldingResult) {
    // Estimate energy components
    const pairEnergy = result.pairs.length * -2.0; // Simplified
    const loopPenalty = (result.secondary.match(/\.+/g) || [])
      .filter(loop => loop.length >= 3).length * 5.0;
    const stackingBonus = (result.secondary.match(/\(\(+/g) || [])
      .reduce((sum, stack) => sum + (stack.length - 1) * -1.5, 0);

    return {
      total: result.energy,
      components: {
        basePairing: pairEnergy,
        loops: loopPenalty,
        stacking: stackingBonus,
        other: result.energy - (pairEnergy + loopPenalty + stackingBonus)
      },
      perBase: result.energy / result.sequence.length,
      perPair: result.pairs.length > 0 ? result.energy / result.pairs.length : 0
    };
  }

  /**
   * Identify potential issues
   */
  private static identifyIssues(
    result: FoldingResult,
    structural: any,
    geometric: any
  ): string[] {
    const issues: string[] = [];

    // Check base pair distances
    if (geometric.basePairs.avgDistance > 15) {
      issues.push(`Base pairs too far apart: avg ${geometric.basePairs.avgDistance.toFixed(1)}Å (target: 10.8Å)`);
    }

    // Check backbone consistency
    if (geometric.backbone.stdDev > 1.0) {
      issues.push(`Backbone distances inconsistent: std dev ${geometric.backbone.stdDev.toFixed(2)}Å`);
    }

    // Check pairing ratio
    if (structural.pairing.pairingRatio < 0.3) {
      issues.push(`Low pairing ratio: ${(structural.pairing.pairingRatio * 100).toFixed(1)}%`);
    }

    // Check structure balance
    if (!structural.pairing.balanced) {
      issues.push('Unbalanced secondary structure (mismatched parentheses)');
    }

    // Check for extreme angles
    if (geometric.angles.minAngle < 60 || geometric.angles.maxAngle > 150) {
      issues.push(`Extreme backbone angles detected: ${geometric.angles.minAngle.toFixed(0)}°-${geometric.angles.maxAngle.toFixed(0)}°`);
    }

    // Check energy
    if (result.energy > 0) {
      issues.push('Positive total energy indicates unstable structure');
    }

    return issues;
  }

  /**
   * Calculate pair statistics
   */
  private static calculatePairStatistics(pairs: BasePair[]) {
    return {
      wcPairs: pairs.filter(p => p.type === 'WC').length,
      wobblePairs: pairs.filter(p => p.type === 'wobble').length,
      nonCanonical: pairs.filter(p => p.type === 'non-canonical').length
    };
  }

  /**
   * Calculate structural complexity
   */
  private static calculateStructuralComplexity(secondary: string): number {
    // Count transitions between paired and unpaired
    let transitions = 0;
    for (let i = 1; i < secondary.length; i++) {
      if (secondary[i] !== secondary[i-1]) {
        transitions++;
      }
    }
    return transitions / secondary.length;
  }

  /**
   * Calculate standard deviation
   */
  private static calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Save diagnostic report
   */
  static saveDiagnosticReport(
    result: FoldingResult,
    outputPath: string,
    name: string
  ): void {
    const report = this.generateDiagnosticReport(result);
    const content = JSON.stringify(report, null, 2);
    
    const filePath = path.join(outputPath, `${name}_diagnostics.json`);
    fs.writeFileSync(filePath, content);
  }

  /**
   * Generate parameter tuning suggestions
   */
  static generateTuningSuggestions(report: any): string[] {
    const suggestions: string[] = [];

    // Check geometric metrics
    if (report.geometricMetrics.basePairs.avgDistance > 15) {
      suggestions.push('Increase harmonicStrength to pull base pairs closer');
      suggestions.push('Reduce fieldCoupling to minimize quantum field distortions');
    }

    if (report.geometricMetrics.backbone.stdDev > 1.0) {
      suggestions.push('Increase backbone force constant in energy minimization');
    }

    // Check structural metrics
    if (report.structuralMetrics.pairing.pairingRatio < 0.3) {
      suggestions.push('Adjust secondary structure prediction parameters');
      suggestions.push('Lower entanglementThreshold to allow more pairs');
    }

    // Check energy
    if (report.energyBreakdown.total > 0) {
      suggestions.push('Increase annealingSteps for better convergence');
      suggestions.push('Adjust temperature parameter in energy calculations');
    }

    return suggestions;
  }
}