/**
 * MU:RNA Model - Main Implementation
 *
 * Integrates all components to provide a complete RNA folding model
 * based on the Mathematical Universe framework.
 */

import {
  MURNAModel,
  RNAMolecule,
  FiberBundle,
  GaugeConnection,
  E8Structure,
  Homology,
  EnergyLandscape,
  Orbifold,
  NucleotideState,
  ConformationalFields,
  ModularTransformation,
  FoldingPathway,
  RNABase
} from './types';

import { CliffordAlgebra } from './clifford-algebra';
import { RNAFiberBundle, RNAGaugeConnection } from './fiber-bundle';
import { E8Symmetry } from './e8-symmetry';
import { RNAOrbifold } from './orbifold';
import { RNAHomology } from './homology';

/**
 * Main MU:RNA Model implementation
 */
export class MURNAModelImpl implements MURNAModel {
  molecule: RNAMolecule;
  bundle: FiberBundle;
  gauge: GaugeConnection;
  e8: E8Structure;
  homology: Homology;
  landscape: EnergyLandscape;
  orbifold: Orbifold;

  clifford: CliffordAlgebra;
  homologyCalculator: RNAHomology;

  constructor(sequence: string) {
    // Initialize mathematical structures first
    this.clifford = new CliffordAlgebra();
    this.bundle = new RNAFiberBundle(sequence.length);
    this.gauge = new RNAGaugeConnection(sequence);
    this.e8 = new E8Symmetry();
    this.orbifold = new RNAOrbifold(sequence);

    // Initialize molecule after orbifold is ready
    this.molecule = this.initializeMolecule(sequence);

    // Initialize homology calculator
    this.homologyCalculator = new RNAHomology(this.molecule);
    this.homology = this.homologyCalculator.computeHomology();

    // Initialize energy landscape
    this.landscape = this.initializeEnergyLandscape();
  }

  /**
   * Initialize RNA molecule with default conformations
   */
  private initializeMolecule(sequence: string): RNAMolecule {
    const states: NucleotideState[] = [];

    for (let i = 0; i < sequence.length; i++) {
      const position = i + 1;
      const base = sequence[i] as RNABase;

      // Default: unpaired, exposed state
      const fields: ConformationalFields = {
        e0: false, // Unpaired
        e1: false, // Unstacked
        e2: false, // Flexible sugar
        e3: false, // Flexible backbone
        e4: false, // No tertiary
        e5: true, // Edge accessible
        e6: true, // Backbone exposed
        e7: false // No ion
      };

      const cliffordElement = this.clifford.fieldsToClifford(fields);

      states.push({
        position,
        base,
        fields,
        cliffordIndex: cliffordElement.index
      });
    }

    return {
      sequence,
      length: sequence.length,
      states,
      domains: this.orbifold.domains
    };
  }

  /**
   * Initialize energy landscape with modular group action
   */
  private initializeEnergyLandscape(): EnergyLandscape {
    return {
      freeEnergy: (state: RNAMolecule) => {
        return this.calculateFreeEnergy(state);
      },

      resonance: (state: RNAMolecule) => {
        return this.calculateResonance(state);
      },

      modularAction: (energy: number, transform: ModularTransformation) => {
        const { a, b, c, d } = transform;
        return (a * energy + b) / (c * energy + d);
      }
    };
  }

  /**
   * Calculate free energy using field patterns and proper thermodynamics
   */
  private calculateFreeEnergy(state: RNAMolecule): number {
    const T = 310.15; // 37°C in Kelvin
    const R = 1.987e-3; // Gas constant in kcal/(mol·K)

    // Extract base pairs and structural elements
    const pairs = this.extractBasePairs(state);
    const stacks = this.extractStacks(state);
    const structures = this.extractStructuralElements(state, pairs);

    let enthalpy = 0;
    let entropy = 0;

    // Nearest neighbor model for base pairs and stacks
    for (const stack of stacks) {
      const nnParams = this.getNearestNeighborParams(stack);
      enthalpy += nnParams.dH;
      entropy += nnParams.dS;
    }

    // Loop contributions
    for (const struct of structures) {
      const loopParams = this.getLoopParameters(struct);
      enthalpy += loopParams.dH;
      entropy += loopParams.dS;
    }

    // Terminal penalties
    enthalpy += this.getTerminalPenalties(pairs, state);

    // Coaxial stacking
    const coaxialStacks = this.findCoaxialStacks(structures);
    for (const _coax of coaxialStacks) {
      enthalpy -= 3.1; // Coaxial stacking bonus
      entropy -= 0.008;
    }

    // E8 conformational entropy contribution
    let conformationalEntropy = 0;
    for (const nucleotide of state.states) {
      const stability = this.e8.stabilityScore(nucleotide.fields);
      // More stable conformations have lower entropy
      conformationalEntropy -= R * stability * Math.log(stability + 0.01);
    }
    entropy += conformationalEntropy;

    // Calculate Gibbs free energy: ΔG = ΔH - TΔS
    const freeEnergy = enthalpy - T * entropy;

    return freeEnergy;
  }

  /**
   * Extract base pairs from molecule state
   */
  private extractBasePairs(state: RNAMolecule): Array<{ i: number; j: number; type: string }> {
    const pairs: Array<{ i: number; j: number; type: string }> = [];

    for (let i = 0; i < state.states.length; i++) {
      for (let j = i + 4; j < state.states.length; j++) {
        const state1 = state.states[i];
        const state2 = state.states[j];

        if (state1.fields.e0 && state2.fields.e0 && this.canPair(state1.base, state2.base)) {
          const pairType = state1.base + state2.base;
          pairs.push({ i, j, type: pairType });
        }
      }
    }

    return pairs;
  }

