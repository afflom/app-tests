/**
 * Orbifold Domain Structure Implementation
 *
 * RNA domains as 48-nucleotide pages with orbifold singularities
 * at domain boundaries representing flexible hinges and junctions.
 */

import { Domain, Orbifold, ConformationalFields } from './types';

/**
 * Page size - typical domain length
 */
const PAGE_SIZE = 48;

/**
 * Orbifold structure for RNA domains
 */
export class RNAOrbifold implements Orbifold {
  singularities: number[];
  resolution: 'blowup' | 'smooth' | 'stacky';
  localGroup: string;
  domains: Domain[];

  private sequence: string;

  constructor(sequence: string) {
    this.sequence = sequence;
    this.domains = this.identifyDomains();
    this.singularities = this.findSingularities();
    this.resolution = 'smooth'; // Default resolution strategy
    this.localGroup = 'Z/' + PAGE_SIZE + 'Z'; // Cyclic group of order 48
  }

  /**
   * Identify structural domains based on page structure
   */
  private identifyDomains(): Domain[] {
    const domains: Domain[] = [];
    const length = this.sequence.length;

    let start = 1;
    let pageNumber = 1;

    while (start <= length) {
      const end = Math.min(start + PAGE_SIZE - 1, length);
      const isLastDomain = end === length;
      const isFullPage = end - start + 1 === PAGE_SIZE;

      domains.push({
        start,
        end,
        pageNumber,
        boundaryType: (!isLastDomain && isFullPage) ? 'singular' : 'smooth'
      });

      start = end + 1;
      pageNumber++;
    }

    return domains;
  }

  /**
   * Find orbifold singularities (domain boundaries)
   */
  private findSingularities(): number[] {
    const singularities: number[] = [];

    // Add boundaries between domains
    for (let i = 0; i < this.domains.length - 1; i++) {
      singularities.push(this.domains[i].end);
    }

    // Add special singularities based on sequence patterns
    this.findFlexibleRegions().forEach(pos => {
      if (!singularities.includes(pos)) {
        singularities.push(pos);
      }
    });

    return singularities.sort((a, b) => a - b);
  }

  /**
   * Find flexible regions that act as hinges
   */
  private findFlexibleRegions(): number[] {
    const flexible: number[] = [];

    // Look for poly-U or poly-A regions (flexible)
    const flexiblePattern = /[AU]{4,}/g;
    let match;

    while ((match = flexiblePattern.exec(this.sequence)) !== null) {
      const center = match.index + Math.floor(match[0].length / 2) + 1;
      flexible.push(center);
    }

    // Look for GNRA tetraloops (sharp turns)
    const tetraloopPattern = /G[AUGC]RA/g;

    while ((match = tetraloopPattern.exec(this.sequence)) !== null) {
      const center = match.index + 2 + 1; // Center of tetraloop
      flexible.push(center);
    }

    return flexible;
  }

  /**
   * Get the domain containing a position
   */
  getDomain(position: number): Domain | undefined {
    return this.domains.find(d => position >= d.start && position <= d.end);
  }

  /**
   * Check if a position is at a singularity
   */
  isSingularity(position: number): boolean {
    return this.singularities.includes(position);
  }

  /**
   * Get the local isotropy group at a position
   */
  getLocalGroup(position: number): string {
    if (this.isSingularity(position)) {
      // Singularities have non-trivial isotropy
      const domain = this.getDomain(position);
      if (domain && domain.boundaryType === 'singular') {
        // At domain boundaries, we have dihedral symmetry
        return 'D_4'; // Dihedral group of order 8
      }
    }

    // Regular points have trivial isotropy
    return '{e}';
  }

  /**
   * Resolve singularity by blow-up
   */
  blowUpSingularity(position: number): {
    exceptionalDivisor: number[];
    localChart: Map<number, ConformationalFields[]>;
  } {
    if (!this.isSingularity(position)) {
      throw new Error(`Position ${position} is not a singularity`);
    }

    // Create exceptional divisor (small neighborhood)
    const radius = 3;
    const exceptionalDivisor: number[] = [];

    for (let i = position - radius; i <= position + radius; i++) {
      if (i >= 1 && i <= this.sequence.length) {
        exceptionalDivisor.push(i);
      }
    }

    // Create local chart with multiple possible states
    const localChart = new Map<number, ConformationalFields[]>();

    for (const pos of exceptionalDivisor) {
      // At singularities, multiple conformations are possible
      const states = this.generateLocalStates(pos, position);
      localChart.set(pos, states);
    }

    return { exceptionalDivisor, localChart };
  }

  /**
   * Generate possible conformational states near a singularity
   */
  private generateLocalStates(position: number, singularityPos: number): ConformationalFields[] {
    const states: ConformationalFields[] = [];
    const distance = Math.abs(position - singularityPos);

    // Near singularities, backbone is flexible
    const flexibleBackbone = distance <= 1;

    // Generate representative states
    if (flexibleBackbone) {
      // Multiple backbone conformations possible
      states.push({
        e0: false,
        e1: false,
        e2: false,
        e3: false, // Unpaired, flexible
        e4: false,
        e5: true,
        e6: true,
        e7: false // Exposed
      });

      states.push({
        e0: false,
        e1: false,
        e2: true,
        e3: false, // C3'-endo but unpaired
        e4: false,
        e5: true,
        e6: true,
        e7: false
      });

      states.push({
        e0: false,
        e1: false,
        e2: false,
        e3: true, // Non-canonical backbone
        e4: false,
        e5: true,
        e6: true,
        e7: false
      });
    } else {
      // More constrained away from singularity
      states.push({
        e0: true,
        e1: true,
        e2: true,
        e3: true, // Stable helix
        e4: false,
        e5: false,
        e6: false,
        e7: false
      });
    }

    return states;
  }

