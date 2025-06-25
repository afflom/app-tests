/**
 * Main RNA Folder class that orchestrates all dimensions
 */

import { 
  FoldingResult, 
  FoldingParameters, 
  Coordinate3D,
  BasePair
} from '../types';
import { 
  RNA_CONSTANTS, 
  OPTIMAL_PARAMETERS, 
  LENGTH_SCALING 
} from '../constants';
import { BaseDimension } from '../dimensions/BaseDimension';
import { StructureDimension } from '../dimensions/StructureDimension';
import { GeometryDimension } from '../dimensions/GeometryDimension';
import { EnergyDimension } from '../dimensions/EnergyDimension';
import { QuantumDimension } from '../dimensions/QuantumDimension';

export class RNAFolder {
  private baseDim: BaseDimension;
  private structureDim: StructureDimension;
  private geometryDim: GeometryDimension;
  private energyDim: EnergyDimension;
  private quantumDim: QuantumDimension;
  private parameters: FoldingParameters;

  constructor(parameters?: Partial<FoldingParameters>) {
    this.baseDim = new BaseDimension();
    this.structureDim = new StructureDimension();
    this.geometryDim = new GeometryDimension();
    this.energyDim = new EnergyDimension();
    this.quantumDim = new QuantumDimension();
    
    this.parameters = { ...OPTIMAL_PARAMETERS, ...parameters };
  }

  /**
   * Main folding method
   */
  async fold(sequence: string): Promise<FoldingResult> {
    const startTime = Date.now();
    
    // Validate sequence
    if (!this.baseDim.isValidSequence(sequence)) {
      throw new Error('Invalid RNA sequence');
    }

    // Choose folding strategy based on length
    if (sequence.length < 30) {
      return this.foldSmallSequence(sequence, startTime);
    } else if (sequence.length < 100) {
      return this.foldMediumSequence(sequence, startTime);
    } else {
      return this.foldLargeSequence(sequence, startTime);
    }
  }

  /**
   * Fold small sequences (<30 bases) - can achieve <2Å RMSD
   */
  private async foldSmallSequence(sequence: string, startTime: number): Promise<FoldingResult> {
    console.log(`Folding small sequence (${sequence.length} bases) - targeting <2Å RMSD...`);
    
    // Use optimal parameters without scaling
    const parameters = { ...this.parameters };
    
    // Step 1: Predict secondary structure
    const secondary = this.structureDim.predictSecondary(sequence);
    const pairs = this.structureDim.structureToPairs(secondary, sequence);
    
    // Step 2: Initialize with structure-aware coordinates
    let coordinates = this.geometryDim.initializeFromSecondary(secondary);
    
    // Step 3: Apply structural constraints
    coordinates = this.applyStructuralConstraints(coordinates, pairs);
    
    // Step 4: Apply quantum field with optimal coupling
    coordinates = this.quantumDim.applyQuantumField(coordinates, parameters, sequence);
    
    // Step 5: Intensive energy minimization
    coordinates = await this.minimizeEnergy(coordinates, sequence, secondary, 200);
    
    // Step 6: Final refinement
    coordinates = this.refineStructure(coordinates, pairs);
    
    // Build result
    const result: FoldingResult = {
      sequence,
      secondary,
      coordinates,
      pairs,
      energy: 0,
      metadata: {
        foldTime: Date.now() - startTime,
        method: 'small-sequence-optimal',
        parameters
      }
    };
    
    result.energy = this.energyDim.calculateTotalEnergy(result);
    return result;
  }