  /**
   * Extract stacking patterns
   */
  private extractStacks(state: RNAMolecule): Array<{
    bases: string[];
    positions: number[];
  }> {
    const stacks: Array<{ bases: string[]; positions: number[] }> = [];
    const pairs = this.extractBasePairs(state);

    // Find consecutive base pairs (stacks)
    for (let k = 0; k < pairs.length - 1; k++) {
      const p1 = pairs[k];
      const p2 = pairs[k + 1];

      if (p1.i + 1 === p2.i && p1.j - 1 === p2.j) {
        // Consecutive pairs form a stack
        const bases = [
          state.states[p1.i].base,
          state.states[p1.j].base,
          state.states[p2.i].base,
          state.states[p2.j].base
        ];
        stacks.push({
          bases,
          positions: [p1.i, p1.j, p2.i, p2.j]
        });
      }
    }

    return stacks;
  }

  /**
   * Get nearest neighbor parameters
   */
  private getNearestNeighborParams(stack: { bases: string[] }): { dH: number; dS: number } {
    // Turner 2004 parameters - comprehensive set
    const key = stack.bases.join('');
    const params: Record<string, { dH: number; dS: number }> = {
      // Watson-Crick stacks
      AAUU: { dH: -6.82, dS: -0.019 },
      AUAU: { dH: -9.38, dS: -0.026 },
      AUUA: { dH: -6.82, dS: -0.019 },
      UAAU: { dH: -7.69, dS: -0.02 },
      UAUU: { dH: -6.82, dS: -0.019 },
      UAUA: { dH: -9.38, dS: -0.026 },

      GGCC: { dH: -13.39, dS: -0.034 },
      GCGC: { dH: -14.88, dS: -0.036 },
      GCCG: { dH: -11.4, dS: -0.029 },
      CGCG: { dH: -10.64, dS: -0.027 },
      CGGC: { dH: -10.48, dS: -0.026 },
      CCGG: { dH: -13.39, dS: -0.034 },

      // Mixed stacks
      AGCU: { dH: -10.48, dS: -0.027 },
      ACGU: { dH: -12.44, dS: -0.032 },
      GAUC: { dH: -12.44, dS: -0.032 },
      GUAC: { dH: -11.4, dS: -0.029 },
      CAUG: { dH: -10.48, dS: -0.027 },
      CUAG: { dH: -10.44, dS: -0.026 },
      UGCA: { dH: -10.48, dS: -0.027 },
      UCGA: { dH: -12.44, dS: -0.032 },

      // Wobble stacks
      GGUC: { dH: -8.81, dS: -0.023 },
      GUUC: { dH: -6.99, dS: -0.019 },
      GUCG: { dH: -4.13, dS: -0.011 },
      GUUG: { dH: -6.99, dS: -0.019 },
      UGGU: { dH: -9.26, dS: -0.024 },
      UGUG: { dH: -6.99, dS: -0.019 },
      CUGG: { dH: -8.81, dS: -0.023 },
      CGUG: { dH: -4.13, dS: -0.011 }

      // Terminal AU/GU penalties handled separately
    };

    // Try reverse complement if not found
    if (!params[key]) {
      const reversed = this.reverseComplementStack(stack.bases);
      const revKey = reversed.join('');
      if (params[revKey]) {
        return params[revKey];
      }
    }

    return params[key] || { dH: -7.0, dS: -0.02 }; // Default
  }

  /**
   * Get reverse complement of a stack
   */
  private reverseComplementStack(bases: string[]): string[] {
    const complement: Record<string, string> = {
      A: 'U',
      U: 'A',
      G: 'C',
      C: 'G'
    };

    return [
      complement[bases[3]] || bases[3],
      complement[bases[2]] || bases[2],
      complement[bases[1]] || bases[1],
      complement[bases[0]] || bases[0]
    ];
  }

  /**
   * Extract structural elements (loops, bulges, junctions)
   */
  private extractStructuralElements(
    state: RNAMolecule,
    pairs: Array<{ i: number; j: number; type: string }>
  ): Array<{
    type: 'hairpin' | 'bulge' | 'internal' | 'junction' | 'exterior';
    positions: number[];
    size?: number;
    closingPairs?: Array<{ i: number; j: number }>;
  }> {
    const structures: Array<{
      type: 'hairpin' | 'bulge' | 'internal' | 'junction' | 'exterior';
      positions: number[];
      size?: number;
      closingPairs?: Array<{ i: number; j: number }>;
    }> = [];

    // Build pair table for fast lookup
    const pairTable = new Array(state.length + 1).fill(0);
    for (const pair of pairs) {
      pairTable[pair.i] = pair.j;
      pairTable[pair.j] = pair.i;
    }

    // Track which positions have been assigned to structures
    const assigned = new Set<number>();

    // Sort pairs by outer position
    const sortedPairs = [...pairs].sort((a, b) => a.i - b.i);

    // Process each base pair to find its associated structure
    for (const pair of sortedPairs) {
      if (assigned.has(pair.i)) continue;

      // Determine structure type by examining the region
      const structure = this.classifyStructure(pair, pairTable, assigned);
      if (structure) {
        structures.push(structure);
        structure.positions.forEach(pos => assigned.add(pos));
      }
    }

    // Find exterior loop (unpaired regions not enclosed by any pair)
    const exteriorPositions: number[] = [];
    for (let i = 1; i <= state.length; i++) {
      if (!assigned.has(i) && !this.isEnclosedByPair(i, sortedPairs)) {
        exteriorPositions.push(i);
      }
    }

    if (exteriorPositions.length > 0) {
      structures.push({
        type: 'exterior',
        positions: exteriorPositions,
        size: exteriorPositions.length
      });
    }

    return structures;
  }

