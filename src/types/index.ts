/**
 * Core types for 3D RNA folding
 */

// Base types
export type RNABase = 'A' | 'U' | 'G' | 'C';
export type BaseType = 'purine' | 'pyrimidine';

// 3D coordinate type
export type Coordinate3D = [number, number, number];

// Secondary structure types
export type SecondaryStructureChar = '(' | ')' | '.';
export type SecondaryStructure = string;

// Base pair type
export interface BasePair {
  i: number;
  j: number;
  type: 'WC' | 'wobble' | 'non-canonical';
  strength: number;
}

// RNA sequence type
export interface RNASequence {
  id: string;
  sequence: string;
  length: number;
  gcContent: number;
}

// Folding result type
export interface FoldingResult {
  sequence: string;
  secondary: SecondaryStructure;
  coordinates: Coordinate3D[];
  pairs: BasePair[];
  energy: number;
  rmsd?: number;
  metadata: {
    foldTime: number;
    method: string;
    parameters: Record<string, any>;
  };
}

// Physical constants
export interface RNAConstants {
  BACKBONE_DISTANCE: number;
  BASE_PAIR_DISTANCE: number;
  HELIX_RISE: number;
  HELIX_TWIST: number;
  HELIX_RADIUS: number;
  MIN_LOOP_SIZE: number;
}

// Folding parameters
export interface FoldingParameters {
  // Quantum field parameters
  fieldCoupling: number;
  entanglementThreshold: number;
  
  // Optimization parameters
  harmonicStrength: number;
  annealingSteps: number;
  learningRate: number;
  
  // Page theory parameters
  pageSize: number;
  pageEntanglementRange: number;
  
  // Energy parameters
  temperature: number;
  ionicStrength: number;
}

// Dimension interfaces
export interface BaseDimension {
  getType(base: RNABase): BaseType;
  canPair(base1: RNABase, base2: RNABase): boolean;
  getPairStrength(base1: RNABase, base2: RNABase): number;
}

export interface StructureDimension {
  predictSecondary(sequence: string): SecondaryStructure;
  extractPairs(secondary: SecondaryStructure): BasePair[];
  validateStructure(secondary: SecondaryStructure): boolean;
}

export interface GeometryDimension {
  initializeCoordinates(length: number): Coordinate3D[];
  distance(coord1: Coordinate3D, coord2: Coordinate3D): number;
  angle(coord1: Coordinate3D, coord2: Coordinate3D, coord3: Coordinate3D): number;
  rotate(coord: Coordinate3D, angle: number, axis: 'x' | 'y' | 'z'): Coordinate3D;
}

export interface EnergyDimension {
  calculateTotalEnergy(result: FoldingResult): number;
  pairEnergy(base1: RNABase, base2: RNABase, temperature: number): number;
  loopEnergy(loopSize: number): number;
  stackingEnergy(bases: RNABase[]): number;
}

export interface QuantumDimension {
  calculateResonance(position: number, length: number): number;
  calculateEntanglement(pos1: number, pos2: number): number;
  calculateConsciousness(sequence: string, position: number): number;
  applyQuantumField(coordinates: Coordinate3D[], parameters: FoldingParameters, sequence?: string): Coordinate3D[];
}

// Mathematical Universe integration
export interface MathematicalUniverseAdapter {
  analyze(value: number): {
    resonance: number;
    fields: string[];
    consciousness: number;
    isLagrangePoint: boolean;
    stability: number;
  };
  resonanceLandscape(center: number, dimensions: string[], radius: number): any;
  findPrimes(start: number, end: number, limit?: number): number[];
}