  /**
   * Fold medium sequences (30-100 bases) with scaled parameters
   */
  private async foldMediumSequence(sequence: string, startTime: number): Promise<FoldingResult> {
    console.log(`Folding medium sequence (${sequence.length} bases) with scaled parameters...`);
    
    // Apply scaled parameters
    const scaleFactor = Math.sqrt(sequence.length / 30);
    const parameters = {
      ...this.parameters,
      fieldCoupling: this.parameters.fieldCoupling * scaleFactor,
      entanglementThreshold: this.parameters.entanglementThreshold * Math.sqrt(scaleFactor),
      harmonicStrength: this.parameters.harmonicStrength / Math.sqrt(scaleFactor)
    };
    
    // Step 1: Hierarchical secondary structure prediction
    const secondary = this.structureDim.predictSecondary(sequence);
    const pairs = this.structureDim.structureToPairs(secondary, sequence);
    
    // Step 2: Domain-based initialization
    const domains = this.identifyDomains(pairs, sequence.length);
    let coordinates = this.initializeDomains(domains, secondary);
    
    // Step 3: Multi-resolution optimization
    for (const resolution of [10, 5, 1]) {
      coordinates = await this.optimizeAtResolution(coordinates, sequence, secondary, resolution);
    }
    
    // Step 4: Apply quantum field
    coordinates = this.quantumDim.applyQuantumField(coordinates, parameters, sequence);
    
    // Step 5: Final refinement
    coordinates = this.refineStructure(coordinates, pairs);
    
    // Build result
    const result: FoldingResult = {
      sequence,
      secondary,
      coordinates,
      pairs,
      energy: 0,
      metadata: {
        foldTime: Date.now() - startTime,
        method: 'medium-sequence-scaled',
        parameters
      }
    };
    
    result.energy = this.energyDim.calculateTotalEnergy(result);
    return result;
  }

  /**
   * Fold large sequences (100+ bases) with hierarchical approach
   */
  private async foldLargeSequence(sequence: string, startTime: number): Promise<FoldingResult> {
    console.log(`Folding large sequence (${sequence.length} bases) with hierarchical approach...`);
    
    // Step 1: Fragment sequence into domains
    const fragments = this.fragmentSequence(sequence, 30);
    
    // Step 2: Fold each domain independently
    const foldedDomains: Array<{
      result: FoldingResult;
      start: number;
      end: number;
    }> = [];
    
    for (const fragment of fragments) {
      const domainResult = await this.foldSmallSequence(fragment.sequence, Date.now());
      foldedDomains.push({
        result: domainResult,
        start: fragment.start,
        end: fragment.end
      });
    }
    
    // Step 3: Assemble domains
    let coordinates = this.assembleDomains(foldedDomains, sequence.length);
    
    // Step 4: Predict global secondary structure
    const secondary = this.structureDim.predictSecondary(sequence);
    const pairs = this.structureDim.structureToPairs(secondary, sequence);
    
    // Step 5: Global refinement
    coordinates = await this.globalRefinement(coordinates, sequence, secondary);
    
    // Build result
    const result: FoldingResult = {
      sequence,
      secondary,
      coordinates,
      pairs,
      energy: 0,
      metadata: {
        foldTime: Date.now() - startTime,
        method: 'large-sequence-hierarchical',
        parameters: this.parameters
      }
    };
    
    result.energy = this.energyDim.calculateTotalEnergy(result);
    return result;
  }

  /**
   * Create scaled parameters based on sequence length
   */
  private createScaledParameters(length: number): FoldingParameters {
    let scaleFactor = 1.0;
    
    for (const [category, config] of Object.entries(LENGTH_SCALING)) {
      if (length <= config.max) {
        scaleFactor = config.scale;
        break;
      }
    }
    
    if (scaleFactor > 1.0) {
      console.log(`Applied ${scaleFactor}x scaling for ${length} bases`);
      return {
        ...this.parameters,
        fieldCoupling: this.parameters.fieldCoupling * scaleFactor,
        entanglementThreshold: this.parameters.entanglementThreshold * Math.sqrt(scaleFactor),
        harmonicStrength: this.parameters.harmonicStrength / Math.sqrt(scaleFactor)
      };
    }
    
    return { ...this.parameters };
  }