  /**
   * Classify the structure type for a base pair
   */
  private classifyStructure(
    pair: { i: number; j: number },
    pairTable: number[],
    _assigned: Set<number>
  ): {
    type: 'hairpin' | 'bulge' | 'internal' | 'junction';
    positions: number[];
    size?: number;
    closingPairs?: Array<{ i: number; j: number }>;
  } | null {
    const positions: number[] = [];
    const closingPairs: Array<{ i: number; j: number }> = [pair];

    // Trace the structure starting from this pair
    let i = pair.i + 1;
    let j = pair.j - 1;
    let unpaired_5prime = 0;
    let unpaired_3prime = 0;
    let branches = 0;

    // Count unpaired on 5' side
    while (i <= j && pairTable[i] === 0) {
      positions.push(i);
      unpaired_5prime++;
      i++;
    }

    // Count unpaired on 3' side
    while (j >= i && pairTable[j] === 0) {
      positions.push(j);
      unpaired_3prime++;
      j--;
    }

    // Check for additional stems
    const stems: Array<{ i: number; j: number }> = [];
    for (let k = i; k <= j; k++) {
      if (pairTable[k] > k && pairTable[k] <= j) {
        stems.push({ i: k, j: pairTable[k] });
        closingPairs.push({ i: k, j: pairTable[k] });
        k = pairTable[k]; // Skip to end of stem
        branches++;
      }
    }

    // Classify based on pattern
    if (branches === 0) {
      // No additional stems
      if (unpaired_5prime + unpaired_3prime === j - i + 1) {
        // All positions between pair are unpaired - hairpin
        return {
          type: 'hairpin',
          positions: positions.sort((a, b) => a - b),
          size: positions.length,
          closingPairs: [pair]
        };
      }
    } else if (branches === 1) {
      // One additional stem
      if (unpaired_5prime > 0 && unpaired_3prime === 0) {
        // Unpaired only on 5' side - bulge
        return {
          type: 'bulge',
          positions: positions.sort((a, b) => a - b),
          size: unpaired_5prime,
          closingPairs
        };
      } else if (unpaired_5prime === 0 && unpaired_3prime > 0) {
        // Unpaired only on 3' side - bulge
        return {
          type: 'bulge',
          positions: positions.sort((a, b) => a - b),
          size: unpaired_3prime,
          closingPairs
        };
      } else if (unpaired_5prime > 0 && unpaired_3prime > 0) {
        // Unpaired on both sides - internal loop
        return {
          type: 'internal',
          positions: positions.sort((a, b) => a - b),
          size: unpaired_5prime + unpaired_3prime,
          closingPairs
        };
      }
    } else if (branches >= 2) {
      // Multiple stems - multi-branch loop/junction
      // Include all unpaired positions in the junction
      for (let k = pair.i + 1; k < pair.j; k++) {
        if (pairTable[k] === 0 && !positions.includes(k)) {
          positions.push(k);
        }
      }

      return {
        type: 'junction',
        positions: positions.sort((a, b) => a - b),
        size: positions.length,
        closingPairs
      };
    }

    return null;
  }

  /**
   * Check if a position is enclosed by any base pair
   */
  private isEnclosedByPair(pos: number, pairs: Array<{ i: number; j: number }>): boolean {
    return pairs.some(pair => pair.i < pos && pos < pair.j);
  }

  /**
   * Get loop thermodynamic parameters
   */
  private getLoopParameters(struct: {
    type: string;
    size?: number;
    closingPair?: { i: number; j: number };
  }): { dH: number; dS: number } {
    if (struct.type === 'hairpin') {
      const size = struct.size;

      // Special stable tetraloops
      if (size === 4) {
        // Check sequence for GNRA, UNCG, etc.
        return { dH: 2.8, dS: 0.008 }; // Favorable
      }

      // General hairpin parameters
      if (size === 3) return { dH: 5.4, dS: 0.015 };
      if (size === 5) return { dH: 4.0, dS: 0.011 };
      if (size === 6) return { dH: 4.3, dS: 0.012 };

      // Large loops
      return {
        dH: 4.0 + 1.75 * 0.616 * Math.log((size || 10) / 3),
        dS: 0.011 + 0.002 * Math.log((size || 10) / 3)
      };
    }

    return { dH: 4.0, dS: 0.011 }; // Default
  }

  /**
   * Calculate terminal AU/GU penalties
   */
  private getTerminalPenalties(
    pairs: Array<{ i: number; j: number; type: string }>,
    state: RNAMolecule
  ): number {
    let penalty = 0;

    for (const pair of pairs) {
      // Check if terminal
      const isTerminal5 =
        pair.i === 0 || !pairs.some(p => p.i === pair.i - 1 && p.j === pair.j + 1);
      const isTerminal3 =
        pair.j === state.length - 1 || !pairs.some(p => p.i === pair.i + 1 && p.j === pair.j - 1);

      if (
        (isTerminal5 || isTerminal3) &&
        (pair.type === 'AU' || pair.type === 'UA' || pair.type === 'GU' || pair.type === 'UG')
      ) {
        penalty += 0.45;
      }
    }

    return penalty;
  }

