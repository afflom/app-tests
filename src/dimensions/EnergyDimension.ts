/**
 * Energy Dimension - handles thermodynamic calculations
 */

import { 
  RNABase, 
  FoldingResult, 
  EnergyDimension as IEnergyDimension 
} from '../types';
import { ENERGY_PARAMS } from '../constants';

export class EnergyDimension implements IEnergyDimension {
  /**
   * Calculate total free energy of RNA structure
   */
  calculateTotalEnergy(result: FoldingResult): number {
    let totalEnergy = 0;

    // Base pair energies
    for (const pair of result.pairs) {
      const base1 = result.sequence[pair.i] as RNABase;
      const base2 = result.sequence[pair.j] as RNABase;
      totalEnergy += this.pairEnergy(base1, base2, 37);
    }

    // Loop penalties
    totalEnergy += this.calculateLoopPenalties(result.secondary);

    // Stacking energies
    totalEnergy += this.calculateStackingEnergies(result.sequence, result.secondary);

    // Dangling end contributions
    totalEnergy += this.calculateDanglingEnds(result.sequence, result.secondary);

    // Terminal AU/GU penalties
    totalEnergy += this.calculateTerminalPenalties(result.sequence, result.pairs);

    return totalEnergy;
  }

  /**
   * Calculate energy of a base pair
   */
  pairEnergy(base1: RNABase, base2: RNABase, temperature: number): number {
    const pairStrength = this.getPairStrength(base1, base2);
    const kT = ENERGY_PARAMS.kT * (temperature + 273.15) / 310.15; // Adjust for temperature
    return -pairStrength * kT;
  }

  /**
   * Calculate loop energy penalty
   */
  loopEnergy(loopSize: number, loopType: string = 'hairpin'): number {
    if (loopSize < 3 && loopType === 'hairpin') return Infinity;
    
    // Different penalties for different loop types
    switch (loopType) {
      case 'hairpin':
        // Use tabulated values for small loops
        const penalty = ENERGY_PARAMS.loopPenalty[loopSize as keyof typeof ENERGY_PARAMS.loopPenalty];
        if (loopSize <= 10 && penalty !== undefined) {
          return penalty;
        }
        // Jacobson-Stockmayer equation for larger loops
        return 1.75 * ENERGY_PARAMS.kT * Math.log(loopSize / 3);
        
      case 'bulge':
        // Bulge loops are generally less stable
        if (loopSize === 1) return 3.8;
        if (loopSize === 2) return 2.8;
        return 1.7 + 1.5 * ENERGY_PARAMS.kT * Math.log(loopSize);
        
      case 'internal':
        // Internal loops - penalty based on total size
        if (loopSize <= 4) return 4.0;
        if (loopSize <= 6) return 4.5;
        return 1.6 + 1.4 * ENERGY_PARAMS.kT * Math.log(loopSize / 4);
        
      case 'multi':
        // Multi-loops use Turner 2004 parameters
        return ENERGY_PARAMS.multiLoopInit + 
               ENERGY_PARAMS.multiLoopUnpaired * loopSize;
        
      default:
        return 5.0;
    }
  }

  /**
   * Calculate stacking energy for consecutive base pairs
   */
  stackingEnergy(bases: RNABase[]): number {
    if (bases.length !== 4) return 0;
    
    const key = bases[0] + bases[2]; // 5' to 3' on one strand
    return ENERGY_PARAMS.stackingEnergy[key as keyof typeof ENERGY_PARAMS.stackingEnergy] || 0;
  }

  /**
   * Calculate all loop penalties in a structure
   */
  private calculateLoopPenalties(secondary: string): number {
    let totalPenalty = 0;
    const loops = this.findLoops(secondary);
    
    for (const loop of loops) {
      totalPenalty += this.loopEnergy(loop.size, loop.type);
      
      // Add asymmetry penalty for internal loops
      if (loop.type === 'internal' && loop.asymmetry !== undefined) {
        totalPenalty += this.calculateAsymmetryPenalty(
          Math.floor(loop.size / 2) - Math.floor(loop.asymmetry / 2),
          Math.floor(loop.size / 2) + Math.ceil(loop.asymmetry / 2)
        );
      }
    }
    
    return totalPenalty;
  }

  /**
   * Calculate all stacking energies in a structure
   */
  private calculateStackingEnergies(sequence: string, secondary: string): number {
    let totalStacking = 0;
    
    // Find consecutive base pairs
    for (let i = 0; i < sequence.length - 1; i++) {
      if (secondary[i] === '(' && secondary[i + 1] === '(') {
        // Find closing pairs
        let j = this.findClosingPair(secondary, i);
        let k = this.findClosingPair(secondary, i + 1);
        
        if (j > 0 && k > 0 && Math.abs(j - k) === 1) {
          const bases: RNABase[] = [
            sequence[i] as RNABase,
            sequence[j] as RNABase,
            sequence[i + 1] as RNABase,
            sequence[k] as RNABase
          ];
          totalStacking += this.stackingEnergy(bases);
        }
      }
    }
    
    return totalStacking;
  }