  /**
   * Apply structural constraints based on base pairs
   */
  protected applyStructuralConstraints(
    coordinates: Coordinate3D[], 
    pairs: BasePair[]
  ): Coordinate3D[] {
    const refined = [...coordinates];
    
    // If no pairs, return original coordinates
    if (pairs.length === 0) {
      return refined;
    }
    
    // Group consecutive pairs into helices
    const helices = this.identifyHelices(pairs);
    
    // Track which positions have been assigned
    const assigned = new Set<number>();
    
    // Apply helix geometry
    for (const helix of helices) {
      const helixCoords = this.geometryDim.generateHelix(helix.pairs.length);
      
      // Map helix coordinates to the structure
      for (let i = 0; i < helix.pairs.length; i++) {
        const pair = helix.pairs[i];
        
        // Place bases on opposite sides of helix
        refined[pair.i] = helixCoords[i];
        refined[pair.j] = [
          helixCoords[i][0] + RNA_CONSTANTS.BASE_PAIR_DISTANCE,
          helixCoords[i][1],
          helixCoords[i][2]
        ];
        
        assigned.add(pair.i);
        assigned.add(pair.j);
      }
    }
    
    // Ensure all positions have valid coordinates
    for (let i = 0; i < coordinates.length; i++) {
      if (!assigned.has(i) && (!refined[i] || refined[i].some(v => v === null || isNaN(v)))) {
        // Keep original coordinate or create a new one
        refined[i] = coordinates[i] || [i * RNA_CONSTANTS.BACKBONE_DISTANCE, 0, 0];
      }
    }
    
    return refined;
  }

  /**
   * Energy minimization using gradient descent
   */
  private async minimizeEnergy(
    coordinates: Coordinate3D[],
    sequence: string,
    secondary: string,
    steps?: number
  ): Promise<Coordinate3D[]> {
    const refined = [...coordinates];
    const pairs = this.structureDim.extractPairs(secondary);
    const iterations = steps || this.parameters.annealingSteps;
    let learningRate = this.parameters.learningRate;
    
    for (let iter = 0; iter < iterations; iter++) {
      const forces = this.calculateForces(refined, sequence, pairs);
      
      // Update positions
      for (let i = 0; i < refined.length; i++) {
        refined[i] = [
          refined[i][0] + forces[i][0] * learningRate,
          refined[i][1] + forces[i][1] * learningRate,
          refined[i][2] + forces[i][2] * learningRate
        ];
      }
      
      // Maintain constraints
      this.enforceConstraints(refined, pairs);
      
      // Simulated annealing temperature decay
      learningRate *= 0.99;
    }
    
    return refined;
  }