  /**
   * Find coaxial stacking between helices
   */
  private findCoaxialStacks(
    structures: Array<{
      type: string;
      size?: number;
      positions?: number[];
      closingPairs?: Array<{ i: number; j: number }>;
    }>
  ): Array<{
    helix1: { start: number; end: number };
    helix2: { start: number; end: number };
    type: 'continuous' | 'discontinuous';
  }> {
    const coaxialStacks: Array<{
      helix1: { start: number; end: number };
      helix2: { start: number; end: number };
      type: 'continuous' | 'discontinuous';
    }> = [];

    // First, identify all helices
    const helices = this.identifyHelices();

    // Check each pair of helices for coaxial stacking
    for (let i = 0; i < helices.length; i++) {
      for (let j = i + 1; j < helices.length; j++) {
        const helix1 = helices[i];
        const helix2 = helices[j];

        // Check for continuous coaxial stacking (helices share a closing base pair)
        if (this.canFormContinuousCoaxial(helix1, helix2)) {
          coaxialStacks.push({
            helix1,
            helix2,
            type: 'continuous'
          });
        }

        // Check for discontinuous coaxial stacking (helices in multi-loop)
        else if (this.canFormDiscontinuousCoaxial(helix1, helix2, structures)) {
          coaxialStacks.push({
            helix1,
            helix2,
            type: 'discontinuous'
          });
        }
      }
    }

    return coaxialStacks;
  }

  /**
   * Identify all helical regions in the structure
   */
  private identifyHelices(): Array<{ start: number; end: number }> {
    const helices: Array<{ start: number; end: number }> = [];
    const pairs = this.extractBasePairs(this.molecule);

    // Sort pairs by first position
    pairs.sort((a, b) => a.i - b.i);

    // Find continuous stacks
    let currentHelix: { start: number; end: number } | null = null;

    for (let k = 0; k < pairs.length; k++) {
      const pair = pairs[k];

      if (currentHelix === null) {
        // Start new helix
        currentHelix = { start: pair.i, end: pair.j };
      } else {
        // Check if this pair extends the current helix
        const prevPair = pairs[k - 1];

        if (pair.i === prevPair.i + 1 && pair.j === prevPair.j - 1) {
          // Extends the helix
          currentHelix.end = pair.j;
        } else {
          // End current helix and start new one
          if (currentHelix.end - currentHelix.start >= 4) {
            // At least 2 base pairs
            helices.push(currentHelix);
          }
          currentHelix = { start: pair.i, end: pair.j };
        }
      }
    }

    // Don't forget the last helix
    if (currentHelix && currentHelix.end - currentHelix.start >= 4) {
      helices.push(currentHelix);
    }

    return helices;
  }

  /**
   * Check if two helices can form continuous coaxial stack
   */
  private canFormContinuousCoaxial(
    helix1: { start: number; end: number },
    helix2: { start: number; end: number }
  ): boolean {
    // Continuous if they share a closing base pair junction
    // Check all four possible orientations

    // Helix1 5' connects to Helix2 5'
    if (Math.abs(helix1.start - helix2.start) <= 2) return true;

    // Helix1 5' connects to Helix2 3'
    if (Math.abs(helix1.start - helix2.end) <= 2) return true;

    // Helix1 3' connects to Helix2 5'
    if (Math.abs(helix1.end - helix2.start) <= 2) return true;

    // Helix1 3' connects to Helix2 3'
    if (Math.abs(helix1.end - helix2.end) <= 2) return true;

    return false;
  }

  /**
   * Check if two helices can form discontinuous coaxial stack
   */
  private canFormDiscontinuousCoaxial(
    helix1: { start: number; end: number },
    helix2: { start: number; end: number },
    structures: Array<{
      type: string;
      size?: number;
      positions?: number[];
      closingPairs?: Array<{ i: number; j: number }>;
    }>
  ): boolean {
    // Discontinuous coaxial stacking occurs in multi-loops
    // Check if both helices open into the same multi-loop

    // Find multi-loops
    const multiLoops = structures.filter(s => s.type === 'junction');

    for (const loop of multiLoops) {
      const positions = new Set(loop.positions || []);

      // Check if both helices border this multi-loop
      const helix1Borders =
        positions.has(helix1.start - 1) ||
        positions.has(helix1.start + 1) ||
        positions.has(helix1.end - 1) ||
        positions.has(helix1.end + 1);

      const helix2Borders =
        positions.has(helix2.start - 1) ||
        positions.has(helix2.start + 1) ||
        positions.has(helix2.end - 1) ||
        positions.has(helix2.end + 1);

      if (helix1Borders && helix2Borders) {
        // Additional geometric check for proper alignment
        return this.checkCoaxialAlignment(helix1, helix2);
      }
    }

    return false;
  }