  /**
   * Smooth resolution of singularities
   */
  smoothSingularities(): Map<number, (t: number) => ConformationalFields> {
    const smoothing = new Map<number, (t: number) => ConformationalFields>();

    for (const sing of this.singularities) {
      // Create smooth interpolation function
      smoothing.set(sing, (t: number) => {
        // t ∈ [0, 1] interpolation parameter
        const angle = t * Math.PI;

        return {
          e0: false, // Unpaired at hinge
          e1: Math.cos(angle) > 0, // Stacking varies
          e2: Math.sin(angle) > 0.5, // Sugar pucker transitions
          e3: Math.abs(Math.cos(2 * angle)) < 0.5, // Backbone flexible
          e4: false, // No tertiary at hinge
          e5: true, // Exposed
          e6: true, // Exposed
          e7: false // No ion coordination
        };
      });
    }

    return smoothing;
  }

  /**
   * Calculate orbifold Euler characteristic
   */
  eulerCharacteristic(): number {
    // χ(M/G) = χ(M)/|G| + correction for singular points
    const baseEuler = 1; // Linear chain has Euler characteristic 1
    const groupOrder = PAGE_SIZE;

    // Correction for singularities
    let singularityCorrection = 0;

    for (const sing of this.singularities) {
      const localGroupOrder = this.getLocalGroupOrder(sing);
      singularityCorrection += (1 - 1 / localGroupOrder) / groupOrder;
    }

    return baseEuler / groupOrder + singularityCorrection;
  }

  /**
   * Get order of local group
   */
  private getLocalGroupOrder(position: number): number {
    const group = this.getLocalGroup(position);

    switch (group) {
      case '{e}':
        return 1;
      case 'D_4':
        return 8;
      default:
        return parseInt(group.match(/\d+/)?.[0] || '1');
    }
  }

  /**
   * Find connecting paths between domains
   */
  findDomainConnections(): Array<{
    from: Domain;
    to: Domain;
    hinge: number;
    flexibility: number;
  }> {
    const connections: Array<{
      from: Domain;
      to: Domain;
      hinge: number;
      flexibility: number;
    }> = [];

    for (let i = 0; i < this.domains.length - 1; i++) {
      const from = this.domains[i];
      const to = this.domains[i + 1];
      const hinge = from.end;

      // Calculate flexibility based on local sequence
      const flexibility = this.calculateFlexibility(hinge);

      connections.push({ from, to, hinge, flexibility });
    }

    return connections;
  }

  /**
   * Calculate flexibility score at a position
   */
  private calculateFlexibility(position: number): number {
    let flexibility = 0;

    // Check local sequence context
    const window = 3;
    const start = Math.max(0, position - window - 1);
    const end = Math.min(this.sequence.length - 1, position + window - 1);

    const localSeq = this.sequence.substring(start, end + 1);

    // High flexibility for U/A rich regions
    const uaCount = (localSeq.match(/[UA]/g) || []).length;
    flexibility += uaCount / localSeq.length;

    // Low flexibility for G/C rich regions
    const gcCount = (localSeq.match(/[GC]/g) || []).length;
    flexibility -= gcCount / (2 * localSeq.length);

    // Bonus for known flexible motifs
    if (localSeq.includes('UUUU')) flexibility += 0.3;
    if (localSeq.includes('AAAA')) flexibility += 0.3;
    if (/G[AUGC]RA/.test(localSeq)) flexibility += 0.2; // GNRA tetraloop

    return Math.max(0, Math.min(1, flexibility));
  }

  /**
   * Get orbifold fundamental group
   */
  getFundamentalGroup(): string {
    // π₁(M/G) depends on the singularities and their local groups

    if (this.singularities.length === 0) {
      // No singularities: cyclic group
      return `Z/${PAGE_SIZE}Z`;
    }

    // With singularities, we get a more complex group
    // This is a simplified representation
    const generators = this.singularities.length + 1;
    const relations = this.singularities.map(s => this.getLocalGroupOrder(s)).join(',');

    return `<a_1,...,a_${generators} | orders: ${relations}>`;
  }

  /**
   * Check if two positions are in the same orbit
   */
  inSameOrbit(pos1: number, pos2: number): boolean {
    const domain1 = this.getDomain(pos1);
    const domain2 = this.getDomain(pos2);

    if (!domain1 || !domain2) return false;

    // Same domain and congruent modulo page size
    return (
      domain1.pageNumber === domain2.pageNumber && pos1 - domain1.start === pos2 - domain2.start
    );
  }

  /**
   * Get representative of equivalence class
   */
  getOrbitRepresentative(position: number): number {
    const domain = this.getDomain(position);
    if (!domain) return position;

    // Representative is the first position in the domain with same offset
    const offset = position - domain.start;
    return 1 + offset; // First domain starts at 1
  }
}