  /**
   * Find loops in secondary structure
   */
  private findLoops(secondary: string): Array<{type: string, size: number, asymmetry?: number}> {
    const loops: Array<{type: string, size: number, asymmetry?: number}> = [];
    const pairs = this.extractPairs(secondary);
    
    // Build pair map for faster lookup
    const pairMap = new Map<number, number>();
    pairs.forEach(p => {
      pairMap.set(p.i, p.j);
      pairMap.set(p.j, p.i);
    });
    
    // Find hairpin loops
    for (const pair of pairs) {
      let isHairpin = true;
      for (let k = pair.i + 1; k < pair.j; k++) {
        if (secondary[k] !== '.') {
          isHairpin = false;
          break;
        }
      }
      if (isHairpin) {
        loops.push({
          type: 'hairpin',
          size: pair.j - pair.i - 1
        });
      }
    }
    
    // Find internal loops and bulges
    for (const pair of pairs) {
      // Look for the next pair inside this one
      let nextPairI = -1, nextPairJ = -1;
      for (let k = pair.i + 1; k < pair.j; k++) {
        if (pairMap.has(k)) {
          const partner = pairMap.get(k)!;
          if (partner > k && partner < pair.j) {
            nextPairI = k;
            nextPairJ = partner;
            break;
          }
        }
      }
      
      if (nextPairI !== -1) {
        const size1 = nextPairI - pair.i - 1;
        const size2 = pair.j - nextPairJ - 1;
        
        if (size1 > 0 || size2 > 0) {
          if (size1 === 0 || size2 === 0) {
            // Bulge loop
            loops.push({
              type: 'bulge',
              size: Math.max(size1, size2),
              asymmetry: 0
            });
          } else {
            // Internal loop
            loops.push({
              type: 'internal',
              size: size1 + size2,
              asymmetry: Math.abs(size1 - size2)
            });
          }
        }
      }
    }
    
    // Find multi-loops (junctions with 3+ branches)
    const processed = new Set<number>();
    for (let i = 0; i < secondary.length; i++) {
      if (secondary[i] === '.' && !processed.has(i)) {
        // Count unpaired regions between pairs
        let branches = 0;
        let loopSize = 0;
        let j = i;
        
        // Find the extent of this multi-loop region
        while (j < secondary.length && (secondary[j] === '.' || pairMap.has(j))) {
          if (secondary[j] === '.') {
            loopSize++;
            processed.add(j);
          } else if (secondary[j] === '(') {
            branches++;
            // Skip to closing pair
            j = pairMap.get(j)!;
          }
          j++;
        }
        
        if (branches >= 3 && loopSize > 0) {
          loops.push({
            type: 'multi',
            size: loopSize
          });
        }
      }
    }
    
    return loops;
  }

  /**
   * Extract base pairs from secondary structure
   */
  private extractPairs(secondary: string): Array<{i: number, j: number}> {
    const pairs: Array<{i: number, j: number}> = [];
    const stack: number[] = [];
    
    for (let i = 0; i < secondary.length; i++) {
      if (secondary[i] === '(') {
        stack.push(i);
      } else if (secondary[i] === ')' && stack.length > 0) {
        const j = stack.pop()!;
        pairs.push({ i: j, j: i });
      }
    }
    
    return pairs;
  }

  /**
   * Find the closing pair for an opening parenthesis
   */
  private findClosingPair(secondary: string, openIndex: number): number {
    let count = 1;
    
    for (let i = openIndex + 1; i < secondary.length; i++) {
      if (secondary[i] === '(') count++;
      else if (secondary[i] === ')') {
        count--;
        if (count === 0) return i;
      }
    }
    
    return -1;
  }

  /**
   * Get base pair strength
   */
  private getPairStrength(base1: RNABase, base2: RNABase): number {
    if ((base1 === 'G' && base2 === 'C') || (base1 === 'C' && base2 === 'G')) return 3.0;
    if ((base1 === 'A' && base2 === 'U') || (base1 === 'U' && base2 === 'A')) return 2.0;
    if ((base1 === 'G' && base2 === 'U') || (base1 === 'U' && base2 === 'G')) return 1.0;
    return 0;
  }