  /**
   * Check geometric alignment for coaxial stacking
   */
  private checkCoaxialAlignment(
    helix1: { start: number; end: number },
    helix2: { start: number; end: number }
  ): boolean {
    // Check multiple criteria for coaxial alignment

    // 1. Calculate helix vectors (simplified as sequence direction)
    const helix1Vector = {
      start: helix1.start,
      end: helix1.end,
      length: helix1.end - helix1.start + 1,
      midpoint: (helix1.start + helix1.end) / 2
    };

    const helix2Vector = {
      start: helix2.start,
      end: helix2.end,
      length: helix2.end - helix2.start + 1,
      midpoint: (helix2.start + helix2.end) / 2
    };

    // 2. Check gap between helices
    const gaps = [
      Math.abs(helix1.end - helix2.start),
      Math.abs(helix2.end - helix1.start),
      Math.abs(helix1.start - helix2.end),
      Math.abs(helix2.start - helix1.end)
    ];
    const minGap = Math.min(...gaps);

    // Coaxial stacking requires small gap (typically 0-3 nucleotides)
    if (minGap > 3) return false;

    // 3. Check conformational compatibility
    // Get nucleotides at junction points
    const junction1 = this.getJunctionNucleotides(helix1, helix2, minGap);
    const junction2 = this.getJunctionNucleotides(helix2, helix1, minGap);

    // Check if junction conformations support stacking
    const compatible = this.checkStackingCompatibility(junction1, junction2);

    // 5. Apply geometric constraints
    // Coaxial stacking is favored when:
    // - Small gap (0-3 nt)
    // - Compatible junction conformations
    // - Reasonable helix lengths (at least 2 bp each)

    return minGap <= 3 && compatible && helix1Vector.length >= 4 && helix2Vector.length >= 4;
  }

  /**
   * Get nucleotides at helix junction
   */
  private getJunctionNucleotides(
    helix1: { start: number; end: number },
    helix2: { start: number; end: number },
    gap: number
  ): NucleotideState[] {
    const junctionNucleotides: NucleotideState[] = [];

    // Determine which ends are involved in the junction
    if (Math.abs(helix1.end - helix2.start) === gap) {
      // 3' end of helix1 connects to 5' end of helix2
      if (helix1.end < this.molecule.states.length) {
        junctionNucleotides.push(this.molecule.states[helix1.end - 1]);
      }
      if (helix2.start > 1) {
        junctionNucleotides.push(this.molecule.states[helix2.start - 1]);
      }
    } else if (Math.abs(helix1.start - helix2.end) === gap) {
      // 5' end of helix1 connects to 3' end of helix2
      if (helix1.start > 1) {
        junctionNucleotides.push(this.molecule.states[helix1.start - 1]);
      }
      if (helix2.end < this.molecule.states.length) {
        junctionNucleotides.push(this.molecule.states[helix2.end - 1]);
      }
    }

    return junctionNucleotides;
  }

  /**
   * Check if junction conformations support coaxial stacking
   */
  private checkStackingCompatibility(
    junction1: NucleotideState[],
    junction2: NucleotideState[]
  ): boolean {
    if (junction1.length === 0 || junction2.length === 0) return false;

    // Check conformational fields that support stacking
    for (const nt1 of junction1) {
      for (const nt2 of junction2) {
        // Stacking requires:
        // - Appropriate sugar pucker (C3'-endo)
        // - Canonical backbone
        // - Not too much flexibility
        const compatible =
          nt1.fields.e2 &&
          nt2.fields.e2 && // Both C3'-endo
          nt1.fields.e3 &&
          nt2.fields.e3 && // Both canonical backbone
          (nt1.fields.e1 || nt2.fields.e1); // At least one is stacked

        if (compatible) return true;
      }
    }

    return false;
  }

  /**
   * Calculate resonance (abstract stability measure)
   */
  private calculateResonance(state: RNAMolecule): number {
    let resonance = 0;

    // Clifford algebra norm contributions
    for (const nucleotide of state.states) {
      const cliffordElement = this.clifford.fieldsToClifford(nucleotide.fields);
      const norm = this.clifford.normSquared(cliffordElement);
      resonance += Math.sqrt(norm);
    }

    // Normalize by length
    resonance /= state.length;

    // Modulate by homological complexity
    const homologicalComplexity =
      this.homology.H0 + this.homology.H1.length + this.homology.H2.length;

    resonance *= Math.exp(-homologicalComplexity / 10);

    return resonance;
  }

  /**
   * Check if two bases can pair
   */
  private canPair(base1: RNABase, base2: RNABase): boolean {
    const pairs = [
      ['A', 'U'],
      ['U', 'A'],
      ['G', 'C'],
      ['C', 'G'],
      ['G', 'U'],
      ['U', 'G']
    ];

    return pairs.some(([b1, b2]) => base1 === b1 && base2 === b2);
  }

  /**
   * Fold RNA to find optimal conformation
   */
  fold(): RNAMolecule {
    // Initialize with Monte Carlo parameters
    const mcParams = {
      temperature: 310.15, // 37°C in Kelvin
      kT: 0.616, // kcal/mol at 37°C
      steps: 5000, // Total MC steps
      equilibrationSteps: 1000, // Initial equilibration
      sampleInterval: 50, // Sample every N steps
      replicaCount: 4 // Parallel tempering replicas
    };

    // Run parallel tempering Monte Carlo
    const replicas = this.initializeReplicas(mcParams.replicaCount);
    const samples: RNAMolecule[] = [];

    // Equilibration phase
    for (let step = 0; step < mcParams.equilibrationSteps; step++) {
      this.monteCarloStep(replicas, mcParams, step);

      // Attempt replica exchange every 10 steps
      if (step % 10 === 0) {
        this.attemptReplicaExchange(replicas, mcParams);
      }
    }

    // Production phase
    for (let step = 0; step < mcParams.steps; step++) {
      this.monteCarloStep(replicas, mcParams, step + mcParams.equilibrationSteps);

      // Replica exchange
      if (step % 10 === 0) {
        this.attemptReplicaExchange(replicas, mcParams);
      }

      // Sample lowest temperature replica
      if (step % mcParams.sampleInterval === 0) {
        samples.push(this.cloneMolecule(replicas[0].state));
      }
    }

    // Find lowest energy sample
    let bestState = replicas[0].state;
    let bestEnergy = replicas[0].energy;

    for (const sample of samples) {
      const energy = this.landscape.freeEnergy(sample);
      if (energy < bestEnergy) {
        bestState = sample;
        bestEnergy = energy;
      }
    }

    // Update molecule and recompute homology
    this.molecule = bestState;
    this.homology = this.homologyCalculator.computeHomology();

    return bestState;
  }