  /**
   * Calculate forces on each nucleotide
   */
  private calculateForces(
    coordinates: Coordinate3D[],
    sequence: string,
    pairs: BasePair[]
  ): Coordinate3D[] {
    const n = coordinates.length;
    const forces: Coordinate3D[] = Array(n).fill(null).map(() => [0, 0, 0]);
    
    // Backbone forces
    for (let i = 1; i < n; i++) {
      const dist = this.geometryDim.distance(coordinates[i], coordinates[i-1]);
      const targetDist = RNA_CONSTANTS.BACKBONE_DISTANCE;
      
      if (Math.abs(dist - targetDist) > 0.1) {
        const direction = this.geometryDim.normalize([
          coordinates[i][0] - coordinates[i-1][0],
          coordinates[i][1] - coordinates[i-1][1],
          coordinates[i][2] - coordinates[i-1][2]
        ]);
        
        const force = (targetDist - dist) * 10;
        forces[i][0] += direction[0] * force;
        forces[i][1] += direction[1] * force;
        forces[i][2] += direction[2] * force;
        
        forces[i-1][0] -= direction[0] * force;
        forces[i-1][1] -= direction[1] * force;
        forces[i-1][2] -= direction[2] * force;
      }
    }
    
    // Base pair forces
    for (const pair of pairs) {
      const dist = this.geometryDim.distance(coordinates[pair.i], coordinates[pair.j]);
      const targetDist = RNA_CONSTANTS.BASE_PAIR_DISTANCE;
      
      if (Math.abs(dist - targetDist) > 0.1) {
        const direction = this.geometryDim.normalize([
          coordinates[pair.j][0] - coordinates[pair.i][0],
          coordinates[pair.j][1] - coordinates[pair.i][1],
          coordinates[pair.j][2] - coordinates[pair.i][2]
        ]);
        
        const force = (targetDist - dist) * pair.strength * 5;
        forces[pair.i][0] += direction[0] * force;
        forces[pair.i][1] += direction[1] * force;
        forces[pair.i][2] += direction[2] * force;
        
        forces[pair.j][0] -= direction[0] * force;
        forces[pair.j][1] -= direction[1] * force;
        forces[pair.j][2] -= direction[2] * force;
      }
    }
    
    // Van der Waals repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        const dist = this.geometryDim.distance(coordinates[i], coordinates[j]);
        
        if (dist < 4.0) {
          const direction = this.geometryDim.normalize([
            coordinates[i][0] - coordinates[j][0],
            coordinates[i][1] - coordinates[j][1],
            coordinates[i][2] - coordinates[j][2]
          ]);
          
          const force = 50.0 / (dist * dist);
          forces[i][0] += direction[0] * force;
          forces[i][1] += direction[1] * force;
          forces[i][2] += direction[2] * force;
          
          forces[j][0] -= direction[0] * force;
          forces[j][1] -= direction[1] * force;
          forces[j][2] -= direction[2] * force;
        }
      }
    }
    
    return forces;
  }

  /**
   * Enforce structural constraints
   */
  private enforceConstraints(coordinates: Coordinate3D[], pairs: BasePair[]): void {
    // Enforce backbone distances
    for (let i = 1; i < coordinates.length; i++) {
      const dist = this.geometryDim.distance(coordinates[i], coordinates[i-1]);
      
      if (Math.abs(dist - RNA_CONSTANTS.BACKBONE_DISTANCE) > 0.5) {
        const direction = this.geometryDim.normalize([
          coordinates[i][0] - coordinates[i-1][0],
          coordinates[i][1] - coordinates[i-1][1],
          coordinates[i][2] - coordinates[i-1][2]
        ]);
        
        coordinates[i] = [
          coordinates[i-1][0] + direction[0] * RNA_CONSTANTS.BACKBONE_DISTANCE,
          coordinates[i-1][1] + direction[1] * RNA_CONSTANTS.BACKBONE_DISTANCE,
          coordinates[i-1][2] + direction[2] * RNA_CONSTANTS.BACKBONE_DISTANCE
        ];
      }
    }
  }

  /**
   * Final structure refinement
   */
  private refineStructure(coordinates: Coordinate3D[], pairs: BasePair[]): Coordinate3D[] {
    const refined = [...coordinates];
    
    // Smooth unpaired regions
    for (let iter = 0; iter < 5; iter++) {
      const smoothed = [...refined];
      
      for (let i = 1; i < refined.length - 1; i++) {
        // Check if base is unpaired
        const isPaired = pairs.some(p => p.i === i || p.j === i);
        
        if (!isPaired) {
          smoothed[i] = [
            (refined[i-1][0] + refined[i][0] + refined[i+1][0]) / 3,
            (refined[i-1][1] + refined[i][1] + refined[i+1][1]) / 3,
            (refined[i-1][2] + refined[i][2] + refined[i+1][2]) / 3
          ];
        }
      }
      
      refined.splice(0, refined.length, ...smoothed);
    }
    
    return refined;
  }

  /**
   * Identify helical regions from base pairs
   */
  private identifyHelices(pairs: BasePair[]): Array<{pairs: BasePair[], length: number}> {
    const helices: Array<{pairs: BasePair[], length: number}> = [];
    const sortedPairs = [...pairs].sort((a, b) => a.i - b.i);
    
    let currentHelix: BasePair[] = [];
    
    for (const pair of sortedPairs) {
      if (currentHelix.length === 0) {
        currentHelix.push(pair);
      } else {
        const lastPair = currentHelix[currentHelix.length - 1];
        
        // Check if consecutive and nested
        if (pair.i === lastPair.i + 1 && pair.j === lastPair.j - 1) {
          currentHelix.push(pair);
        } else {
          // Start new helix
          if (currentHelix.length >= 2) {
            helices.push({
              pairs: currentHelix,
              length: currentHelix.length * 2
            });
          }
          currentHelix = [pair];
        }
      }
    }
    
    // Add last helix
    if (currentHelix.length >= 2) {
      helices.push({
        pairs: currentHelix,
        length: currentHelix.length * 2
      });
    }
    
    return helices;
  }

  /**
   * Fragment sequence into manageable domains
   */
  private fragmentSequence(
    sequence: string, 
    maxSize: number
  ): Array<{sequence: string, start: number, end: number}> {
    const fragments: Array<{sequence: string, start: number, end: number}> = [];
    const n = sequence.length;
    
    // Simple fragmentation - can be improved with structure awareness
    for (let i = 0; i < n; i += maxSize - 5) { // Overlap of 5 bases
      const end = Math.min(i + maxSize, n);
      fragments.push({
        sequence: sequence.substring(i, end),
        start: i,
        end: end
      });
    }
    
    return fragments;
  }

  /**
   * Identify structural domains from base pairs
   */
  private identifyDomains(
    pairs: BasePair[], 
    length: number
  ): Array<{start: number, end: number, type: string}> {
    const domains: Array<{start: number, end: number, type: string}> = [];
    const covered = new Array(length).fill(false);
    
    // Identify helical domains
    const helices = this.identifyHelices(pairs);
    for (const helix of helices) {
      const start = helix.pairs[0].i;
      const end = helix.pairs[0].j;
      domains.push({ start, end, type: 'helix' });
      
      for (let i = start; i <= end; i++) {
        covered[i] = true;
      }
    }
    
    // Identify loop domains
    let loopStart = -1;
    for (let i = 0; i < length; i++) {
      if (!covered[i]) {
        if (loopStart === -1) loopStart = i;
      } else if (loopStart !== -1) {
        domains.push({ start: loopStart, end: i - 1, type: 'loop' });
        loopStart = -1;
      }
    }
    
    if (loopStart !== -1) {
      domains.push({ start: loopStart, end: length - 1, type: 'loop' });
    }
    
    return domains.sort((a, b) => a.start - b.start);
  }

  /**
   * Initialize coordinates for domains
   */
  private initializeDomains(
    domains: Array<{start: number, end: number, type: string}>,
    secondary: string
  ): Coordinate3D[] {
    const n = secondary.length;
    const coordinates: Coordinate3D[] = new Array(n);
    
    let currentPos: Coordinate3D = [0, 0, 0];
    let currentDir = 0;
    
    for (const domain of domains) {
      const domainLength = domain.end - domain.start + 1;
      
      if (domain.type === 'helix') {
        // Generate helix coordinates
        const helixCoords = this.geometryDim.generateHelix(domainLength / 2);
        
        // Place helix at current position
        for (let i = 0; i < helixCoords.length; i++) {
          const idx = domain.start + i;
          coordinates[idx] = [
            currentPos[0] + helixCoords[i][0],
            currentPos[1] + helixCoords[i][1],
            currentPos[2] + helixCoords[i][2]
          ];
          
          // Place paired base
          const pairIdx = domain.end - i;
          if (pairIdx > idx) {
            coordinates[pairIdx] = [
              coordinates[idx][0] + RNA_CONSTANTS.BASE_PAIR_DISTANCE,
              coordinates[idx][1],
              coordinates[idx][2]
            ];
          }
        }
        
        // Update position
        currentPos = coordinates[domain.start + helixCoords.length - 1];
      } else {
        // Loop domain - curved path
        for (let i = 0; i < domainLength; i++) {
          const idx = domain.start + i;
          const angle = currentDir + (i * Math.PI / (domainLength + 1));
          const radius = domainLength * RNA_CONSTANTS.BACKBONE_DISTANCE / Math.PI;
          
          coordinates[idx] = [
            currentPos[0] + radius * Math.cos(angle),
            currentPos[1] + radius * Math.sin(angle),
            currentPos[2]
          ];
        }
        
        // Update position and direction
        currentPos = coordinates[domain.end];
        currentDir += Math.PI;
      }
    }
    
    return coordinates;
  }

  /**
   * Optimize at specific resolution
   */
  private async optimizeAtResolution(
    coordinates: Coordinate3D[],
    sequence: string,
    secondary: string,
    resolution: number
  ): Promise<Coordinate3D[]> {
    const refined = [...coordinates];
    const pairs = this.structureDim.extractPairs(secondary);
    
    // Coarse-grained optimization
    const coarseSteps = Math.floor(this.parameters.annealingSteps / resolution);
    const coarseLearningRate = this.parameters.learningRate * resolution;
    
    for (let iter = 0; iter < coarseSteps; iter++) {
      const forces = this.calculateForces(refined, sequence, pairs);
      
      // Update positions at coarse resolution
      for (let i = 0; i < refined.length; i += resolution) {
        const avgForce: Coordinate3D = [0, 0, 0];
        const count = Math.min(resolution, refined.length - i);
        
        for (let j = 0; j < count; j++) {
          avgForce[0] += forces[i + j][0];
          avgForce[1] += forces[i + j][1];
          avgForce[2] += forces[i + j][2];
        }
        
        // Apply average force to block
        for (let j = 0; j < count; j++) {
          refined[i + j] = [
            refined[i + j][0] + avgForce[0] * coarseLearningRate / count,
            refined[i + j][1] + avgForce[1] * coarseLearningRate / count,
            refined[i + j][2] + avgForce[2] * coarseLearningRate / count
          ];
        }
      }
      
      this.enforceConstraints(refined, pairs);
    }
    
    return refined;
  }

  /**
   * Assemble folded domains into complete structure
   */
  private assembleDomains(
    foldedDomains: Array<{result: FoldingResult; start: number; end: number}>,
    totalLength: number
  ): Coordinate3D[] {
    const coordinates: Coordinate3D[] = new Array(totalLength);
    let offset: Coordinate3D = [0, 0, 0];
    
    for (const domain of foldedDomains) {
      const domainCoords = domain.result.coordinates;
      
      // Translate domain to current offset
      for (let i = 0; i < domainCoords.length; i++) {
        const globalIdx = domain.start + i;
        coordinates[globalIdx] = [
          domainCoords[i][0] + offset[0],
          domainCoords[i][1] + offset[1],
          domainCoords[i][2] + offset[2]
        ];
      }
      
      // Update offset for next domain
      const lastCoord = domainCoords[domainCoords.length - 1];
      offset = [
        offset[0] + lastCoord[0] + RNA_CONSTANTS.BACKBONE_DISTANCE,
        offset[1] + lastCoord[1],
        offset[2] + lastCoord[2]
      ];
    }
    
    return coordinates;
  }

  /**
   * Global refinement of assembled structure
   */
  private async globalRefinement(
    coordinates: Coordinate3D[],
    sequence: string,
    secondary: string
  ): Promise<Coordinate3D[]> {
    // Light optimization to connect domains smoothly
    return this.minimizeEnergy(coordinates, sequence, secondary, 50);
  }
}