  /**
   * Calculate Gibbs free energy change
   */
  deltaG(enthalpy: number, entropy: number, temperature: number): number {
    const T = temperature + 273.15; // Convert to Kelvin
    return enthalpy - T * entropy;
  }

  /**
   * Calculate melting temperature
   */
  meltingTemperature(sequence: string): number {
    const gcCount = (sequence.match(/[GC]/g) || []).length;
    const length = sequence.length;
    
    // Simple formula for short sequences
    if (length < 14) {
      return 2 * (length - gcCount) + 4 * gcCount;
    }
    
    // More complex formula for longer sequences
    return 64.9 + 41 * (gcCount - 16.4) / length;
  }

  /**
   * Calculate dangling end contributions
   */
  private calculateDanglingEnds(sequence: string, secondary: string): number {
    let totalDangling = 0;
    const pairs = this.extractPairs(secondary);
    const pairMap = new Map<number, number>();
    
    pairs.forEach(p => {
      pairMap.set(p.i, p.j);
      pairMap.set(p.j, p.i);
    });
    
    // Check each unpaired base for dangling end contributions
    for (let i = 0; i < sequence.length; i++) {
      if (secondary[i] === '.') {
        // Check if it's a 5' dangling end (next to opening pair)
        if (i > 0 && secondary[i - 1] === '(') {
          const pairBase1 = sequence[i - 1] as RNABase;
          const pairBase2 = sequence[pairMap.get(i - 1)!] as RNABase;
          const danglingBase = sequence[i] as RNABase;
          const pairType = this.getPairType(pairBase1, pairBase2);
          
          if (pairType && (ENERGY_PARAMS.danglingEnd5 as any)[danglingBase]?.[pairType]) {
            totalDangling += (ENERGY_PARAMS.danglingEnd5 as any)[danglingBase][pairType];
          }
        }
        
        // Check if it's a 3' dangling end (next to closing pair)
        if (i < sequence.length - 1 && secondary[i + 1] === ')') {
          const pairBase2 = sequence[i + 1] as RNABase;
          const pairBase1 = sequence[pairMap.get(i + 1)!] as RNABase;
          const danglingBase = sequence[i] as RNABase;
          const pairType = this.getPairType(pairBase1, pairBase2);
          
          if (pairType && (ENERGY_PARAMS.danglingEnd3 as any)[danglingBase]?.[pairType]) {
            totalDangling += (ENERGY_PARAMS.danglingEnd3 as any)[danglingBase][pairType];
          }
        }
      }
    }
    
    return totalDangling;
  }

  /**
   * Calculate terminal AU/GU penalties
   */
  private calculateTerminalPenalties(sequence: string, pairs: BasePair[]): number {
    let penalty = 0;
    
    // Find terminal pairs (at ends of helices)
    const terminalPairs = new Set<number>();
    
    for (const pair of pairs) {
      // Check if it's a terminal pair (no adjacent pairs)
      const isTerminal5 = pair.i === 0 || !pairs.some(p => p.i === pair.i - 1 && p.j === pair.j + 1);
      const isTerminal3 = pair.j === sequence.length - 1 || !pairs.some(p => p.i === pair.i + 1 && p.j === pair.j - 1);
      
      if (isTerminal5 || isTerminal3) {
        const base1 = sequence[pair.i] as RNABase;
        const base2 = sequence[pair.j] as RNABase;
        
        // Apply penalty for terminal AU or GU pairs
        if ((base1 === 'A' && base2 === 'U') || (base1 === 'U' && base2 === 'A') ||
            (base1 === 'G' && base2 === 'U') || (base1 === 'U' && base2 === 'G')) {
          penalty += ENERGY_PARAMS.terminalAUGUPenalty;
        }
      }
    }
    
    return penalty;
  }

  /**
   * Get pair type for dangling end calculations
   */
  private getPairType(base1: RNABase, base2: RNABase): string | null {
    if ((base1 === 'A' && base2 === 'U') || (base1 === 'U' && base2 === 'A')) return 'AU';
    if ((base1 === 'G' && base2 === 'C') || (base1 === 'C' && base2 === 'G')) return 'GC';
    if ((base1 === 'G' && base2 === 'U') || (base1 === 'U' && base2 === 'G')) return 'GU';
    return null;
  }

  /**
   * Calculate internal loop asymmetry penalty
   */
  private calculateAsymmetryPenalty(size1: number, size2: number): number {
    const asymmetry = Math.abs(size1 - size2);
    if (asymmetry === 0) return 0;
    
    const penalty = Math.min(
      ENERGY_PARAMS.asymmetryPenalty * asymmetry,
      ENERGY_PARAMS.asymmetryPenalty * ENERGY_PARAMS.maxAsymmetry
    );
    
    return penalty;
  }
}