  /**
   * Initialize replicas for parallel tempering
   */
  private initializeReplicas(count: number): Array<{
    state: RNAMolecule;
    energy: number;
    temperature: number;
    beta: number;
  }> {
    const replicas: Array<{
      state: RNAMolecule;
      energy: number;
      temperature: number;
      beta: number;
    }> = [];

    // Temperature ladder (geometric spacing)
    const Tmin = 310.15; // 37°C
    const Tmax = 373.15; // 100°C
    const ratio = Math.pow(Tmax / Tmin, 1 / (count - 1));

    for (let i = 0; i < count; i++) {
      const T = Tmin * Math.pow(ratio, i);
      const state = this.cloneMolecule(this.molecule);
      const energy = this.landscape.freeEnergy(state);

      replicas.push({
        state,
        energy,
        temperature: T,
        beta: 1 / (0.001987 * T) // 1/kT in kcal/mol
      });
    }

    return replicas;
  }

  /**
   * Perform one Monte Carlo step for all replicas
   */
  private monteCarloStep(
    replicas: Array<{ state: RNAMolecule; energy: number; temperature: number; beta: number }>,
    _params: {
      temperature: number;
      kT: number;
      steps: number;
      equilibrationSteps: number;
      sampleInterval: number;
      replicaCount: number;
    },
    step: number
  ): void {
    for (const replica of replicas) {
      // Choose move type based on step
      const moveType = this.selectMoveType(step);

      // Generate trial move
      let trial: RNAMolecule;
      switch (moveType) {
        case 'local':
          trial = this.generateLocalMove(replica.state);
          break;
        case 'e8':
          trial = this.generateE8Move(replica.state);
          break;
        case 'helix':
          trial = this.generateHelixMove(replica.state);
          break;
        default:
          trial = this.generateLocalMove(replica.state);
      }

      // Calculate energy change
      const trialEnergy = this.landscape.freeEnergy(trial);
      const deltaE = trialEnergy - replica.energy;

      // Metropolis criterion
      if (deltaE < 0 || Math.random() < Math.exp(-deltaE * replica.beta)) {
        replica.state = trial;
        replica.energy = trialEnergy;
      }
    }
  }

  /**
   * Attempt replica exchange between adjacent temperatures
   */
  private attemptReplicaExchange(
    replicas: Array<{ state: RNAMolecule; energy: number; temperature: number; beta: number }>,
    _params: {
      temperature: number;
      kT: number;
      steps: number;
      equilibrationSteps: number;
      sampleInterval: number;
      replicaCount: number;
    }
  ): void {
    // Try to exchange adjacent pairs
    for (let i = 0; i < replicas.length - 1; i++) {
      const r1 = replicas[i];
      const r2 = replicas[i + 1];

      // Exchange probability
      const deltaBeta = r1.beta - r2.beta;
      const deltaE = r2.energy - r1.energy;
      const prob = Math.exp(deltaBeta * deltaE);

      if (Math.random() < prob) {
        // Exchange states
        [r1.state, r2.state] = [r2.state, r1.state];
        [r1.energy, r2.energy] = [r2.energy, r1.energy];
      }
    }
  }

  /**
   * Select move type based on step
   */
  private selectMoveType(step: number): 'local' | 'e8' | 'helix' {
    const phase = step % 100;

    if (phase < 60) return 'local'; // 60% local moves
    if (phase < 90) return 'e8'; // 30% E8 moves
    return 'helix'; // 10% helix moves
  }

  /**
   * Generate local conformational move
   */
  private generateLocalMove(state: RNAMolecule): RNAMolecule {
    const newStates = [...state.states];

    // Select random position
    const pos = Math.floor(Math.random() * newStates.length);
    const nucleotide = newStates[pos];

    // Flip a random field
    const fieldIndex = Math.floor(Math.random() * 8);
    const fieldKey = `e${fieldIndex}` as keyof ConformationalFields;

    const newFields = { ...nucleotide.fields };
    newFields[fieldKey] = !newFields[fieldKey];

    // Update state
    const newClifford = this.clifford.fieldsToClifford(newFields);
    newStates[pos] = {
      ...nucleotide,
      fields: newFields,
      cliffordIndex: newClifford.index
    };

    // Limited propagation
    this.propagateConformation(newStates, pos, 2);

    return {
      ...state,
      states: newStates
    };
  }

  /**
   * Generate helix-based move
   */
  private generateHelixMove(state: RNAMolecule): RNAMolecule {
    const pairs = this.extractBasePairs(state);

    if (pairs.length === 0) {
      // No pairs, try to form one
      return this.tryFormPair(state);
    }

    // Randomly extend or contract a helix
    const pair = pairs[Math.floor(Math.random() * pairs.length)];

    if (Math.random() < 0.5) {
      // Try to extend helix
      return this.tryExtendHelix(state, pair);
    } else {
      // Try to break pair
      return this.tryBreakPair(state, pair);
    }
  }

