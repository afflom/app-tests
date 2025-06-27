/**
 * MU:RNA Model - Core Types and Interfaces
 *
 * This file defines the fundamental types for representing RNA structure
 * using the Mathematical Universe framework.
 */

/**
 * RNA nucleotide bases
 */
export type RNABase = 'A' | 'U' | 'G' | 'C';

/**
 * The 8 binary fields that define nucleotide conformation
 */
export interface ConformationalFields {
  e0: boolean; // Pairing State: true = paired, false = unpaired
  e1: boolean; // Stacking: true = stacked, false = unstacked
  e2: boolean; // Sugar Pucker: true = C3'-endo, false = C2'-endo
  e3: boolean; // Backbone Torsion: true = canonical, false = non-canonical
  e4: boolean; // Tertiary Interaction: true = involved, false = not involved
  e5: boolean; // Edge Accessibility: true = accessible, false = buried
  e6: boolean; // Backbone Exposure: true = exposed, false = buried
  e7: boolean; // Ion Coordination: true = coordinated, false = not coordinated
}

/**
 * Nucleotide state combining sequence position and conformational state
 */
export interface NucleotideState {
  position: number; // Position in sequence (1-indexed)
  base: RNABase; // Nucleotide type
  fields: ConformationalFields; // 8D binary state vector
  cliffordIndex: number; // Index in Clifford algebra (0-255)
}

/**
 * RNA molecule as a section of the fiber bundle
 */
export interface RNAMolecule {
  sequence: string; // Primary sequence
  length: number; // Sequence length
  states: NucleotideState[]; // Conformational states
  domains: Domain[]; // Structural domains (pages)
}

/**
 * Structural domain (48-nucleotide page)
 */
export interface Domain {
  start: number; // Starting position
  end: number; // Ending position
  pageNumber: number; // Page index
  boundaryType: 'smooth' | 'singular'; // Orbifold boundary type
}

/**
 * Fiber bundle structure
 */
export interface FiberBundle {
  baseSpace: number[]; // Sequence positions [1, 2, ..., L]
  fiber: ConformationalFields[]; // All possible states (256)
  totalSpace: Map<number, ConformationalFields>; // Position -> State mapping
  projection: (state: [number, ConformationalFields]) => number;
}

/**
 * Gauge connection for parallel transport
 */
export interface GaugeConnection {
  // Connection coefficients for each field interaction
  fieldCoupling: number[][]; // 8x8 coupling matrix

  // Parallel transport operator
  transport: (state: ConformationalFields, fromPos: number, toPos: number) => ConformationalFields;

  // Curvature tensor
  curvature: (pos: number) => number[][];
}

/**
 * E8 root system representation
 */
export interface E8Structure {
  roots: number[][]; // 240 root vectors in 8D
  weylGroup: WeylGroupElement[]; // E8 Weyl group elements
  dynkinDiagram: number[][]; // Adjacency matrix
  stabilityScore: (fields: ConformationalFields) => number; // Stability based on E8 proximity
  getStableConformations?: (threshold?: number) => ConformationalFields[];
  getRootSystemStats?: () => {
    totalRoots: number;
    positiveRoots: number;
    rootLengths: Set<number>;
    maximalRoot: number[];
  };
  weylOrbit?: (fields: ConformationalFields) => ConformationalFields[];
}

/**
 * Weyl group element
 */
export interface WeylGroupElement {
  matrix: number[][]; // 8x8 transformation matrix
  order: number; // Order of the element
  conjugacyClass: number; // Conjugacy class index
}

/**
 * Homological structure
 */
export interface Homology {
  H0: number; // Number of connected components
  H1: Loop[]; // 1-cycles (loops)
  H2: Pocket[]; // 2-cycles (pockets/voids)
}

/**
 * RNA loop structure
 */
export interface Loop {
  positions: number[]; // Nucleotide positions in loop
  type: 'hairpin' | 'internal' | 'bulge' | 'junction' | 'pseudoknot';
  fieldSignature: number; // Characteristic field pattern
}

/**
 * RNA pocket/void structure
 */
export interface Pocket {
  boundary: number[]; // Positions forming the boundary
  volume: number; // Approximate volume in Å³
  function: 'binding' | 'catalytic' | 'structural' | 'unknown';
}

/**
 * Modular group action on stability
 */
export interface ModularTransformation {
  a: number;
  b: number;
  c: number;
  d: number;
  // Constraint: ad - bc = 1
}

/**
 * RNA folding energy landscape
 */
export interface EnergyLandscape {
  freeEnergy: (state: RNAMolecule) => number;
  resonance: (state: RNAMolecule) => number;
  modularAction: (energy: number, transform: ModularTransformation) => number;
}

/**
 * Geodesic path in conformational space
 */
export interface FoldingPathway {
  start: RNAMolecule; // Initial state
  end: RNAMolecule; // Final state
  path: RNAMolecule[]; // Intermediate states
  length: number; // Path length in field space
  barriers: number[]; // Energy barriers along path
}

/**
 * Clifford algebra element
 */
export interface CliffordElement {
  grade: number; // 0-8
  components: Map<string, number>; // Basis element -> coefficient
  index: number; // 0-255 unique identifier
}

/**
 * SU(2) subgroup action
 */
export interface SU2Action {
  subspace: [number, number]; // Indices of 2 fields
  angle: number; // Rotation angle
  axis: [number, number, number]; // Rotation axis in SU(2)
}

/**
 * SU(3) subgroup action
 */
export interface SU3Action {
  subspace: [number, number, number]; // Indices of 3 fields
  generators: number[][][]; // 8 Gell-Mann matrices
  parameters: number[]; // 8 parameters
}

/**
 * Persistent homology for structural analysis
 */
export interface PersistentHomology {
  dimension: number; // Homological dimension
  birth: number; // Birth time/scale
  death: number; // Death time/scale
  persistence: number; // death - birth
  generator: number[]; // Representative cycle
}

/**
 * Orbifold structure for domain boundaries
 */
export interface Orbifold {
  singularities: number[]; // Positions of singular points
  resolution: 'blowup' | 'smooth' | 'stacky';
  localGroup: string; // Local symmetry group
  domains: Domain[]; // Structural domains
  findDomainConnections?: () => Array<{
    from: Domain;
    to: Domain;
    type?: string;
    hinge?: number;
    flexibility?: number;
  }>;
  eulerCharacteristic?: () => number;
  getFundamentalGroup?: () => string;
}

/**
 * Complete MU:RNA model state
 */
export interface MURNAModel {
  molecule: RNAMolecule;
  bundle: FiberBundle;
  gauge: GaugeConnection;
  e8: E8Structure;
  homology: Homology;
  landscape: EnergyLandscape;
  orbifold: Orbifold;
}