  /**
   * Try to form a new base pair
   */
  private tryFormPair(state: RNAMolecule): RNAMolecule {
    const newStates = [...state.states];

    // Find unpaired positions
    const unpaired: number[] = [];
    for (let i = 0; i < newStates.length; i++) {
      if (!newStates[i].fields.e0) {
        unpaired.push(i);
      }
    }

    if (unpaired.length < 2) return state;

    // Try random pairs
    for (let attempt = 0; attempt < 10; attempt++) {
      const i = unpaired[Math.floor(Math.random() * unpaired.length)];
      const j = unpaired[Math.floor(Math.random() * unpaired.length)];

      if (Math.abs(i - j) >= 4 && this.canPair(newStates[i].base, newStates[j].base)) {
        // Form pair
        newStates[i].fields = { ...newStates[i].fields, e0: true, e1: true };
        newStates[j].fields = { ...newStates[j].fields, e0: true, e1: true };

        // Update Clifford indices
        newStates[i].cliffordIndex = this.clifford.fieldsToClifford(newStates[i].fields).index;
        newStates[j].cliffordIndex = this.clifford.fieldsToClifford(newStates[j].fields).index;

        return { ...state, states: newStates };
      }
    }

    return state;
  }

  /**
   * Try to extend a helix
   */
  private tryExtendHelix(
    state: RNAMolecule,
    pair: { i: number; j: number; type: string }
  ): RNAMolecule {
    const newStates = [...state.states];

    // Check if we can extend inward
    if (pair.i > 0 && pair.j < state.length - 1) {
      const i = pair.i - 1;
      const j = pair.j + 1;

      if (
        !newStates[i].fields.e0 &&
        !newStates[j].fields.e0 &&
        this.canPair(newStates[i].base, newStates[j].base)
      ) {
        // Extend helix
        newStates[i].fields = { ...newStates[i].fields, e0: true, e1: true };
        newStates[j].fields = { ...newStates[j].fields, e0: true, e1: true };

        // Update Clifford indices
        newStates[i].cliffordIndex = this.clifford.fieldsToClifford(newStates[i].fields).index;
        newStates[j].cliffordIndex = this.clifford.fieldsToClifford(newStates[j].fields).index;

        return { ...state, states: newStates };
      }
    }

    return state;
  }

  /**
   * Try to break a base pair
   */
  private tryBreakPair(
    state: RNAMolecule,
    pair: { i: number; j: number; type: string }
  ): RNAMolecule {
    const newStates = [...state.states];

    // Break the pair
    newStates[pair.i].fields = { ...newStates[pair.i].fields, e0: false, e1: false };
    newStates[pair.j].fields = { ...newStates[pair.j].fields, e0: false, e1: false };

    // Update Clifford indices
    newStates[pair.i].cliffordIndex = this.clifford.fieldsToClifford(
      newStates[pair.i].fields
    ).index;
    newStates[pair.j].cliffordIndex = this.clifford.fieldsToClifford(
      newStates[pair.j].fields
    ).index;

    return { ...state, states: newStates };
  }

  /**
   * Clone an RNA molecule
   */
  private cloneMolecule(molecule: RNAMolecule): RNAMolecule {
    return {
      ...molecule,
      states: molecule.states.map(s => ({
        ...s,
        fields: { ...s.fields }
      })),
      domains: [...molecule.domains]
    };
  }

  /**
   * Generate a move using E8 symmetry
   */
  private generateE8Move(state: RNAMolecule): RNAMolecule {
    const newStates = [...state.states];

    // Select random nucleotide
    const index = Math.floor(Math.random() * newStates.length);
    const nucleotide = newStates[index];

    // Apply random E8 Weyl group element
    const generators = (this.e8 as E8Symmetry).weylGroup;
    const generator = generators[Math.floor(Math.random() * generators.length)];

    const newFields = (this.e8 as E8Symmetry).applyWeylTransformation(nucleotide.fields, generator);

    // Create new state
    const newClifford = this.clifford.fieldsToClifford(newFields);

    newStates[index] = {
      ...nucleotide,
      fields: newFields,
      cliffordIndex: newClifford.index
    };

    // Apply gauge connection to propagate changes
    this.propagateConformation(newStates, index);

    return {
      ...state,
      states: newStates
    };
  }

  /**
   * Propagate conformational changes using gauge connection
   */
  private propagateConformation(
    states: NucleotideState[],
    changedIndex: number,
    radius: number = 5
  ): void {
    for (let dist = 1; dist <= radius; dist++) {
      // Forward propagation
      if (changedIndex + dist < states.length) {
        const newFields = this.gauge.transport(
          states[changedIndex].fields,
          changedIndex + 1,
          changedIndex + dist + 1
        );

        const newClifford = this.clifford.fieldsToClifford(newFields);
        states[changedIndex + dist] = {
          ...states[changedIndex + dist],
          fields: newFields,
          cliffordIndex: newClifford.index
        };
      }

      // Backward propagation
      if (changedIndex - dist >= 0) {
        const newFields = this.gauge.transport(
          states[changedIndex].fields,
          changedIndex + 1,
          changedIndex - dist + 1
        );

        const newClifford = this.clifford.fieldsToClifford(newFields);
        states[changedIndex - dist] = {
          ...states[changedIndex - dist],
          fields: newFields,
          cliffordIndex: newClifford.index
        };
      }
    }
  }

  /**
   * Find folding pathway between two states
   */
  findFoldingPathway(start: RNAMolecule, target: RNAMolecule): FoldingPathway {
    const path: RNAMolecule[] = [start];
    const barriers: number[] = [];

    // Use geodesic in field space
    const steps = 20;

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const interpolated = this.interpolateStates(start, target, t);

      // Find nearest E8-compatible state
      const compatible = this.snapToE8(interpolated);
      path.push(compatible);

      // Calculate barrier
      const energy = this.landscape.freeEnergy(compatible);
      barriers.push(energy);
    }

    // Calculate total path length
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      length += this.stateDistance(path[i - 1], path[i]);
    }

    return {
      start,
      end: target,
      path,
      length,
      barriers
    };
  }

  /**
   * Interpolate between two RNA states
   */
  private interpolateStates(start: RNAMolecule, end: RNAMolecule, t: number): RNAMolecule {
    const states: NucleotideState[] = [];

    for (let i = 0; i < start.states.length; i++) {
      const startFields = start.states[i].fields;
      const endFields = end.states[i].fields;

      // Interpolate in Clifford algebra
      const startClifford = this.clifford.fieldsToClifford(startFields);
      const endClifford = this.clifford.fieldsToClifford(endFields);

      // Linear interpolation of components
      const interpolated = new Map<string, number>();

      for (const [blade, coeff] of startClifford.components) {
        const endCoeff = endClifford.components.get(blade) || 0;
        interpolated.set(blade, (1 - t) * coeff + t * endCoeff);
      }

      for (const [blade, coeff] of endClifford.components) {
        if (!interpolated.has(blade)) {
          interpolated.set(blade, t * coeff);
        }
      }

      // Convert back to fields (threshold at 0.5)
      const fields = this.componentsToFields(interpolated);
      const cliffordElement = this.clifford.fieldsToClifford(fields);

      states.push({
        position: start.states[i].position,
        base: start.states[i].base,
        fields,
        cliffordIndex: cliffordElement.index
      });
    }

    return {
      ...start,
      states
    };
  }

  /**
   * Convert Clifford components to fields
   */
  private componentsToFields(components: Map<string, number>): ConformationalFields {
    const fields: ConformationalFields = {
      e0: false,
      e1: false,
      e2: false,
      e3: false,
      e4: false,
      e5: false,
      e6: false,
      e7: false
    };

    // Check grade-1 components
    for (let i = 0; i < 8; i++) {
      const blade = `e${i}`;
      const coeff = components.get(blade) || 0;
      const fieldKey = blade as keyof ConformationalFields;
      fields[fieldKey] = coeff > 0.5;
    }

    return fields;
  }

  /**
   * Snap state to nearest E8-compatible configuration
   */
  private snapToE8(state: RNAMolecule): RNAMolecule {
    const newStates = state.states.map(nucleotide => {
      const { root } = (this.e8 as E8Symmetry).closestRoot(nucleotide.fields);

      // Convert root to fields
      const fields: ConformationalFields = {
        e0: root[0] > 0,
        e1: root[1] > 0,
        e2: root[2] > 0,
        e3: root[3] > 0,
        e4: root[4] > 0,
        e5: root[5] > 0,
        e6: root[6] > 0,
        e7: root[7] > 0
      };

      const cliffordElement = this.clifford.fieldsToClifford(fields);

      return {
        ...nucleotide,
        fields,
        cliffordIndex: cliffordElement.index
      };
    });

    return {
      ...state,
      states: newStates
    };
  }

  /**
   * Calculate distance between two states
   */
  private stateDistance(state1: RNAMolecule, state2: RNAMolecule): number {
    let distance = 0;

    for (let i = 0; i < state1.states.length; i++) {
      const fields1 = state1.states[i].fields;
      const fields2 = state2.states[i].fields;

      // Hamming distance in field space
      for (let j = 0; j < 8; j++) {
        const key = `e${j}` as keyof ConformationalFields;
        if (fields1[key] !== fields2[key]) {
          distance += 1;
        }
      }
    }

    return distance;
  }

  /**
   * Get symmetry-reduced conformational space
   */
  getSymmetryOrbits(): ConformationalFields[][] {
    const orbits: ConformationalFields[][] = [];
    const processed = new Set<string>();

    // Check all 256 possible states
    for (let i = 0; i < 256; i++) {
      const fields: ConformationalFields = {
        e0: (i & 0b00000001) !== 0,
        e1: (i & 0b00000010) !== 0,
        e2: (i & 0b00000100) !== 0,
        e3: (i & 0b00001000) !== 0,
        e4: (i & 0b00010000) !== 0,
        e5: (i & 0b00100000) !== 0,
        e6: (i & 0b01000000) !== 0,
        e7: (i & 0b10000000) !== 0
      };

      const key = this.fieldsToKey(fields);

      if (!processed.has(key)) {
        // Compute orbit under E8 Weyl group
        const orbit = (this.e8 as E8Symmetry).weylOrbit(fields);

        // Mark all orbit members as processed
        orbit.forEach(f => processed.add(this.fieldsToKey(f)));

        orbits.push(orbit);
      }
    }

    return orbits;
  }

  /**
   * Convert fields to string key
   */
  private fieldsToKey(fields: ConformationalFields): string {
    return Object.values(fields)
      .map(v => (v ? '1' : '0'))
      .join('');
  }
}
